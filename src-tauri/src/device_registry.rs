use crate::transport::hid::enumerate_hid_interfaces;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DeviceCategory {
    Keyboard,
    Headset,
    Mouse,
    Microphone,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub connected: bool,
    pub connection_type: String,
    pub vid_hex: String,
    pub pid_hex: String,
    pub firmware_version: Option<String>,
    pub matched_interfaces: Vec<String>,
    pub capabilities: DeviceCapabilities,
}

pub fn discover_havit_devices() -> Vec<DetectedDeviceStatus> {
    let hid_list = enumerate_hid_interfaces().unwrap_or_default();

    // 1. Havit KB884L Gaming Keyboard (OEM RKGK890, VID 0x05AC, PID 0x024F)
    let kb884l_ifaces: Vec<_> = hid_list
        .iter()
        .filter(|d| {
            d.vendor_id == 0x05AC
                && d.product_id == 0x024F
                && (d.usage_page == 0xFF13 || d.usage_page == 0xFF68)
        })
        .collect();
    let kb884l_connected = !kb884l_ifaces.is_empty();
    let kb884l_fw = kb884l_ifaces
        .first()
        .map(|d| format!("{}.{:02}", d.release_number >> 8, d.release_number & 0xFF));

    // 2. Havit Fuxi-H7 Gaming Headset (2.4GHz / USB Audio + HID VID 0x040B, PID 0x0897)
    let fuxi_ifaces: Vec<_> = hid_list
        .iter()
        .filter(|d| {
            d.vendor_id == 0x040B
                && (d.product_id == 0x0897 || d.product_id == 0x0896 || d.product_id == 0x0898)
        })
        .collect();
    let fuxi_connected = !fuxi_ifaces.is_empty();
    let fuxi_fw = fuxi_ifaces
        .first()
        .map(|d| format!("{}.{:02}", d.release_number >> 8, d.release_number & 0xFF));

    vec![
        DetectedDeviceStatus {
            id: "kb884l".to_string(),
            model: "KB884L".to_string(),
            name: "Havit KB884L RGB TFT Gaming Keyboard".to_string(),
            category: DeviceCategory::Keyboard,
            connected: kb884l_connected,
            connection_type: if kb884l_connected {
                "USB Wired (HID 0xFF13 + 0xFF68)".to_string()
            } else {
                "Disconnected (Preview Mode)".to_string()
            },
            vid_hex: "0x05AC".to_string(),
            pid_hex: "0x024F".to_string(),
            firmware_version: kb884l_fw,
            matched_interfaces: kb884l_ifaces
                .iter()
                .map(|i| format!("MI_{:02} ({})", i.interface_number, i.usage_page_hex))
                .collect(),
            capabilities: DeviceCapabilities {
                rgb_lighting: true,
                per_key_rgb: true,
                keymap: true,
                macros: true,
                tft_screen: true,
                clock_sync: true,
                equalizer: false,
                surround_7_1: false,
                microphone_dsp: false,
                battery_status: false,
            },
        },
        DetectedDeviceStatus {
            id: "fuxi-h7".to_string(),
            model: "Fuxi-H7".to_string(),
            name: "Havit Fuxi-H7 Quad-Mode Gaming Headset".to_string(),
            category: DeviceCategory::Headset,
            connected: fuxi_connected,
            connection_type: if fuxi_connected {
                "2.4GHz Wireless / USB Dongle (0xF100)".to_string()
            } else {
                "Disconnected (Preview Mode)".to_string()
            },
            vid_hex: "0x040B".to_string(),
            pid_hex: "0x0897".to_string(),
            firmware_version: fuxi_fw,
            matched_interfaces: fuxi_ifaces
                .iter()
                .map(|i| format!("MI_{:02} ({})", i.interface_number, i.usage_page_hex))
                .collect(),
            capabilities: DeviceCapabilities {
                rgb_lighting: false,
                per_key_rgb: false,
                keymap: false,
                macros: false,
                tft_screen: false,
                clock_sync: false,
                equalizer: true,
                surround_7_1: true,
                microphone_dsp: true,
                battery_status: true,
            },
        },
    ]
}
