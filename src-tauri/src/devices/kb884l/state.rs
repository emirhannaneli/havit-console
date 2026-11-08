//! Last-known KB884L configuration.
//!
//! The keyboard has no known command that reads lighting or settings back (0xF5 only returns
//! per-key LED levels for the vendor's music mode), and the vendor app keeps its own copy in
//! SQLite. So the state shown at startup comes from, in order:
//! 1. what this app last applied successfully (`%APPDATA%\havit-console\kb884l_state.json`),
//! 2. the vendor app's database (`Documents\KB884L Gaming Keyboard Driver Files\db\RKGK890_data.db`).
//!
//! Changes made on the keyboard itself (Fn shortcuts) are not visible to either source.

use super::driver::{Kb884lLightingConfig, Kb884lSettingsConfig};
use super::image_codec::{
    frame_to_png, frames_to_previews, load_media_frames, EncodedLcdFrame, LcdFit, LcdFramePreview,
    MAX_LCD_FRAMES,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Kb884lState {
    pub lighting: Option<Kb884lLightingConfig>,
    pub settings: Option<Kb884lSettingsConfig>,
    /// Where each part came from: "app" or "vendor". Not persisted.
    #[serde(default, skip_deserializing)]
    pub lighting_source: Option<String>,
    #[serde(default, skip_deserializing)]
    pub settings_source: Option<String>,
}

fn state_path() -> Option<PathBuf> {
    let base = std::env::var("APPDATA").or_else(|_| std::env::var("HOME")).ok()?;
    Some(PathBuf::from(base).join("havit-console").join("kb884l_state.json"))
}

fn read_saved() -> Kb884lState {
    state_path()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn write_saved(update: impl FnOnce(&mut Kb884lState)) -> Result<(), String> {
    let path = state_path().ok_or("App data folder not found")?;
    let mut state = read_saved();
    update(&mut state);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("Couldn't create folder: {e}"))?;
    }
    let json = serde_json::to_string_pretty(&Kb884lState {
        lighting_source: None,
        settings_source: None,
        ..state
    })
    .map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| format!("Couldn't save state: {e}"))
}

pub fn remember_lighting(cfg: &Kb884lLightingConfig) -> Result<(), String> {
    write_saved(|s| s.lighting = Some(cfg.clone()))
}

pub fn remember_settings(cfg: &Kb884lSettingsConfig) -> Result<(), String> {
    write_saved(|s| s.settings = Some(cfg.clone()))
}

/// The vendor app's per-user data folder (holds `db\` and `led\`).
fn vendor_root() -> Option<PathBuf> {
    let mut docs = Vec::new();
    if let Ok(home) = std::env::var("USERPROFILE") {
        docs.push(PathBuf::from(home).join("Documents"));
    }
    if let Ok(onedrive) = std::env::var("OneDrive") {
        docs.push(PathBuf::from(&onedrive).join("Documents"));
        docs.push(PathBuf::from(onedrive).join("Belgeler"));
    }
    docs.into_iter()
        .map(|d| d.join("KB884L Gaming Keyboard Driver Files"))
        .find(|p| p.join("db").join("RKGK890_data.db").is_file())
}

fn vendor_db_path() -> Option<PathBuf> {
    vendor_root().map(|r| r.join("db").join("RKGK890_data.db"))
}

// --- Screen (LCD) ---------------------------------------------------------------------

/// Last known screen animation. The LCD channel is write-only (DeviceDriver.exe never reads
/// it back), so this is the last upload from this app, else the vendor app's newest one.
#[derive(Debug, Clone, Serialize)]
pub struct Kb884lScreenState {
    pub frames: Vec<LcdFramePreview>,
    /// "app" or "vendor".
    pub source: String,
    pub slot: Option<u8>,
}

#[derive(Serialize, Deserialize)]
struct ScreenManifest {
    slot: u8,
    /// (file name, delay ms) in playback order.
    frames: Vec<(String, u16)>,
}

fn screen_dir() -> Option<PathBuf> {
    state_path().map(|p| p.with_file_name("kb884l_screen"))
}

/// Stores the frames exactly as uploaded (already scaled and quantized).
pub fn remember_screen(frames: &[EncodedLcdFrame], slot: u8) -> Result<(), String> {
    let dir = screen_dir().ok_or("App data folder not found")?;
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("Couldn't remove the previous screen copy: {e}"))?;
    }
    fs::create_dir_all(&dir).map_err(|e| format!("Couldn't create folder: {e}"))?;
    let mut manifest = ScreenManifest { slot, frames: Vec::with_capacity(frames.len()) };
    for (i, f) in frames.iter().enumerate() {
        let name = format!("{i}.png");
        fs::write(dir.join(&name), frame_to_png(&f.rgba)?)
            .map_err(|e| format!("Couldn't save frame: {e}"))?;
        manifest.frames.push((name, f.delay_ms));
    }
    let json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
    fs::write(dir.join("manifest.json"), json).map_err(|e| format!("Couldn't save screen: {e}"))
}

fn load_frames(dir: &std::path::Path, list: &[(String, u16)]) -> Result<Vec<EncodedLcdFrame>, String> {
    list.iter()
        .take(MAX_LCD_FRAMES)
        .map(|(name, delay_ms)| {
            // Vendor frames are plain PNGs; run them through the same pipeline as uploads.
            let path = dir.join(name);
            let mut frames = load_media_frames(&path.to_string_lossy(), LcdFit::Fit)?;
            let mut frame = frames.pop().ok_or("Empty frame")?;
            frame.delay_ms = *delay_ms;
            Ok(frame)
        })
        .collect()
}

