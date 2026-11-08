use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FuxiAudioPeaks {
    pub speaker_peak: f32,       // 0.0 .. 1.0 (combined peak)
    pub speaker_left: f32,       // 0.0 .. 1.0
    pub speaker_right: f32,      // 0.0 .. 1.0
    pub mic_peak: f32,           // 0.0 .. 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuxiAudioEndpointStatus {
    pub speaker_found: bool,
    pub speaker_name: String,
    pub speaker_volume: u8,     // 0..100
    pub speaker_muted: bool,
    pub left_balance: u8,       // 0..100
    pub right_balance: u8,      // 0..100
    pub mic_found: bool,
    pub mic_name: String,
    pub mic_volume: u8,         // 0..100
    pub mic_muted: bool,
    pub connection_mode: String,   // "dongle" | "bluetooth" | "wired" | "unknown"
    pub battery_level: Option<u8>, // 0..100
    pub is_charging: Option<bool>,
    pub power_status: String,
}

impl Default for FuxiAudioEndpointStatus {
    fn default() -> Self {
        Self {
            speaker_found: false,
            speaker_name: "Fuxi-H7 (Disconnected)".to_string(),
            speaker_volume: 75,
            speaker_muted: false,
            left_balance: 100,
            right_balance: 100,
            mic_found: false,
            mic_name: "Fuxi-H7 Mic (Disconnected)".to_string(),
            mic_volume: 85,
            mic_muted: false,
            connection_mode: "unknown".to_string(),
            battery_level: None,
            is_charging: None,
            power_status: "disconnected".to_string(),
        }
    }
}

