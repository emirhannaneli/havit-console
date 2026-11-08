use crate::devices::kb884l::image_codec::{rgba_to_rgb565_bytes, EncodedLcdFrame};
use crate::packet_log::record_packet;
use crate::transport::hid::{
    find_hid_path, get_feature, open_hid_by_usage, read_timeout, send_feature, LongWriteHid,
};
use hidapi::HidDevice;
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
    pub mode: u8,        // 0..20, vendor mode ids (0 = LED off, 1 = static, ...)
    pub brightness: u8,  // 0..5
    pub speed: u8,       // 0..5
    pub direction: u8,   // 0..3, meaning depends on the mode
    pub r: u8,
    pub g: u8,
    pub b: u8,
    /// Vendor "Random Color" switch (colortype 1); the RGB value is ignored when set.
    #[serde(default)]
    pub random_color: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Kb884lSettingsConfig {
    pub sleep_minutes: u8, // 0 (Never), 1, 5, 30
    pub debounce_ms: u8,   // 1, 2, 8
    pub win_lock: bool,
    pub fn_toggle: bool,
}

// Packet layouts below follow DeviceDriver.exe (Ghidra, `.re_workspace/kb884l`).
// Wire buffers are 65 bytes: [report id 0x00] + 64 payload bytes. Every command is sent via
// FUN_00456c70: SetFeature, then (when `ack` is set) GetFeature; byte 4 of the reply == 0xFF
// means "busy" and the command is re-sent once. Trailers are the u16 0x55AA stored
// little-endian, i.e. bytes `AA 55`.

const CTRL_DELAY: Duration = Duration::from_millis(10);

fn send_ctrl(dev: &HidDevice, summary: &str, buf: &[u8; 65], ack: bool) -> Result<(), String> {
    send_feature(dev, "kb884l", "0xFF13", summary, buf)?;
    if !ack {
        return Ok(());
    }
    sleep(CTRL_DELAY);
    let mut reply = *buf;
    get_feature(dev, "kb884l", "0xFF13", &format!("{summary} ACK"), &mut reply)?;
    if reply[4] == 0xFF {
        send_feature(dev, "kb884l", "0xFF13", &format!("{summary} (retry, device busy)"), buf)?;
        sleep(CTRL_DELAY);
        let mut reply = *buf;
        get_feature(dev, "kb884l", "0xFF13", &format!("{summary} ACK"), &mut reply)?;
    }
    Ok(())
}

/// `[0x00, 0x04, cmd, ...]` header packet.
fn header(cmd: u8) -> [u8; 65] {
    let mut p = [0u8; 65];
    p[1] = 0x04;
    p[2] = cmd;
    p
}

fn begin(dev: &HidDevice) -> Result<(), String> {
    send_ctrl(dev, "Transaction Start (0x1804)", &header(0x18), true)
}

fn commit(dev: &HidDevice) -> Result<(), String> {
    send_ctrl(dev, "Commit (0x0204)", &header(0x02), true)
}

/// Current-profile index used by the vendor app for settings writes (defaults to 1).
const PROFILE: u8 = 1;

pub fn sync_keyboard_time(slot_id: u8) -> Result<String, String> {
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;
    let now = Local::now();

    begin(&dev)?;
    let mut bank = header(0x28);
    bank[9] = 0x01;
    send_ctrl(&dev, "Select Clock Bank (0x2804)", &bank, true)?;

    // FUN_00437980: [0]=0, [1]=slot+1, [2]=0x5A, [3]=year%2000, month, day, hour, min, sec
    let mut p = [0u8; 65];
    p[2] = slot_id + 1;
    p[3] = 0x5A;
    p[4] = (now.year() % 2000) as u8;
    p[5] = now.month() as u8;
    p[6] = now.day() as u8;
    p[7] = now.hour() as u8;
    p[8] = now.minute() as u8;
    p[9] = now.second() as u8;
    p[63] = 0xAA;
    p[64] = 0x55;
    send_ctrl(&dev, &format!("Clock Sync {:02}:{:02}:{:02}", now.hour(), now.minute(), now.second()), &p, true)?;
    commit(&dev)?;

    record_packet("kb884l", "INFO", "0xFF13", format!("Time synchronized to {now}"), &[]);
    Ok(format!("Saat eşitlendi: {:02}:{:02}:{:02}", now.hour(), now.minute(), now.second()))
}

pub fn apply_lighting(cfg: &Kb884lLightingConfig) -> Result<String, String> {
    if cfg.mode > 20 {
        return Err(format!("Geçersiz ışık modu: {}", cfg.mode));
    }
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;

    begin(&dev)?;
    let mut bank = header(0x13);
    bank[9] = 0x01;
    send_ctrl(&dev, "Select Lighting Bank (0x1304)", &bank, true)?;

    // FUN_0042d130 / t_light_data: [0]=mode, [1..3]=R,G,B, [8]=colortype,
    // [9]=brightness, [10]=speed, [11]=direction. colortype: 0 = the given RGB, 1 = random
    // colors (the vendor's "Random Color" switch, string 260).
    let mut p = [0u8; 65];
    p[1] = cfg.mode;
    p[2] = cfg.r;
    p[3] = cfg.g;
    p[4] = cfg.b;
    p[9] = cfg.random_color as u8;
    p[10] = cfg.brightness.clamp(0, 5);
    p[11] = cfg.speed.clamp(0, 5);
    p[12] = cfg.direction.clamp(0, 3);
    p[15] = 0xAA;
    p[16] = 0x55;
    send_ctrl(
        &dev,
        &format!("Lighting Mode {} (B={}, S={}, D={})", cfg.mode, cfg.brightness, cfg.speed, cfg.direction),
        &p,
        false,
    )?;
    sleep(CTRL_DELAY);
    commit(&dev)?;
    send_ctrl(&dev, "Flash NVRAM Save (0xF004)", &header(0xF0), true)?;

    Ok("Aydınlatma klavyeye uygulandı.".to_string())
}

