//! HID feature reports sent as raw USB control transfers (Linux only).
//!
//! The KB884L's 0xFF13 control interface (MI_03) has a single OUT interrupt endpoint and no
//! IN endpoint. Linux's usbhid refuses to bind such an interface ("couldn't find an input
//! interrupt endpoint"), so it never gets a hidraw node and hidapi cannot see it. Feature
//! reports travel over endpoint 0 anyway, so this sends the HID class requests
//! SET_REPORT / GET_REPORT directly through libusb.

use crate::transport::hid::FeatureReports;
use rusb::{DeviceHandle, GlobalContext};
use std::time::Duration;

const REQ_OUT_CLASS_INTERFACE: u8 = 0x21;
const REQ_IN_CLASS_INTERFACE: u8 = 0xA1;
const HID_GET_REPORT: u8 = 0x01;
const HID_SET_REPORT: u8 = 0x09;
const REPORT_TYPE_FEATURE: u16 = 0x03;
const TIMEOUT: Duration = Duration::from_millis(1000);

pub struct UsbFeatureDevice {
    handle: DeviceHandle<GlobalContext>,
    interface: u8,
}

impl UsbFeatureDevice {
    pub fn open(vid: u16, pid: u16, interface: u8) -> Result<Self, String> {
        let devices = rusb::devices().map_err(|e| format!("USB init failed: {e}"))?;
        let device = devices
            .iter()
            .find(|d| {
                d.device_descriptor()
                    .map(|desc| desc.vendor_id() == vid && desc.product_id() == pid)
                    .unwrap_or(false)
            })
            .ok_or_else(|| format!("USB device not found (VID=0x{vid:04X} PID=0x{pid:04X})"))?;

        let handle = device.open().map_err(|e| match e {
            rusb::Error::Access => format!(
                "No permission to open USB device 0x{vid:04X}:0x{pid:04X}; install the udev rule \
                 (see README, \"Linux udev rule\") and replug the device"
            ),
            e => format!("Failed to open USB device: {e}"),
        })?;
        // Nothing binds this interface today; should a kernel driver ever claim it, borrow it
        // and hand it back when the handle is dropped.
        let _ = handle.set_auto_detach_kernel_driver(true);
        handle
            .claim_interface(interface)
            .map_err(|e| format!("Failed to claim USB interface {interface}: {e}"))?;
        Ok(Self { handle, interface })
    }

    /// `wValue` for a feature report: report type in the high byte, report id in the low one.
    fn w_value(report_id: u8) -> u16 {
        (REPORT_TYPE_FEATURE << 8) | report_id as u16
    }
}

// Buffers follow hidapi: byte 0 is the report id, 0 meaning "no report ids" (then it is not
// sent on the wire).
impl FeatureReports for UsbFeatureDevice {
    fn feature_send(&self, buf: &[u8]) -> Result<(), String> {
        let id = *buf.first().ok_or("Empty feature report")?;
        let data = if id == 0 { &buf[1..] } else { buf };
        let n = self
            .handle
            .write_control(
                REQ_OUT_CLASS_INTERFACE,
                HID_SET_REPORT,
                Self::w_value(id),
                self.interface as u16,
                data,
                TIMEOUT,
            )
            .map_err(|e| e.to_string())?;
        if n != data.len() {
            return Err(format!("short SET_REPORT ({n} of {} bytes)", data.len()));
        }
        Ok(())
    }

    fn feature_get(&self, buf: &mut [u8]) -> Result<usize, String> {
        let id = *buf.first().ok_or("Empty feature report buffer")?;
        let (data, prefix) = if id == 0 { (&mut buf[1..], 1) } else { (&mut buf[..], 0) };
        let n = self
            .handle
            .read_control(
                REQ_IN_CLASS_INTERFACE,
                HID_GET_REPORT,
                Self::w_value(id),
                self.interface as u16,
                data,
                TIMEOUT,
            )
            .map_err(|e| e.to_string())?;
        Ok(n + prefix)
    }
}