#[cfg(target_os = "windows")]
mod win_impl {
    use super::{FuxiAudioEndpointStatus, FuxiAudioPeaks};
    use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU32, AtomicU64, Ordering};
    use std::time::Duration;
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
    use windows::Win32::Media::Audio::Endpoints::{IAudioEndpointVolume, IAudioMeterInformation};
    use windows::Win32::Media::Audio::{
        eCapture, eMultimedia, eRender, EDataFlow, IAudioCaptureClient, IAudioClient,
        IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_NOPERSIST, DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ,
    };

    static LAST_PEAK_QUERY_MS: AtomicU64 = AtomicU64::new(0);
    static CAPTURE_RUNNING: AtomicBool = AtomicBool::new(false);
    static LATEST_MIC_PEAK_BITS: AtomicU32 = AtomicU32::new(0);

    fn ensure_capture_worker() {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        LAST_PEAK_QUERY_MS.store(now_ms, Ordering::Relaxed);

        if CAPTURE_RUNNING
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        std::thread::Builder::new()
            .name("havit-mic-capture".into())
            .spawn(|| {
                unsafe {
                    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
                    let endpoint = find_endpoint_with_fallback(eCapture);
                    let Some((dev, _name)) = endpoint else {
                        CAPTURE_RUNNING.store(false, Ordering::SeqCst);
                        return;
                    };

                    let Ok(client) = dev.Activate::<IAudioClient>(CLSCTX_ALL, None) else {
                        CAPTURE_RUNNING.store(false, Ordering::SeqCst);
                        return;
                    };

                    let Ok(format_ptr) = client.GetMixFormat() else {
                        CAPTURE_RUNNING.store(false, Ordering::SeqCst);
                        return;
                    };

                    let init_res = client.Initialize(
                        AUDCLNT_SHAREMODE_SHARED,
                        AUDCLNT_STREAMFLAGS_NOPERSIST,
                        100_000,
                        0,
                        format_ptr,
                        None,
                    );
                    let _ = CoTaskMemFree(Some(format_ptr.cast()));

                    if init_res.is_err() || client.Start().is_err() {
                        CAPTURE_RUNNING.store(false, Ordering::SeqCst);
                        return;
                    }

                    let capture_client: Result<IAudioCaptureClient, _> = client.GetService();
                    let meter: Result<IAudioMeterInformation, _> = dev.Activate(CLSCTX_ALL, None);

                    while CAPTURE_RUNNING.load(Ordering::Relaxed) {
                        // Drain capture buffer so WASAPI stream stays flowing smoothly
                        if let Ok(ref cap) = capture_client {
                            let mut data = std::ptr::null_mut();
                            let mut frames = 0u32;
                            let mut flags = 0u32;
                            while cap.GetBuffer(&mut data, &mut frames, &mut flags, None, None).is_ok() {
                                if frames == 0 {
                                    break;
                                }
                                let _ = cap.ReleaseBuffer(frames);
                            }
                        }

                        // Read hardware/WASAPI peak level
                        if let Ok(ref m) = meter {
                            if let Ok(peak) = m.GetPeakValue() {
                                let clamped = peak.clamp(0.0, 1.0);
                                LATEST_MIC_PEAK_BITS.store(clamped.to_bits(), Ordering::Relaxed);
                            }
                        }

                        std::thread::sleep(Duration::from_millis(30));

                        let now = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64;
                        let last = LAST_PEAK_QUERY_MS.load(Ordering::Relaxed);
                        if now.saturating_sub(last) > 2500 {
                            // User left headset view or stopped polling: release mic stream
                            break;
                        }
                    }

                    let _ = client.Stop();
                    LATEST_MIC_PEAK_BITS.store(0, Ordering::Relaxed);
                    CAPTURE_RUNNING.store(false, Ordering::SeqCst);
                }
            })
            .ok();
    }

    pub(crate) unsafe fn find_fuxi_endpoint(flow: EDataFlow) -> Option<(IMMDevice, String)> {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let collection = enumerator
            .EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE)
            .ok()?;
        let count = collection.GetCount().ok()?;
        for i in 0..count {
            let Ok(dev) = collection.Item(i) else {
                continue;
            };
            let Ok(props) = dev.OpenPropertyStore(STGM_READ) else {
                continue;
            };
            let Ok(val) = props.GetValue(&PKEY_Device_FriendlyName) else {
                continue;
            };
            let name = val.to_string();
            let lower = name.to_ascii_lowercase();
            if lower.contains("fuxi") || lower.contains("havit") {
                return Some((dev, name));
            }
        }
        None
    }

    static TARGET_BALANCE: AtomicU16 = AtomicU16::new(0x6464); // 100% Left, 100% Right
    static TARGET_BALANCE_INITIALIZED: AtomicBool = AtomicBool::new(false);

    pub fn query_status() -> FuxiAudioEndpointStatus {
        let mut status = FuxiAudioEndpointStatus::default();
        unsafe {
            if let Some((dev, name)) = find_fuxi_endpoint(eRender) {
                status.speaker_found = true;
                status.speaker_name = name;

                // Detect connection mode (Dongle / Bluetooth / Wired) and power status
                let pkey_path = windows::Win32::UI::Shell::PropertiesSystem::PROPERTYKEY {
                    fmtid: windows::core::GUID::from_u128(0xB3F8FA53_0004_438E_9003_51A46E139BFC),
                    pid: 2,
                };
                if let Ok(props) = dev.OpenPropertyStore(STGM_READ) {
                    if let Ok(val) = props.GetValue(&pkey_path) {
                        let path = val.to_string();
                        let upper = path.to_ascii_uppercase();
                        if upper.contains("BTHENUM")
                            || upper.contains("BTHHFENUM")
                            || upper.contains("BTH_")
                            || upper.contains("BLUETOOTH")
                        {
                            status.connection_mode = "bluetooth".to_string();
                            status.power_status = "bluetooth".to_string();
                            status.battery_level = query_bth_battery(&upper);
                        } else if upper.contains("VID_040B&PID_0897")
                            || upper.contains("VID_040B&PID_0896")
                            || upper.contains("VID_040B&PID_0898")
                        {
                            status.connection_mode = "dongle".to_string();
                            status.power_status = "dongle".to_string();
                        } else if upper.contains("USB") {
                            status.connection_mode = "wired".to_string();
                            status.is_charging = Some(true);
                            status.power_status = "wired".to_string();
                        }
                    }
                }

                if let Ok(ep) = dev.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
                    if let Ok(v) = ep.GetMasterVolumeLevelScalar() {
                        status.speaker_volume = (v * 100.0).round().clamp(0.0, 100.0) as u8;
                    }
                    if let Ok(m) = ep.GetMute() {
                        status.speaker_muted = m.as_bool();
                    }
                    // Channel scalars are absolute; balance is each channel relative to
                    // the louder one (100 = unattenuated), so it survives master changes.
                    if let Ok(ch_count) = ep.GetChannelCount() {
                        if ch_count >= 2 {
                            if let (Ok(l), Ok(r)) = (
                                ep.GetChannelVolumeLevelScalar(0),
                                ep.GetChannelVolumeLevelScalar(1),
                            ) {
                                let peak = l.max(r);
                                if peak > 0.0 {
                                    status.left_balance = (l / peak * 100.0).round().clamp(0.0, 100.0) as u8;
                                    status.right_balance = (r / peak * 100.0).round().clamp(0.0, 100.0) as u8;
                                    if !TARGET_BALANCE_INITIALIZED.load(Ordering::Relaxed) {
                                        TARGET_BALANCE.store(
                                             ((status.left_balance as u16) << 8) | (status.right_balance as u16),
                                             Ordering::Relaxed,
                                        );
                                        TARGET_BALANCE_INITIALIZED.store(true, Ordering::Relaxed);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if let Some((dev, name)) = find_fuxi_endpoint(eCapture) {
                status.mic_found = true;
                status.mic_name = name;
                if let Ok(ep) = dev.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
                    if let Ok(v) = ep.GetMasterVolumeLevelScalar() {
                        status.mic_volume = (v * 100.0).round().clamp(0.0, 100.0) as u8;
                    }
                    if let Ok(m) = ep.GetMute() {
                        status.mic_muted = m.as_bool();
                    }
                }
            }
        }
        status
    }

    fn query_bth_battery(path: &str) -> Option<u8> {
        let chars: Vec<char> = path.chars().collect();
        for window in chars.windows(12) {
            if window.iter().all(|c| c.is_ascii_hexdigit()) {
                let s: String = window.iter().collect();
                if s != "000000000000" && s != "FFFFFFFFFFFF" {
                    // Try to read battery percent from registry
                    // Registry key: HKLM\SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters\Devices\<mac>
                    // or standard Windows PnP location
                    return None;
                }
            }
        }
        None
    }

    pub fn set_speaker_volume(volume: u8, muted: bool) -> Result<(), String> {
        unsafe {
            let (dev, _) = find_fuxi_endpoint(eRender)
                .ok_or_else(|| "Fuxi-H7 speaker audio endpoint not found".to_string())?;
            let ep = dev
                .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
                .map_err(|e| format!("IAudioEndpointVolume failed: {e}"))?;
            let scalar = ((volume.min(100) as f32) / 100.0).clamp(0.0, 1.0);

            let bal = TARGET_BALANCE.load(Ordering::Relaxed);
            let left_pct = ((bal >> 8) & 0xFF) as u8;
            let right_pct = (bal & 0xFF) as u8;

            if let Ok(ch_count) = ep.GetChannelCount() {
                if ch_count >= 2 {
                    if left_pct >= 100 && right_pct >= 100 {
                        // Centered: explicitly set identical scalar to both channels, avoiding any drift
                        let _ = ep.SetChannelVolumeLevelScalar(0, scalar, std::ptr::null());
                        let _ = ep.SetChannelVolumeLevelScalar(1, scalar, std::ptr::null());
                    } else {
                        let l_val = (scalar * (left_pct.min(100) as f32 / 100.0)).clamp(0.0, 1.0);
                        let r_val = (scalar * (right_pct.min(100) as f32 / 100.0)).clamp(0.0, 1.0);
                        let _ = ep.SetChannelVolumeLevelScalar(0, l_val, std::ptr::null());
                        let _ = ep.SetChannelVolumeLevelScalar(1, r_val, std::ptr::null());
                    }
                } else {
                    let _ = ep.SetMasterVolumeLevelScalar(scalar, std::ptr::null());
                }
            } else {
                let _ = ep.SetMasterVolumeLevelScalar(scalar, std::ptr::null());
            }

            // Only change mute when it differs to avoid DAC clicks/crackling ("cızırdama")
            if let Ok(current_mute) = ep.GetMute() {
                if current_mute.as_bool() != muted {
                    let _ = ep.SetMute(muted, std::ptr::null());
                }
            }
            Ok(())
        }
    }

    pub fn set_channel_balance(left: u8, right: u8) -> Result<(), String> {
        unsafe {
            let (dev, _) = find_fuxi_endpoint(eRender)
                .ok_or_else(|| "Fuxi-H7 speaker audio endpoint not found".to_string())?;
            let ep = dev
                .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
                .map_err(|e| format!("IAudioEndpointVolume failed: {e}"))?;

            TARGET_BALANCE.store(((left as u16) << 8) | (right as u16), Ordering::Relaxed);
            TARGET_BALANCE_INITIALIZED.store(true, Ordering::Relaxed);

            let ch_count = ep.GetChannelCount().unwrap_or(0);
            if ch_count >= 2 {
                let master = ep.GetMasterVolumeLevelScalar().unwrap_or(0.5);
                if left >= 100 && right >= 100 {
                    let _ = ep.SetChannelVolumeLevelScalar(0, master, std::ptr::null());
                    let _ = ep.SetChannelVolumeLevelScalar(1, master, std::ptr::null());
                } else {
                    let l_val = (master * (left.min(100) as f32) / 100.0).clamp(0.0, 1.0);
                    let r_val = (master * (right.min(100) as f32) / 100.0).clamp(0.0, 1.0);
                    let _ = ep.SetChannelVolumeLevelScalar(0, l_val, std::ptr::null());
                    let _ = ep.SetChannelVolumeLevelScalar(1, r_val, std::ptr::null());
                }
            }
            Ok(())
        }
    }

    pub(crate) unsafe fn find_endpoint_with_fallback(flow: EDataFlow) -> Option<(IMMDevice, String)> {
        if let Some(res) = find_fuxi_endpoint(flow) {
            return Some(res);
        }
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let dev = enumerator.GetDefaultAudioEndpoint(flow, eMultimedia).ok()?;
        Some((dev, "Default".to_string()))
    }

    pub fn query_peaks() -> FuxiAudioPeaks {
        ensure_capture_worker();
        let mut peaks = FuxiAudioPeaks::default();
        unsafe {
            if let Some((dev, _)) = find_endpoint_with_fallback(eRender) {
                if let Ok(meter) = dev.Activate::<IAudioMeterInformation>(CLSCTX_ALL, None) {
                    if let Ok(peak) = meter.GetPeakValue() {
                        peaks.speaker_peak = peak.clamp(0.0, 1.0);
                    }
                    let mut channels = [0.0f32; 2];
                    if meter.GetChannelsPeakValues(&mut channels).is_ok() {
                        peaks.speaker_left = channels[0].clamp(0.0, 1.0);
                        peaks.speaker_right = channels[1].clamp(0.0, 1.0);
                    } else {
                        peaks.speaker_left = peaks.speaker_peak;
                        peaks.speaker_right = peaks.speaker_peak;
                    }
                }
            }
        }
        peaks.mic_peak = f32::from_bits(LATEST_MIC_PEAK_BITS.load(Ordering::Relaxed));
        peaks
    }

    pub fn set_mic_volume(volume: u8, muted: bool) -> Result<(), String> {
        unsafe {
            let (dev, _) = find_fuxi_endpoint(eCapture)
                .ok_or_else(|| "Fuxi-H7 microphone audio endpoint not found".to_string())?;
            let ep = dev
                .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
                .map_err(|e| format!("IAudioEndpointVolume failed: {e}"))?;
            let scalar = (volume.min(100) as f32) / 100.0;
            ep.SetMasterVolumeLevelScalar(scalar, std::ptr::null())
                .map_err(|e| format!("SetMasterVolumeLevelScalar failed: {e}"))?;
            if let Ok(current_mute) = ep.GetMute() {
                if current_mute.as_bool() != muted {
                    ep.SetMute(muted, std::ptr::null())
                        .map_err(|e| format!("SetMute failed: {e}"))?;
                }
            }
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
pub use win_impl::{
    query_peaks, query_status, set_channel_balance, set_mic_volume, set_speaker_volume,
};

#[cfg(not(target_os = "windows"))]
pub fn query_status() -> FuxiAudioEndpointStatus {
    FuxiAudioEndpointStatus::default()
}
#[cfg(not(target_os = "windows"))]
pub fn query_peaks() -> FuxiAudioPeaks {
    FuxiAudioPeaks::default()
}
#[cfg(not(target_os = "windows"))]
pub fn set_speaker_volume(_volume: u8, _muted: bool) -> Result<(), String> {
    Err("Native CoreAudio control is supported on Windows".to_string())
}
#[cfg(not(target_os = "windows"))]
pub fn set_channel_balance(_left: u8, _right: u8) -> Result<(), String> {
    Err("Native CoreAudio control is supported on Windows".to_string())
}
#[cfg(not(target_os = "windows"))]
pub fn set_mic_volume(_volume: u8, _muted: bool) -> Result<(), String> {
    Err("Native CoreAudio control is supported on Windows".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires a connected Fuxi-H7 headset; run with `cargo test -- --ignored`"]
    fn dump_fuxi_endpoint_properties() {
        let status = query_status();
        println!("QUERY STATUS RESULT: {:?}", status);
        assert!(status.speaker_found);
        assert_eq!(status.connection_mode, "dongle");
        assert_eq!(status.power_status, "dongle");
    }
}