pub fn apply_settings(cfg: &Kb884lSettingsConfig) -> Result<String, String> {
    let dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;

    begin(&dev)?;
    let mut bank = header(0x17);
    bank[3] = PROFILE;
    bank[9] = 0x01;
    send_ctrl(&dev, "Select Settings Bank (0x1704)", &bank, true)?;

    // FUN_00436980 / FUN_00436570 (payload indices, wire = +1): [1]=game mode,
    // [2]=disable Alt+Tab, [3]=disable Alt+F4, [4]=disable Win key, [5]=Fn switch function,
    // [6]=light sleep index (0 never, 1=1 min, 2=5 min, 3=30 min), [8]=key response index.
    let sleep_index = match cfg.sleep_minutes {
        0 => 0,
        1 => 1,
        5 => 2,
        _ => 3,
    };
    let mut p = [0u8; 65];
    p[2] = cfg.win_lock as u8;
    p[5] = cfg.win_lock as u8;
    p[6] = cfg.fn_toggle as u8;
    p[7] = sleep_index;
    p[9] = 2; // vendor default key response setting; ms mapping not decoded yet
    p[63] = 0xAA;
    p[64] = 0x55;
    send_ctrl(&dev, &format!("Settings (WinLock={}, Fn={}, Sleep={}m)", cfg.win_lock, cfg.fn_toggle, cfg.sleep_minutes), &p, true)?;
    commit(&dev)?;

    Ok("Klavye ayarları kaydedildi.".to_string())
}

pub fn upload_lcd_frames(frames: &[EncodedLcdFrame], slot_id: u8) -> Result<String, String> {
    let frame_count = frames.len().min(255);
    if frame_count == 0 {
        return Err("GIF veya görselde geçerli kare bulunamadı".to_string());
    }

    // FUN_00423640: buffer pre-filled with 0xFF; [0]=frame count, [1+i]=delay/2 (min 1),
    // frames (RGB565 little-endian, 0x7800 bytes each) from offset 0x100.
    let total_payload_size = 256 + frame_count * 30720;
    let chunk_size = 4096;
    let total_chunks = total_payload_size.div_ceil(chunk_size);
    let mut raw_stream = vec![0xFFu8; total_chunks * chunk_size];
    raw_stream[0] = frame_count as u8;
    for (i, f) in frames.iter().take(frame_count).enumerate() {
        raw_stream[1 + i] = (f.delay_ms / 2).clamp(1, 255) as u8;
        let off = 256 + i * 30720;
        raw_stream[off..off + 30720].copy_from_slice(&rgba_to_rgb565_bytes(&f.rgba, false));
    }
    let total_chunks = total_chunks as u16;

    let ctrl_dev = open_hid_by_usage(VID, PID, USAGE_PAGE_CTRL, None)?;
    // Open the LCD channel before starting so a missing interface can't strand a transaction.
    let lcd_path = find_hid_path(VID, PID, USAGE_PAGE_LCD)?;
    let lcd_writer = LongWriteHid::open(&lcd_path)?;
    let lcd_reader = open_hid_by_usage(VID, PID, USAGE_PAGE_LCD, None)?;

    begin(&ctrl_dev)?;

    // Everything after the start runs in a closure so the transaction is always closed:
    // an unclosed 0x72 transfer leaves the keyboard waiting with its lighting off.
    let transfer = || -> Result<(), String> {
        // Allocation: [0x00, 0x04, 0x72, slot+1, 0, 0, 0, 0, 0, chunks_lo, chunks_hi]
        let mut alloc = header(0x72);
        alloc[3] = slot_id + 1;
        alloc[9] = (total_chunks & 0xFF) as u8;
        alloc[10] = (total_chunks >> 8) as u8;
        send_ctrl(&ctrl_dev, &format!("LCD Allocation (Chunks={total_chunks}, Frames={frame_count})"), &alloc, true)?;

        // FUN_00457020 / FUN_004585f0: WriteFile [0x00]+4096 bytes and wait for completion
        // (the vendor waits without a limit; the first chunk stalls while flash is erased),
        // then read the input-report ACK with a 300 ms limit.
        let mut chunk_buf = [0u8; 4097];
        let mut ack_buf = [0u8; 65];
        for (idx, chunk) in raw_stream.chunks(chunk_size).enumerate() {
            chunk_buf[0] = 0x00;
            chunk_buf[1..].copy_from_slice(chunk);
            let label = format!("LCD Chunk {}/{}", idx + 1, total_chunks);
            lcd_writer.write("kb884l", "0xFF68", &label, &chunk_buf, 15_000)?;
            let _ = read_timeout(&lcd_reader, "kb884l", "0xFF68", &format!("{label} ACK"), &mut ack_buf, 300);
        }
        Ok(())
    };
    let result = transfer();
    let closed = commit(&ctrl_dev);
    result?;
    closed?;

    Ok(format!("{frame_count} karelik animasyon ekrana yüklendi."))
}
