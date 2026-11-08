use serde::{Deserialize, Serialize};

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
        }
    }
}

#[cfg(target_os = "windows")]
mod win_impl {
    use super::FuxiAudioEndpointStatus;
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{
        eCapture, eRender, EDataFlow, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator,
        DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ,
    };

    unsafe fn find_fuxi_endpoint(flow: EDataFlow) -> Option<(IMMDevice, String)> {
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

    pub fn query_status() -> FuxiAudioEndpointStatus {
        let mut status = FuxiAudioEndpointStatus::default();
        unsafe {
            if let Some((dev, name)) = find_fuxi_endpoint(eRender) {
                status.speaker_found = true;
                status.speaker_name = name;
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

    pub fn set_speaker_volume(volume: u8, muted: bool) -> Result<(), String> {
        unsafe {
            let (dev, _) = find_fuxi_endpoint(eRender)
                .ok_or_else(|| "Fuxi-H7 speaker audio endpoint not found".to_string())?;
            let ep = dev
                .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
                .map_err(|e| format!("IAudioEndpointVolume failed: {e}"))?;
            let scalar = (volume.min(100) as f32) / 100.0;
            ep.SetMasterVolumeLevelScalar(scalar, std::ptr::null())
                .map_err(|e| format!("SetMasterVolumeLevelScalar failed: {e}"))?;
            ep.SetMute(muted, std::ptr::null())
                .map_err(|e| format!("SetMute failed: {e}"))?;
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
            let ch_count = ep.GetChannelCount().unwrap_or(0);
            if ch_count >= 2 {
                // Scale by the master level: Windows derives master = max(channels), so
                // writing absolute 0..100 values here would also change the volume.
                let master = ep
                    .GetMasterVolumeLevelScalar()
                    .map_err(|e| format!("GetMasterVolumeLevelScalar failed: {e}"))?;
                let left = master * (left.min(100) as f32) / 100.0;
                let right = master * (right.min(100) as f32) / 100.0;
                ep.SetChannelVolumeLevelScalar(0, left, std::ptr::null())
                    .map_err(|e| format!("SetChannelVolume L failed: {e}"))?;
                ep.SetChannelVolumeLevelScalar(1, right, std::ptr::null())
                    .map_err(|e| format!("SetChannelVolume R failed: {e}"))?;
            }
            Ok(())
        }
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
            ep.SetMute(muted, std::ptr::null())
                .map_err(|e| format!("SetMute failed: {e}"))?;
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
pub use win_impl::{query_status, set_channel_balance, set_mic_volume, set_speaker_volume};

#[cfg(not(target_os = "windows"))]
pub fn query_status() -> FuxiAudioEndpointStatus {
    FuxiAudioEndpointStatus::default()
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
