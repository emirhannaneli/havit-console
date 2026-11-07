use crate::packet_log::record_packet;
use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawHidInterfaceInfo {
    pub vendor_id: u16,
    pub product_id: u16,
    pub vid_hex: String,
    pub pid_hex: String,
    pub release_number: u16,
    pub interface_number: i32,
    pub usage_page: u16,
    pub usage: u16,
    pub usage_page_hex: String,
    pub usage_hex: String,
    pub manufacturer: String,
    pub product: String,
    pub path: String,
}

pub fn enumerate_hid_interfaces() -> Result<Vec<RawHidInterfaceInfo>, String> {
    let api = HidApi::new().map_err(|e| format!("HID init failed: {e}"))?;
    let mut list = Vec::new();
    for dev in api.device_list() {
        list.push(RawHidInterfaceInfo {
            vendor_id: dev.vendor_id(),
            product_id: dev.product_id(),
            vid_hex: format!("0x{:04X}", dev.vendor_id()),
            pid_hex: format!("0x{:04X}", dev.product_id()),
            release_number: dev.release_number(),
            interface_number: dev.interface_number(),
            usage_page: dev.usage_page(),
            usage: dev.usage(),
            usage_page_hex: format!("0x{:04X}", dev.usage_page()),
            usage_hex: format!("0x{:04X}", dev.usage()),
            manufacturer: dev.manufacturer_string().unwrap_or_default().to_string(),
            product: dev.product_string().unwrap_or_default().to_string(),
            path: dev.path().to_string_lossy().to_string(),
        });
    }
    list.sort_by(|a, b| {
        (a.vendor_id, a.product_id, a.interface_number, a.usage_page).cmp(&(
            b.vendor_id,
            b.product_id,
            b.interface_number,
            b.usage_page,
        ))
    });
    Ok(list)
}

pub fn open_hid_by_usage(
    vid: u16,
    pid: u16,
    usage_page: u16,
    usage: Option<u16>,
) -> Result<HidDevice, String> {
    let api = HidApi::new().map_err(|e| format!("HID init failed: {e}"))?;
    let target = api
        .device_list()
        .find(|d| {
            d.vendor_id() == vid
                && d.product_id() == pid
                && d.usage_page() == usage_page
                && usage.map_or(true, |u| d.usage() == u)
        })
        .ok_or_else(|| {
            format!(
                "HID interface not found (VID=0x{:04X} PID=0x{:04X} UsagePage=0x{:04X})",
                vid, pid, usage_page
            )
        })?;

    target
        .open_device(&api)
        .map_err(|e| format!("Failed to open HID interface: {e}"))
}

pub fn write_output(
    dev: &HidDevice,
    device_id: &str,
    channel: &str,
    summary: &str,
    buf: &[u8],
) -> Result<usize, String> {
    record_packet(device_id, "TX", channel, summary, buf);
    dev.write(buf).map_err(|e| {
        let msg = format!("HID write failed ({summary}): {e}");
        record_packet(device_id, "ERR", channel, &msg, &[]);
        msg
    })
}

pub fn send_feature(
    dev: &HidDevice,
    device_id: &str,
    channel: &str,
    summary: &str,
    buf: &[u8],
) -> Result<(), String> {
    record_packet(device_id, "TX", channel, format!("Feature: {summary}"), buf);
    dev.send_feature_report(buf).map_err(|e| {
        let msg = format!("HID send_feature_report failed ({summary}): {e}");
        record_packet(device_id, "ERR", channel, &msg, &[]);
        msg
    })
}

pub fn get_feature(
    dev: &HidDevice,
    device_id: &str,
    channel: &str,
    summary: &str,
    buf: &mut [u8],
) -> Result<usize, String> {
    let n = dev.get_feature_report(buf).map_err(|e| {
        let msg = format!("HID get_feature_report failed ({summary}): {e}");
        record_packet(device_id, "ERR", channel, &msg, &[]);
        msg
    })?;
    record_packet(
        device_id,
        "RX",
        channel,
        format!("Feature RX: {summary}"),
        &buf[..n.min(buf.len())],
    );
    Ok(n)
}

pub fn read_timeout(
    dev: &HidDevice,
    device_id: &str,
    channel: &str,
    summary: &str,
    buf: &mut [u8],
    timeout_ms: i32,
) -> Result<usize, String> {
    let n = dev.read_timeout(buf, timeout_ms).map_err(|e| {
        let msg = format!("HID read_timeout failed ({summary}): {e}");
        record_packet(device_id, "ERR", channel, &msg, &[]);
        msg
    })?;
    if n > 0 {
        record_packet(device_id, "RX", channel, summary, &buf[..n]);
    }
    Ok(n)
}
