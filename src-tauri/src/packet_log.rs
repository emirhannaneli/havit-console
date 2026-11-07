use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

const MAX_LOG_ENTRIES: usize = 300;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PacketLogEntry {
    pub id: u64,
    pub timestamp: String,
    pub device_id: String,
    pub direction: String, // "TX", "RX", "INFO", "ERR"
    pub channel: String,
    pub summary: String,
    pub byte_len: usize,
    pub hex_preview: String,
}

struct LoggerState {
    next_id: u64,
    entries: VecDeque<PacketLogEntry>,
}

static LOGGER: OnceLock<Mutex<LoggerState>> = OnceLock::new();

fn state() -> &'static Mutex<LoggerState> {
    LOGGER.get_or_init(|| {
        Mutex::new(LoggerState {
            next_id: 1,
            entries: VecDeque::with_capacity(MAX_LOG_ENTRIES),
        })
    })
}

pub fn format_hex_preview(bytes: &[u8], max_bytes: usize) -> String {
    let slice = &bytes[..bytes.len().min(max_bytes)];
    let mut out = slice
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ");
    if bytes.len() > max_bytes {
        out.push_str(&format!(" … (+{} bytes)", bytes.len() - max_bytes));
    }
    out
}

pub fn record_packet(
    device_id: &str,
    direction: &str,
    channel: &str,
    summary: impl Into<String>,
    bytes: &[u8],
) {
    if let Ok(mut guard) = state().lock() {
        let id = guard.next_id;
        guard.next_id += 1;
        if guard.entries.len() >= MAX_LOG_ENTRIES {
            guard.entries.pop_front();
        }
        guard.entries.push_back(PacketLogEntry {
            id,
            timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
            device_id: device_id.to_string(),
            direction: direction.to_string(),
            channel: channel.to_string(),
            summary: summary.into(),
            byte_len: bytes.len(),
            hex_preview: if bytes.is_empty() {
                String::new()
            } else {
                format_hex_preview(bytes, 32)
            },
        });
    }
}

pub fn get_logs() -> Vec<PacketLogEntry> {
    state()
        .lock()
        .map(|g| g.entries.iter().cloned().collect())
        .unwrap_or_default()
}

pub fn clear_logs() {
    if let Ok(mut guard) = state().lock() {
        guard.entries.clear();
    }
}
