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

/// Device path of the first interface matching VID/PID/usage page.
pub fn find_hid_path(vid: u16, pid: u16, usage_page: u16) -> Result<std::ffi::CString, String> {
    let api = HidApi::new().map_err(|e| format!("HID init failed: {e}"))?;
    let path = api
        .device_list()
        .find(|d| d.vendor_id() == vid && d.product_id() == pid && d.usage_page() == usage_page)
        .map(|d| d.path().to_owned());
    path.ok_or_else(|| {
            format!(
                "HID interface not found (VID=0x{:04X} PID=0x{:04X} UsagePage=0x{:04X})",
                vid, pid, usage_page
            )
        })
}

/// Output-report writer with a caller-chosen timeout.
///
/// hidapi's `write` gives up after a fixed 1 s and leaves the overlapped write pending.
/// Some devices (e.g. the KB884L while it erases flash before the first LCD chunk) need
/// longer, so this opens its own overlapped handle and waits up to `timeout_ms`.
#[cfg(windows)]
pub struct LongWriteHid {
    handle: windows::Win32::Foundation::HANDLE,
    event: windows::Win32::Foundation::HANDLE,
}

#[cfg(windows)]
impl LongWriteHid {
    pub fn open(path: &std::ffi::CStr) -> Result<Self, String> {
        use windows::core::PCSTR;
        use windows::Win32::Foundation::{GENERIC_READ, GENERIC_WRITE, HANDLE};
        use windows::Win32::Storage::FileSystem::{
            CreateFileA, FILE_FLAG_OVERLAPPED, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
        };
        use windows::Win32::System::Threading::CreateEventW;
        unsafe {
            let handle = CreateFileA(
                PCSTR(path.as_ptr() as *const u8),
                (GENERIC_READ | GENERIC_WRITE).0,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                FILE_FLAG_OVERLAPPED,
                HANDLE::default(),
            )
            .map_err(|e| format!("Failed to open HID interface for writing: {e}"))?;
            let event = CreateEventW(None, true, false, None).map_err(|e| {
                let _ = windows::Win32::Foundation::CloseHandle(handle);
                format!("CreateEvent failed: {e}")
            })?;
            Ok(Self { handle, event })
        }
    }

    pub fn write(
        &self,
        device_id: &str,
        channel: &str,
        summary: &str,
        buf: &[u8],
        timeout_ms: u32,
    ) -> Result<usize, String> {
        use windows::Win32::Foundation::{ERROR_IO_PENDING, WAIT_OBJECT_0};
        use windows::Win32::Storage::FileSystem::WriteFile;
        use windows::Win32::System::Threading::{ResetEvent, WaitForSingleObject};
        use windows::Win32::System::IO::{CancelIo, GetOverlappedResult, OVERLAPPED};

        record_packet(device_id, "TX", channel, summary, buf);
        let fail = |msg: String| {
            record_packet(device_id, "ERR", channel, &msg, &[]);
            msg
        };
        unsafe {
            let _ = ResetEvent(self.event);
            let mut ov = OVERLAPPED { hEvent: self.event, ..Default::default() };
            if let Err(e) = WriteFile(self.handle, Some(buf), None, Some(&mut ov)) {
                if e.code() != ERROR_IO_PENDING.to_hresult() {
                    return Err(fail(format!("HID write failed ({summary}): {e}")));
                }
            }
            if WaitForSingleObject(self.event, timeout_ms) != WAIT_OBJECT_0 {
                // Cancel and wait for the cancellation so `ov` and `buf` outlive the I/O.
                let _ = CancelIo(self.handle);
                let mut n = 0u32;
                let _ = GetOverlappedResult(self.handle, &ov, &mut n, true);
                return Err(fail(format!(
                    "HID write timed out after {timeout_ms} ms ({summary})"
                )));
            }
            let mut written = 0u32;
            GetOverlappedResult(self.handle, &ov, &mut written, false)
                .map_err(|e| fail(format!("HID write failed ({summary}): {e}")))?;
            Ok(written as usize)
        }
    }
}

#[cfg(windows)]
impl Drop for LongWriteHid {
    fn drop(&mut self) {
        unsafe {
            let _ = windows::Win32::Foundation::CloseHandle(self.handle);
            let _ = windows::Win32::Foundation::CloseHandle(self.event);
        }
    }
}
