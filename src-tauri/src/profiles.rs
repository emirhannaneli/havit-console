use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedProfile {
    pub id: String,
    pub name: String,
    pub device_id: String,
    pub updated_at: String,
    pub data: Value,
}

fn profiles_dir() -> Result<PathBuf, String> {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let dir = base.join("havit-console").join("profiles");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create profiles directory: {e}"))?;
    Ok(dir)
}

pub fn list_profiles(device_id: Option<&str>) -> Result<Vec<SavedProfile>, String> {
    let dir = profiles_dir()?;
    let mut out = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read profiles dir: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Ok(raw) = fs::read_to_string(&path) {
                if let Ok(prof) = serde_json::from_str::<SavedProfile>(&raw) {
                    if device_id.map_or(true, |id| prof.device_id == id) {
                        out.push(prof);
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(out)
}

pub fn save_profile(profile: SavedProfile) -> Result<SavedProfile, String> {
    let dir = profiles_dir()?;
    let safe_id: String = profile
        .id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if safe_id.is_empty() {
        return Err("Invalid profile ID".to_string());
    }
    let path = dir.join(format!("{safe_id}.json"));
    let json = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write profile: {e}"))?;
    Ok(profile)
}

pub fn delete_profile(profile_id: &str) -> Result<(), String> {
    let dir = profiles_dir()?;
    let safe_id: String = profile_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let path = dir.join(format!("{safe_id}.json"));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete profile: {e}"))?;
    }
    Ok(())
}
