use crate::devices::kb884l::image_codec::{load_media_frames, rgba_to_rgb565_bytes};
use crate::packet_log::record_packet;
use crate::transport::hid::{open_hid_by_usage, send_feature, write_output};
use chrono::{Datelike, Local, Timelike};
use serde::{Deserialize, Serialize};
use std::thread::sleep;
use std::time::Duration;

const VID: u16 = 0x05AC;
const PID: u16 = 0x024F;
const USAGE_PAGE_CTRL: u16 = 0xFF13;
const USAGE_PAGE_LCD: u16 = 0xFF68;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Kb884lLightingConfig {
    pub mode: u8,        // 0..21 (Static, Breath, Spectrum, Wave, Ripple, etc.)
    pub brightness: u8,  // 1..5
    pub speed: u8,       // 1..5
    pub direction: u8,   // 0: Left, 1: Right, 2: Top, 3: Bottom
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Kb884lSettingsConfig {
    pub sleep_minutes: u8, // 0 (Never), 1, 5, 30
    pub debounce_ms: u8,   // 1, 2, 8
    pub win_lock: bool,
    pub fn_toggle: bool,
}

pub fn sync_keyboard_time(slot_id: u8) -> Result<String, String> {
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;
    let now = Local::now();
    let year_val = (now.year() % 2000) as u8;
    let month_val = now.month() as u8;
    let day_val = now.day() as u8;
    let hour_val = now.hour() as u8;
    let minute_val = now.minute() as u8;
    let second_val = now.second() as u8;

    // 1. Transaction Start (0x1804)
    let mut p1 = [0u8; 65];
    p1[0] = 0x00;
    p1[1] = 0x04;
    p1[2] = 0x18;
    send_feature(&dev, "kb884l", "0xFF13", "Transaction Start (0x1804)", &p1)?;
    sleep(Duration::from_millis(10));

    // 2. Select Clock Bank (0x2804)
    let mut p2 = [0u8; 65];
    p2[0] = 0x00;
    p2[1] = 0x04;
    p2[2] = 0x28;
    p2[9] = 0x01; // Slot flag
    send_feature(&dev, "kb884l", "0xFF13", "Select Clock Bank (0x2804)", &p2)?;
    sleep(Duration::from_millis(10));

    // 3. Time Payload
    let mut p3 = [0u8; 65];
    p3[0] = 0x00;
    p3[1] = 0x04;
    p3[2] = slot_id + 1;
    p3[3] = 0x5A;
    p3[4] = year_val;
    p3[5] = month_val;
    p3[6] = day_val;
    p3[7] = hour_val;
    p3[8] = minute_val;
    p3[9] = second_val;
    // Magic trailer at offset 63..64
    p3[63] = 0x55;
    p3[64] = 0xAA;
    send_feature(&dev, "kb884l", "0xFF13", &format!("Clock Sync {hour_val:02}:{minute_val:02}:{second_val:02}"), &p3)?;
    sleep(Duration::from_millis(10));

    // 4. Commit (0x0204)
    let mut p4 = [0u8; 65];
    p4[0] = 0x00;
    p4[1] = 0x04;
    p4[2] = 0x02;
    send_feature(&dev, "kb884l", "0xFF13", "Commit (0x0204)", &p4)?;

    record_packet("kb884l", "INFO", "0xFF13", format!("Time synchronized to {now}"), &[]);
    Ok(format!("Zaman başarıyla senkronize edildi: {:02}:{:02}:{:02}", hour_val, minute_val, second_val))
}

pub fn apply_lighting(cfg: &Kb884lLightingConfig) -> Result<String, String> {
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;

    // 1. Transaction Start (0x1804)
    let mut p1 = [0u8; 65];
    p1[1] = 0x04;
    p1[2] = 0x18;
    send_feature(&dev, "kb884l", "0xFF13", "Transaction Start (0x1804)", &p1)?;
    sleep(Duration::from_millis(10));

    // 2. Select Lighting Bank (0x1304)
    let mut p2 = [0u8; 65];
    p2[1] = 0x04;
    p2[2] = 0x13;
    p2[9] = 0x01;
    send_feature(&dev, "kb884l", "0xFF13", "Select Lighting Bank (0x1304)", &p2)?;
    sleep(Duration::from_millis(10));

    // 3. Lighting Payload
    let mut p3 = [0u8; 65];
    p3[1] = 0x04;
    p3[2] = cfg.mode;
    p3[3] = cfg.brightness.clamp(1, 5);
    p3[4] = cfg.speed.clamp(1, 5);
    p3[5] = cfg.direction.clamp(0, 3);
    p3[6] = cfg.r;
    p3[7] = cfg.g;
    p3[8] = cfg.b;
    p3[63] = 0x55;
    p3[64] = 0xAA;
    send_feature(&dev, "kb884l", "0xFF13", &format!("Lighting Mode {} (B={}, S={})", cfg.mode, cfg.brightness, cfg.speed), &p3)?;
    sleep(Duration::from_millis(10));

    // 4. Commit (0x0204)
    let mut p4 = [0u8; 65];
    p4[1] = 0x04;
    p4[2] = 0x02;
    send_feature(&dev, "kb884l", "0xFF13", "Commit (0x0204)", &p4)?;
    sleep(Duration::from_millis(10));

    // 5. Flash Save (0xF004)
    let mut p5 = [0u8; 65];
    p5[1] = 0x04;
    p5[2] = 0xF0;
    send_feature(&dev, "kb884l", "0xFF13", "Flash NVRAM Save (0xF004)", &p5)?;

    Ok("Aydınlatma profili klavyeye uygulandı ve kaydedildi.".to_string())
}

pub fn apply_settings(cfg: &Kb884lSettingsConfig) -> Result<String, String> {
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;

    // 1. Transaction Start (0x1804)
    let mut p1 = [0u8; 65];
    p1[1] = 0x04;
    p1[2] = 0x18;
    send_feature(&dev, "kb884l", "0xFF13", "Transaction Start (0x1804)", &p1)?;
    sleep(Duration::from_millis(10));

    // 2. Select Settings Bank (0x1704)
    let mut p2 = [0u8; 65];
    p2[1] = 0x04;
    p2[2] = 0x17;
    p2[9] = 0x01;
    send_feature(&dev, "kb884l", "0xFF13", "Select Settings Bank (0x1704)", &p2)?;
    sleep(Duration::from_millis(10));

    // 3. Settings Payload
    let mut p3 = [0u8; 65];
    p3[1] = 0x04;
    p3[2] = if cfg.win_lock { 1 } else { 0 };
    p3[3] = if cfg.fn_toggle { 1 } else { 0 };
    p3[4] = cfg.sleep_minutes;
    p3[5] = cfg.debounce_ms;
    p3[63] = 0x55;
    p3[64] = 0xAA;
    send_feature(&dev, "kb884l", "0xFF13", &format!("Settings Sleep={}m, Debounce={}ms", cfg.sleep_minutes, cfg.debounce_ms), &p3)?;
    sleep(Duration::from_millis(10));

    // 4. Commit (0x0204)
    let mut p4 = [0u8; 65];
    p4[1] = 0x04;
    p4[2] = 0x02;
    send_feature(&dev, "kb884l", "0xFF13", "Commit (0x0204)", &p4)?;

    Ok("Klavye donanım ayarları başarıyla güncellendi.".to_string())
}

pub fn upload_lcd_animation(file_path: &str, slot_id: u8) -> Result<String, String> {
    let frames = load_media_frames(file_path)?;
    let frame_count = frames.len().min(255);
    if frame_count == 0 {
        return Err("GIF veya görselde geçerli kare bulunamadı".to_string());
    }

    // 1. Build 256-byte header
    let mut header = [0xFFu8; 256];
    header[0] = frame_count as u8;
    for (i, f) in frames.iter().take(frame_count).enumerate() {
        // Delay byte in units (delay_ms / 2, min 1)
        header[1 + i] = (f.delay_ms / 2).max(1) as u8;
    }

    // 2. Assemble entire transmission buffer: [256-byte header] + [N * 30720 bytes RGB565]
    let total_payload_size = 256 + frame_count * 30720;
    let mut raw_stream = Vec::with_capacity(total_payload_size);
    raw_stream.extend_from_slice(&header);

    for f in frames.iter().take(frame_count) {
        let rgb565_be = rgba_to_rgb565_bytes(&f.rgba, true);
        raw_stream.extend_from_slice(&rgb565_be);
    }

    // 3. Compute 4KB chunks
    let chunk_size = 4096;
    let total_chunks = ((raw_stream.len() + chunk_size - 1) / chunk_size) as u16;

    // 4. Start Transaction on 0xFF13
    let ctrl_dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;

    let mut p_start = [0u8; 65];
    p_start[1] = 0x04;
    p_start[2] = 0x18;
    send_feature(&ctrl_dev, "kb884l", "0xFF13", "LCD Transfer Start (0x1804)", &p_start)?;
    sleep(Duration::from_millis(15));

    // 5. Allocation Header (0x7204)
    let mut p_alloc = [0u8; 65];
    p_alloc[1] = 0x04;
    p_alloc[2] = 0x72;
    p_alloc[3] = slot_id + 1;
    p_alloc[9] = (total_chunks & 0xFF) as u8;
    p_alloc[10] = ((total_chunks >> 8) & 0xFF) as u8;
    send_feature(&ctrl_dev, "kb884l", "0xFF13", &format!("LCD Allocation (Chunks={total_chunks}, Frames={frame_count})"), &p_alloc)?;
    sleep(Duration::from_millis(20));

    // 6. Open High-Speed LCD Bulk Channel (UsagePage 0xFF68)
    let lcd_dev = open_hid_by_usage(VID, PID, USAGE_PAGE_LCD, None)?;

    // 7. Transmit 4097-byte chunks
    let mut chunk_buf = [0u8; 4097];
    for chunk_idx in 0..total_chunks {
        let start = (chunk_idx as usize) * chunk_size;
        let end = (start + chunk_size).min(raw_stream.len());
        chunk_buf.fill(0);
        chunk_buf[0] = 0x00; // Report ID
        chunk_buf[1..(1 + end - start)].copy_from_slice(&raw_stream[start..end]);

        write_output(&lcd_dev, "kb884l", "0xFF68", &format!("LCD Chunk {}/{}", chunk_idx + 1, total_chunks), &chunk_buf)?;
        sleep(Duration::from_millis(12));
    }

    // 8. Commit on 0xFF13
    let mut p_commit = [0u8; 65];
    p_commit[1] = 0x04;
    p_commit[2] = 0x02;
    send_feature(&ctrl_dev, "kb884l", "0xFF13", "LCD Transfer Commit (0x0204)", &p_commit)?;

    Ok(format!("{frame_count} karelik animasyon ({total_chunks} chunk) başarıyla TFT ekrana yüklendi!"))
}
