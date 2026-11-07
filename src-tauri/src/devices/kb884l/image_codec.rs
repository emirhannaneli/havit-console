use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::{imageops::FilterType, AnimationDecoder, DynamicImage, ImageFormat, RgbaImage};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, Cursor};

pub const LCD_WIDTH: u32 = 160;
pub const LCD_HEIGHT: u32 = 96;
pub const MAX_LCD_FRAMES: usize = 255;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LcdFramePreview {
    pub index: usize,
    pub delay_ms: u16,
    pub data_url: String,
    pub rgb565_be_base64: String,
}

#[derive(Debug, Clone)]
pub struct EncodedLcdFrame {
    pub delay_ms: u16,
    pub rgba: RgbaImage,
}

pub fn rgba_to_rgb565_bytes(img: &RgbaImage, big_endian: bool) -> Vec<u8> {
    let mut out = Vec::with_capacity((LCD_WIDTH * LCD_HEIGHT * 2) as usize);
    for y in 0..LCD_HEIGHT {
        for x in 0..LCD_WIDTH {
            let p = img.get_pixel(x, y).0;
            // Composite alpha over black
            let a = p[3] as u32;
            let r = ((p[0] as u32 * a) / 255) as u16;
            let g = ((p[1] as u32 * a) / 255) as u16;
            let b = ((p[2] as u32 * a) / 255) as u16;
            let rgb565: u16 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
            if big_endian {
                out.extend_from_slice(&rgb565.to_be_bytes());
            } else {
                out.extend_from_slice(&rgb565.to_le_bytes());
            }
        }
    }
    out
}

fn fit_to_lcd(img: DynamicImage) -> RgbaImage {
    img.resize_to_fill(LCD_WIDTH, LCD_HEIGHT, FilterType::Lanczos3)
        .to_rgba8()
}

pub fn load_media_frames(path: &str) -> Result<Vec<EncodedLcdFrame>, String> {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".gif") {
        let file = File::open(path).map_err(|e| format!("Failed to open GIF: {e}"))?;
        let decoder = image::codecs::gif::GifDecoder::new(BufReader::new(file))
            .map_err(|e| format!("Invalid GIF file: {e}"))?;
        let raw_frames = decoder
            .into_frames()
            .collect_frames()
            .map_err(|e| format!("Failed to decode GIF frames: {e}"))?;

        let mut frames = Vec::new();
        for f in raw_frames.into_iter().take(MAX_LCD_FRAMES) {
            let (num, denom) = f.delay().numer_denom_ms();
            let ms = if denom == 0 { 100 } else { num / denom };
            let delay_ms = ms.clamp(30, 500) as u16;
            let dyn_img = DynamicImage::ImageRgba8(f.into_buffer());
            frames.push(EncodedLcdFrame {
                delay_ms,
                rgba: fit_to_lcd(dyn_img),
            });
        }
        if frames.is_empty() {
            return Err("GIF contains 0 frames".to_string());
        }
        Ok(frames)
    } else {
        let img = image::open(path).map_err(|e| format!("Failed to open image: {e}"))?;
        Ok(vec![EncodedLcdFrame {
            delay_ms: 100,
            rgba: fit_to_lcd(img),
        }])
    }
}

pub fn frames_to_previews(frames: &[EncodedLcdFrame]) -> Result<Vec<LcdFramePreview>, String> {
    let mut out = Vec::with_capacity(frames.len());
    for (idx, frame) in frames.iter().enumerate() {
        let mut png_bytes = Vec::new();
        DynamicImage::ImageRgba8(frame.rgba.clone())
            .write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
            .map_err(|e| format!("PNG encode failed: {e}"))?;
        let data_url = format!("data:image/png;base64,{}", BASE64.encode(&png_bytes));
        let rgb565 = rgba_to_rgb565_bytes(&frame.rgba, true);
        out.push(LcdFramePreview {
            index: idx,
            delay_ms: frame.delay_ms,
            data_url,
            rgb565_be_base64: BASE64.encode(&rgb565),
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    #[test]
    fn test_rgb565_exact_byte_size() {
        let mut img = RgbaImage::new(LCD_WIDTH, LCD_HEIGHT);
        for x in 0..LCD_WIDTH {
            for y in 0..LCD_HEIGHT {
                img.put_pixel(x, y, Rgba([255, 0, 0, 255]));
            }
        }
        let bytes = rgba_to_rgb565_bytes(&img, true);
        assert_eq!(bytes.len(), 30720, "160x96 RGB565 must be exactly 30,720 bytes");
        // Pure red in RGB565 is 0xF800 (11111 000000 00000)
        assert_eq!(bytes[0], 0xF8);
        assert_eq!(bytes[1], 0x00);
    }
}
