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
    apply_lighting, apply_settings, sync_keyboard_time, upload_lcd_frames,
    Kb884lLightingConfig, Kb884lSettingsConfig,
};
use devices::kb884l::state::{
    load_screen, load_state, remember_lighting, remember_screen, remember_settings, Kb884lScreenState,
    Kb884lState,
};
use packet_log::record_packet;
use devices::kb884l::image_codec::{frames_to_previews, load_media_frames, LcdFit, LcdFramePreview};
use devices::kb884l::layout::{get_kb884l_layout, Kb884lPhysicalLayout};
use packet_log::{clear_logs, get_logs, PacketLogEntry};
use profiles::{delete_profile, list_profiles, save_profile, SavedProfile};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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

/// Serializes KB884L HID transactions: commands now run off the UI thread, and two
/// interleaved transactions (e.g. lighting during an LCD upload) would corrupt both.
static KB884L_IO: std::sync::Mutex<()> = std::sync::Mutex::new(());

/// Runs slow work (HID I/O, image decoding) on a worker thread so the window stays responsive.
async fn off_ui_thread<T: Send + 'static>(
    hid: bool,
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = hid.then(|| KB884L_IO.lock().unwrap_or_else(|p| p.into_inner()));
        work()
    })
    .await
    .map_err(|e| format!("Background task failed: {e}"))?
}

#[tauri::command]
async fn kb884l_sync_time(slot_id: Option<u8>) -> Result<String, String> {
    off_ui_thread(true, move || sync_keyboard_time(slot_id.unwrap_or(0))).await
}

#[tauri::command]
async fn kb884l_apply_lighting_cfg(cfg: Kb884lLightingConfig) -> Result<String, String> {
    off_ui_thread(true, move || {
        let msg = apply_lighting(&cfg)?;
        if let Err(e) = remember_lighting(&cfg) {
            record_packet("kb884l", "ERR", "state", e, &[]);
        }
        Ok(msg)
    })
    .await
}

#[tauri::command]
fn kb884l_load_state() -> Kb884lState {
    load_state()
}

#[tauri::command]
async fn kb884l_apply_settings_cfg(cfg: Kb884lSettingsConfig) -> Result<String, String> {
    off_ui_thread(true, move || {
        let msg = apply_settings(&cfg)?;
        if let Err(e) = remember_settings(&cfg) {
            record_packet("kb884l", "ERR", "state", e, &[]);
        }
        Ok(msg)
    })
    .await
}

#[tauri::command]
async fn kb884l_preview_file(
    file_path: String,
    fit: Option<LcdFit>,
) -> Result<Vec<LcdFramePreview>, String> {
    off_ui_thread(false, move || {
        let frames = load_media_frames(&file_path, fit.unwrap_or_default())?;
        frames_to_previews(&frames)
    })
    .await
}

#[tauri::command]
async fn kb884l_upload_media_file(
    file_path: String,
    slot_id: Option<u8>,
    fit: Option<LcdFit>,
) -> Result<String, String> {
    let slot = slot_id.unwrap_or(0);
    // Decode outside the HID lock; only the transfer itself needs exclusive access.
    let frames = off_ui_thread(false, move || load_media_frames(&file_path, fit.unwrap_or_default())).await?;
    let frames = std::sync::Arc::new(frames);
    let upload = frames.clone();
    let msg = off_ui_thread(true, move || upload_lcd_frames(&upload, slot)).await?;
    off_ui_thread(false, move || {
        if let Err(e) = remember_screen(&frames, slot) {
            record_packet("kb884l", "ERR", "state", e, &[]);
        }
        Ok(())
    })
    .await?;
    Ok(msg)
}

/// Last known screen animation (the LCD channel can't be read back).
#[tauri::command]
async fn kb884l_load_screen() -> Result<Option<Kb884lScreenState>, String> {
    off_ui_thread(false, load_screen).await
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

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tray icon with a show/quit menu. Closing the window hides it here instead of exiting,
/// so the device poll and the headset controls stay reachable from the tray.
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let show = MenuItem::with_id(app, "show", "Open Havit Console", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &PredefinedMenuItem::separator(app)?, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Havit Console")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Keep running in the tray; "Quit" in the tray menu exits.
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_connected_devices,
            get_kb884l_layout_data,
            kb884l_sync_time,
            kb884l_apply_lighting_cfg,
            kb884l_apply_settings_cfg,
            kb884l_load_state,
            kb884l_load_screen,
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