fn read_saved_screen() -> Option<(Vec<EncodedLcdFrame>, u8)> {
    let dir = screen_dir()?;
    let raw = fs::read_to_string(dir.join("manifest.json")).ok()?;
    let manifest: ScreenManifest = serde_json::from_str(&raw).ok()?;
    let frames = load_frames(&dir, &manifest.frames).ok()?;
    (!frames.is_empty()).then_some((frames, manifest.slot))
}

fn read_vendor_screen() -> Option<Vec<EncodedLcdFrame>> {
    use rusqlite::{params, Connection, OpenFlags};
    let root = vendor_root()?;
    let db = Connection::open_with_flags(root.join("db").join("RKGK890_data.db"), OpenFlags::SQLITE_OPEN_READ_ONLY).ok()?;
    let (led_id, file_dir): (i64, String) = db
        .query_row(
            "SELECT led_id, file_dir FROM t_ledlayer_data WHERE profile = ?1 ORDER BY led_id DESC LIMIT 1",
            params![VENDOR_PROFILE],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .ok()?;
    let mut stmt = db
        .prepare("SELECT file_name, delay_time FROM t_ledframe_data WHERE led_id = ?1 ORDER BY frame_index")
        .ok()?;
    let list: Vec<(String, u16)> = stmt
        .query_map(params![led_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?.clamp(20, 510) as u16)))
        .ok()?
        .filter_map(Result::ok)
        .collect();
    let frames = load_frames(&root.join("led").join(file_dir), &list).ok()?;
    (!frames.is_empty()).then_some(frames)
}

pub fn load_screen() -> Result<Option<Kb884lScreenState>, String> {
    let found = read_saved_screen()
        .map(|(frames, slot)| (frames, "app", Some(slot)))
        .or_else(|| read_vendor_screen().map(|frames| (frames, "vendor", None)));
    match found {
        Some((frames, source, slot)) => Ok(Some(Kb884lScreenState {
            frames: frames_to_previews(&frames)?,
            source: source.to_string(),
            slot,
        })),
        None => Ok(None),
    }
}

/// Profile index the vendor app uses for the keyboard (FUN_00413c00 sets it to 1).
const VENDOR_PROFILE: i64 = 1;

type VendorState = (Option<Kb884lLightingConfig>, Option<Kb884lSettingsConfig>);

fn read_vendor() -> Result<VendorState, String> {
    use rusqlite::{params, Connection, OpenFlags, OptionalExtension};

    let Some(path) = vendor_db_path() else {
        return Ok((None, None));
    };
    let db = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Couldn't open the Havit database: {e}"))?;

    let byte = |v: i64, max: i64| v.clamp(0, max) as u8;

    // t_light_data columns map onto the lighting packet (see driver::apply_lighting).
    let lighting = db
        .query_row(
            "SELECT mode, colortype, byte2, byte3, byte4, byte5, byte6, byte7 FROM t_light_data \
             WHERE profile = ?1 AND sel = 1 LIMIT 1",
            params![VENDOR_PROFILE],
            |r| {
                Ok(Kb884lLightingConfig {
                    mode: byte(r.get(0)?, 20),
                    random_color: r.get::<_, i64>(1)? == 1,
                    r: byte(r.get(2)?, 255),
                    g: byte(r.get(3)?, 255),
                    b: byte(r.get(4)?, 255),
                    direction: byte(r.get(5)?, 3),
                    brightness: byte(r.get(6)?, 5),
                    speed: byte(r.get(7)?, 5),
                })
            },
        )
        .optional()
        .map_err(|e| format!("Couldn't read the Havit lighting setting: {e}"))?;

    let config = |key: &str| -> Option<String> {
        db.query_row(
            "SELECT value FROM t_configdata WHERE profile = ?1 AND key = ?2",
            params![VENDOR_PROFILE, key],
            |r| r.get::<_, String>(0),
        )
        .ok()
    };
    let flag = |key: &str| config(key).as_deref() == Some("1");
    let settings = config("sleep_light").map(|sleep| Kb884lSettingsConfig {
        sleep_minutes: match sleep.as_str() {
            "0" => 0,
            "1" => 1,
            "2" => 5,
            _ => 30,
        },
        debounce_ms: 2,
        win_lock: flag("gamemode") && flag("disable_win"),
        fn_toggle: flag("fn_switchfunction"),
    });

    Ok((lighting, settings))
}

pub fn load_state() -> Kb884lState {
    let mut state = read_saved();
    if state.lighting.is_some() {
        state.lighting_source = Some("app".into());
    }
    if state.settings.is_some() {
        state.settings_source = Some("app".into());
    }
    if state.lighting.is_none() || state.settings.is_none() {
        if let Ok((lighting, settings)) = read_vendor() {
            if state.lighting.is_none() && lighting.is_some() {
                state.lighting = lighting;
                state.lighting_source = Some("vendor".into());
            }
            if state.settings.is_none() && settings.is_some() {
                state.settings = settings;
                state.settings_source = Some("vendor".into());
            }
        }
    }
    state
}
