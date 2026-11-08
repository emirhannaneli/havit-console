use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::{imageops, imageops::FilterType, AnimationDecoder, DynamicImage, ImageFormat, Rgba, RgbaImage};
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
    /// Already scaled to 160×96 and quantized to what the RGB565 panel can show.
    pub rgba: RgbaImage,
}

/// How a source image is placed on the 160×96 (5:3) screen.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LcdFit {
    /// Whole image visible, black bars where the aspect ratio differs.
    #[default]
    Fit,
    /// Fill the screen, cropping the overflow.
    Fill,
    /// Fill the screen, distorting the aspect ratio.
    Stretch,
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

/// 4×4 Bayer matrix, values 0..15.
const BAYER4: [[u8; 4]; 4] = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/// Reduces a channel to `bits` with ordered dithering and expands it back to 8 bits.
/// Ordered (not error-diffusion) dithering keeps the pattern fixed per pixel, so animations
/// don't shimmer between frames.
fn dither_channel(v: u8, bits: u32, threshold: u8) -> u8 {
    let levels = (1u32 << bits) - 1;
    let step = 255.0 / levels as f32;
    let offset = (threshold as f32 + 0.5) / 16.0 - 0.5;
    let q = ((v as f32 / step) + offset).round().clamp(0.0, levels as f32) as u32;
    // Bit replication so `>> (8 - bits)` recovers `q` exactly when encoding.
    ((q << (8 - bits)) | (q >> (2 * bits - 8))) as u8
}

/// Composites over black and quantizes to RGB565 so the preview matches the panel.
fn quantize_for_panel(img: &mut RgbaImage) {
    for (x, y, px) in img.enumerate_pixels_mut() {
        let t = BAYER4[(y % 4) as usize][(x % 4) as usize];
        let [r, g, b, a] = px.0;
        let over_black = |c: u8| ((c as u32 * a as u32) / 255) as u8;
        *px = Rgba([
            dither_channel(over_black(r), 5, t),
            dither_channel(over_black(g), 6, t),
            dither_channel(over_black(b), 5, t),
            255,
        ]);
    }
}

fn fit_to_lcd(img: DynamicImage, fit: LcdFit) -> RgbaImage {
    let (w, h) = (img.width(), img.height());
    // Lanczos for downscaling; for small sources (pixel art) scaled up by 2× or more,
    // nearest-neighbour keeps edges sharp instead of smearing them.
    let filter = if w * 2 <= LCD_WIDTH && h * 2 <= LCD_HEIGHT {
        FilterType::Nearest
    } else {
        FilterType::Lanczos3
    };
    let mut out = match fit {
        LcdFit::Fill => img.resize_to_fill(LCD_WIDTH, LCD_HEIGHT, filter).to_rgba8(),
        LcdFit::Stretch => img.resize_exact(LCD_WIDTH, LCD_HEIGHT, filter).to_rgba8(),
        LcdFit::Fit => {
            let scaled = img.resize(LCD_WIDTH, LCD_HEIGHT, filter).to_rgba8();
            let mut canvas = RgbaImage::from_pixel(LCD_WIDTH, LCD_HEIGHT, Rgba([0, 0, 0, 255]));
            let x = (LCD_WIDTH - scaled.width()) / 2;
            let y = (LCD_HEIGHT - scaled.height()) / 2;
            imageops::overlay(&mut canvas, &scaled, x as i64, y as i64);
            canvas
        }
    };
    quantize_for_panel(&mut out);
    out
}

pub fn load_media_frames(path: &str, fit: LcdFit) -> Result<Vec<EncodedLcdFrame>, String> {
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
            // The header stores delay/2 in one byte, so 2..510 ms is representable.
            let delay_ms = ms.clamp(20, 510) as u16;
            let dyn_img = DynamicImage::ImageRgba8(f.into_buffer());
            frames.push(EncodedLcdFrame {
                delay_ms,
                rgba: fit_to_lcd(dyn_img, fit),
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
            rgba: fit_to_lcd(img, fit),
        }])
    }
}

pub fn frame_to_png(rgba: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut png_bytes = Vec::new();
    DynamicImage::ImageRgba8(rgba.clone())
        .write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {e}"))?;
    Ok(png_bytes)
}

pub fn frames_to_previews(frames: &[EncodedLcdFrame]) -> Result<Vec<LcdFramePreview>, String> {
    let mut out = Vec::with_capacity(frames.len());
    for (idx, frame) in frames.iter().enumerate() {
        let png_bytes = frame_to_png(&frame.rgba)?;
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

    #[test]
    fn dithered_values_round_trip_through_rgb565() {
        // Every quantized value must survive the >>3 / >>2 truncation unchanged.
        for v in 0..=255u8 {
            for t in 0..16u8 {
                let r = dither_channel(v, 5, t);
                assert_eq!(((r >> 3) << 3) | (r >> 5), r);
                let g = dither_channel(v, 6, t);
                assert_eq!(((g >> 2) << 2) | (g >> 6), g);
            }
        }
        // Pure colors stay pure.
        assert_eq!(dither_channel(255, 5, 15), 255);
        assert_eq!(dither_channel(0, 5, 0), 0);
    }

    #[test]
    fn fit_letterboxes_wide_images() {
        let wide = DynamicImage::ImageRgba8(RgbaImage::from_pixel(320, 96, Rgba([255, 255, 255, 255])));
        let out = fit_to_lcd(wide, LcdFit::Fit);
        assert_eq!(out.dimensions(), (LCD_WIDTH, LCD_HEIGHT));
        assert_eq!(out.get_pixel(80, 0).0, [0, 0, 0, 255], "top bar is black");
        assert_eq!(out.get_pixel(80, 48).0, [255, 255, 255, 255], "content is centered");
    }
}
