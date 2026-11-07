pub mod device_registry;
pub mod devices;
pub mod packet_log;
pub mod profiles;
pub mod transport;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use device_registry::{discover_havit_devices, DetectedDeviceStatus};
use devices::fuxi_h7::windows_audio::{
    query_status, set_channel_balance, set_mic_volume, set_speaker_volume,
    FuxiAudioEndpointStatus,
};
use devices::kb884l::driver::{
    apply_lighting, apply_settings, sync_keyboard_time, upload_lcd_animation,
    Kb884lLightingConfig, Kb884lSettingsConfig,
};
use devices::kb884l::image_codec::{frames_to_previews, load_media_frames, LcdFramePreview};
use devices::kb884l::layout::{get_kb884l_layout, Kb884lPhysicalLayout};
use packet_log::{clear_logs, get_logs, PacketLogEntry};
use profiles::{delete_profile, list_profiles, save_profile, SavedProfile};
use std::fs;
use std::path::PathBuf;

// --- Device Discovery ---

#[tauri::command]
fn get_connected_devices() -> Result<Vec<DetectedDeviceStatus>, String> {
    Ok(discover_havit_devices())
}

// --- KB884L Keyboard Commands ---

#[tauri::command]
fn get_kb884l_layout_data() -> Result<Kb884lPhysicalLayout, String> {
    Ok(get_kb884l_layout())
}

#[tauri::command]
fn kb884l_sync_time(slot_id: Option<u8>) -> Result<String, String> {
    sync_keyboard_time(slot_id.unwrap_or(0))
}

#[tauri::command]
fn kb884l_apply_lighting_cfg(cfg: Kb884lLightingConfig) -> Result<String, String> {
    apply_lighting(&cfg)
}

#[tauri::command]
fn kb884l_apply_settings_cfg(cfg: Kb884lSettingsConfig) -> Result<String, String> {
    apply_settings(&cfg)
}

#[tauri::command]
fn kb884l_preview_file(file_path: String) -> Result<Vec<LcdFramePreview>, String> {
    let frames = load_media_frames(&file_path)?;
    frames_to_previews(&frames)
}

#[tauri::command]
fn kb884l_upload_media_file(file_path: String, slot_id: Option<u8>) -> Result<String, String> {
    upload_lcd_animation(&file_path, slot_id.unwrap_or(0))
}

#[tauri::command]
fn save_temp_media(base64_data: String, file_name: String) -> Result<String, String> {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let cache_dir = base.join("havit-console").join("cache");
    fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache dir: {e}"))?;

    let clean_name = file_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>();
    let target = cache_dir.join(clean_name);

    let bytes = BASE64
        .decode(&base64_data)
        .map_err(|e| format!("Invalid base64 payload: {e}"))?;
    fs::write(&target, bytes).map_err(|e| format!("Failed to write cache file: {e}"))?;

    target
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid UTF-8 cache path".to_string())
}

// --- Fuxi-H7 Audio Endpoint Commands ---

#[tauri::command]
fn fuxi_get_status() -> Result<FuxiAudioEndpointStatus, String> {
    Ok(query_status())
}

#[tauri::command]
fn fuxi_set_speaker(volume: u8, muted: bool) -> Result<(), String> {
    set_speaker_volume(volume, muted)
}

#[tauri::command]
fn fuxi_set_balance(left: u8, right: u8) -> Result<(), String> {
    set_channel_balance(left, right)
}

#[tauri::command]
fn fuxi_set_mic(volume: u8, muted: bool) -> Result<(), String> {
    set_mic_volume(volume, muted)
}

// --- Profile Storage Commands ---

#[tauri::command]
fn profile_list(device_id: Option<String>) -> Result<Vec<SavedProfile>, String> {
    list_profiles(device_id.as_deref())
}

#[tauri::command]
fn profile_save(profile: SavedProfile) -> Result<SavedProfile, String> {
    save_profile(profile)
}

#[tauri::command]
fn profile_delete(profile_id: String) -> Result<(), String> {
    delete_profile(&profile_id)
}

// --- Packet Log Diagnostics ---

#[tauri::command]
fn packet_log_list() -> Result<Vec<PacketLogEntry>, String> {
    Ok(get_logs())
}

#[tauri::command]
fn packet_log_clear() -> Result<(), String> {
    clear_logs();
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_connected_devices,
            get_kb884l_layout_data,
            kb884l_sync_time,
            kb884l_apply_lighting_cfg,
            kb884l_apply_settings_cfg,
            kb884l_preview_file,
            kb884l_upload_media_file,
            save_temp_media,
            fuxi_get_status,
            fuxi_set_speaker,
            fuxi_set_balance,
            fuxi_set_mic,
            profile_list,
            profile_save,
            profile_delete,
            packet_log_list,
            packet_log_clear,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Havit Console");
}
