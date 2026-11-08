use crate::transport::hid::{enumerate_hid_interfaces, RawHidInterfaceInfo};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DeviceCategory {
    Keyboard,
    Headset,
    Mouse,
    Microphone,
    Unknown,
}

/// How far support for a model has been proven.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SupportLevel {
    /// Tested on real hardware by the maintainers.
    Verified,
    /// Identified from the vendor software or community data; never tested here.
    Experimental,
    /// Looks like a Havit device (by USB strings) but is not in the catalog.
    Unknown,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeviceCapabilities {
    pub rgb_lighting: bool,
    pub per_key_rgb: bool,
    pub keymap: bool,
    pub macros: bool,
    pub tft_screen: bool,
    pub clock_sync: bool,
    pub equalizer: bool,
    pub surround_7_1: bool,
    pub microphone_dsp: bool,
    pub battery_status: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedDeviceStatus {
    pub id: String,
    pub model: String,
    pub name: String,
    pub category: DeviceCategory,
    /// Protocol family that owns the driver: "hfd", "xiisound", "qmk_via", "houyi", "unknown".
    pub family: String,
    pub support: SupportLevel,
    pub connected: bool,
    pub connection_type: String,
    pub vid_hex: String,
    pub pid_hex: String,
    pub firmware_version: Option<String>,
    pub matched_interfaces: Vec<String>,
    pub capabilities: DeviceCapabilities,
}

/// A Havit model we know about. Verified entries have a driver; experimental ones are only
/// recognised so testers can report them (see `docs/ECOSYSTEM_FAMILIES.md`).
struct CatalogEntry {
    id: &'static str,
    model: &'static str,
    name: &'static str,
    category: DeviceCategory,
    family: &'static str,
    support: SupportLevel,
    vid: u16,
    pids: &'static [u16],
}

const CATALOG: &[CatalogEntry] = &[
    CatalogEntry {
        id: "kb884l",
        model: "KB884L",
        name: "Havit KB884L",
        category: DeviceCategory::Keyboard,
        family: "hfd",
        support: SupportLevel::Verified,
        vid: 0x05AC,
        pids: &[0x024F],
    },
    CatalogEntry {
        id: "fuxi-h7",
        model: "Fuxi-H7",
        name: "Havit Fuxi-H7",
        category: DeviceCategory::Headset,
        family: "xiisound",
        support: SupportLevel::Verified,
        vid: 0x040B,
        pids: &[0x0897, 0x0896, 0x0898],
    },
    CatalogEntry {
        id: "kb896l",
        model: "KB896L",
        name: "Havit KB896L (Cupid70)",
        category: DeviceCategory::Keyboard,
        family: "qmk_via",
        support: SupportLevel::Experimental,
        vid: 0x342D,
        pids: &[0xE419],
    },
    CatalogEntry {
        id: "astralforce-1",
        model: "Astralforce-1",
        name: "Havit Astralforce-1",
        category: DeviceCategory::Keyboard,
        family: "qmk_via",
        support: SupportLevel::Experimental,
        vid: 0xAA96,
        pids: &[0xAA52],
    },
    CatalogEntry {
        id: "astralforce-2",
        model: "Astralforce-2",
        name: "Havit Astralforce-2",
        category: DeviceCategory::Keyboard,
        family: "qmk_via",
        support: SupportLevel::Experimental,
        vid: 0xAA96,
        pids: &[0xAA53],
    },
];

fn firmware_of(ifaces: &[&RawHidInterfaceInfo]) -> Option<String> {
    ifaces
        .first()
        .map(|d| format!("{}.{:02}", d.release_number >> 8, d.release_number & 0xFF))
}

fn interface_labels(ifaces: &[&RawHidInterfaceInfo]) -> Vec<String> {
    ifaces
        .iter()
        .map(|i| format!("MI_{:02} ({})", i.interface_number, i.usage_page_hex))
        .collect()
}

fn mentions_havit(d: &RawHidInterfaceInfo) -> bool {
    let m = d.manufacturer.to_ascii_lowercase();
    let p = d.product.to_ascii_lowercase();
    m.contains("havit") || p.contains("havit")
}

pub fn discover_havit_devices() -> Vec<DetectedDeviceStatus> {
    let hid_list = enumerate_hid_interfaces().unwrap_or_default();
    let mut out = Vec::new();
    let mut claimed: Vec<(u16, u16)> = Vec::new();

    for entry in CATALOG {
        let ifaces: Vec<&RawHidInterfaceInfo> = hid_list
            .iter()
            .filter(|d| d.vendor_id == entry.vid && entry.pids.contains(&d.product_id))
            // The KB884L has several interfaces; only the vendor ones mean "our" keyboard.
            .filter(|d| entry.id != "kb884l" || d.usage_page == 0xFF13 || d.usage_page == 0xFF68)
            .collect();
        let connected = !ifaces.is_empty();
        for d in &ifaces {
            claimed.push((d.vendor_id, d.product_id));
        }
        // Verified devices are always listed (so their pages stay reachable); experimental
        // ones only when actually plugged in.
        if entry.support != SupportLevel::Verified && !connected {
            continue;
        }
        let pid = ifaces.first().map(|d| d.product_id).unwrap_or(entry.pids[0]);
        out.push(DetectedDeviceStatus {
            id: entry.id.to_string(),
            model: entry.model.to_string(),
            name: entry.name.to_string(),
            category: entry.category.clone(),
            family: entry.family.to_string(),
            support: entry.support,
            connected,
            connection_type: match (entry.family, connected) {
                (_, false) => "Not connected".to_string(),
                ("xiisound", true) => "2.4 GHz wireless receiver".to_string(),
                (_, true) => "USB wired".to_string(),
            },
            vid_hex: format!("0x{:04X}", entry.vid),
            pid_hex: format!("0x{:04X}", pid),
            firmware_version: firmware_of(&ifaces),
            matched_interfaces: interface_labels(&ifaces),
            capabilities: capabilities_for(entry.id),
        });
    }

    // Anything else that calls itself Havit: grouped per VID/PID so testers can report it.
    let mut unknown: BTreeMap<(u16, u16), Vec<&RawHidInterfaceInfo>> = BTreeMap::new();
    for d in hid_list.iter().filter(|d| mentions_havit(d)) {
        let key = (d.vendor_id, d.product_id);
        if claimed.contains(&key) {
            continue;
        }
        unknown.entry(key).or_default().push(d);
    }
    for ((vid, pid), ifaces) in unknown {
        let product = ifaces
            .iter()
            .map(|d| d.product.trim())
            .find(|p| !p.is_empty())
            .unwrap_or("Havit device")
            .to_string();
        out.push(DetectedDeviceStatus {
            id: format!("unknown-{vid:04x}-{pid:04x}"),
            model: product.clone(),
            name: product,
            category: DeviceCategory::Unknown,
            family: "unknown".to_string(),
            support: SupportLevel::Unknown,
            connected: true,
            connection_type: "USB".to_string(),
            vid_hex: format!("0x{vid:04X}"),
            pid_hex: format!("0x{pid:04X}"),
            firmware_version: firmware_of(&ifaces),
            matched_interfaces: interface_labels(&ifaces),
            capabilities: DeviceCapabilities::default(),
        });
    }

    out
}

fn capabilities_for(id: &str) -> DeviceCapabilities {
    match id {
        "kb884l" => DeviceCapabilities {
            rgb_lighting: true,
            per_key_rgb: true,
            keymap: true,
            macros: true,
            tft_screen: true,
            clock_sync: true,
            ..Default::default()
        },
        "fuxi-h7" => DeviceCapabilities {
            equalizer: true,
            surround_7_1: true,
            microphone_dsp: true,
            battery_status: true,
            ..Default::default()
        },
        _ => DeviceCapabilities::default(),
    }
}
