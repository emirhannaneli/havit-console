import { invoke, isTauri } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import type {
  DetectedDeviceStatus,
  FirmwareUpdate,
  FirmwareUpdateCheck,
  FuxiAudioEndpointStatus,
  Kb884lLightingConfig,
  Kb884lPhysicalLayout,
  Kb884lSettingsConfig,
  Kb884lSavedState,
  Kb884lScreenState,
  LcdFit,
  LcdFramePreview,
  PacketLogEntry,
  SavedProfile,
} from "./types";

const mockDevices: DetectedDeviceStatus[] = [
  {
    id: "kb884l",
    model: "KB884L",
    name: "Havit KB884L RGB TFT Gaming Keyboard",
    category: "keyboard",
    connected: true,
    connection_type: "USB wired",
    vid_hex: "0x05AC",
    pid_hex: "0x024F",
    firmware_version: "1.20",
    matched_interfaces: ["MI_00 (0xFF13)", "MI_01 (0xFF68)"],
    capabilities: {
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
  {
    id: "fuxi-h7",
    model: "Fuxi-H7",
    name: "Havit Fuxi-H7 Quad-Mode Gaming Headset",
    category: "headset",
    connected: true,
    connection_type: "2.4 GHz wireless receiver",
    vid_hex: "0x040B",
    pid_hex: "0x0897",
    firmware_version: "0.32",
    matched_interfaces: ["MI_00 (Audio)", "MI_03 (0xF100)"],
    capabilities: {
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
];

export async function fetchConnectedDevices(): Promise<DetectedDeviceStatus[]> {
  if (isTauri()) {
    return invoke<DetectedDeviceStatus[]>("get_connected_devices");
  }
  return mockDevices;
}

export async function fetchKb884lLayout(): Promise<Kb884lPhysicalLayout> {
  if (isTauri()) {
    return invoke<Kb884lPhysicalLayout>("get_kb884l_layout_data");
  }
  return {
    canvas_width: 800,
    canvas_height: 300,
    screen: { x: 662, y: 25, w: 80, h: 48, pixel_width: 160, pixel_height: 96 },
    keys: [
      { hid_code: 0x29, label: "Esc", x: 18, y: 25, w: 30, h: 30, key_index: 0, light_index: 0, fn_locked: false },
      { hid_code: 0x3a, label: "F1", x: 60, y: 25, w: 30, h: 30, key_index: 1, light_index: 1, fn_locked: false },
      { hid_code: 0x3b, label: "F2", x: 100, y: 25, w: 30, h: 30, key_index: 2, light_index: 2, fn_locked: false },
      { hid_code: 0x3c, label: "F3", x: 140, y: 25, w: 30, h: 30, key_index: 3, light_index: 3, fn_locked: false },
      { hid_code: 0x3d, label: "F4", x: 180, y: 25, w: 30, h: 30, key_index: 4, light_index: 4, fn_locked: false },
      { hid_code: 0x3e, label: "F5", x: 226, y: 25, w: 30, h: 30, key_index: 5, light_index: 5, fn_locked: false },
      { hid_code: 0x3f, label: "F6", x: 266, y: 25, w: 30, h: 30, key_index: 6, light_index: 6, fn_locked: false },
      { hid_code: 0x40, label: "F7", x: 306, y: 25, w: 30, h: 30, key_index: 7, light_index: 7, fn_locked: false },
      { hid_code: 0x41, label: "F8", x: 346, y: 25, w: 30, h: 30, key_index: 8, light_index: 8, fn_locked: false },
      { hid_code: 0x42, label: "F9", x: 392, y: 25, w: 30, h: 30, key_index: 9, light_index: 9, fn_locked: false },
      { hid_code: 0x43, label: "F10", x: 432, y: 25, w: 30, h: 30, key_index: 10, light_index: 10, fn_locked: false },
      { hid_code: 0x44, label: "F11", x: 472, y: 25, w: 30, h: 30, key_index: 11, light_index: 11, fn_locked: false },
      { hid_code: 0x45, label: "F12", x: 512, y: 25, w: 30, h: 30, key_index: 12, light_index: 12, fn_locked: false },
      { hid_code: 0x49, label: "Ins", x: 558, y: 25, w: 30, h: 30, key_index: 13, light_index: 13, fn_locked: false },
      { hid_code: 0x4c, label: "Del", x: 598, y: 25, w: 30, h: 30, key_index: 14, light_index: 14, fn_locked: false },
      // Number row
      { hid_code: 0x35, label: "` ~", x: 18, y: 65, w: 30, h: 30, key_index: 15, light_index: 15, fn_locked: false },
      { hid_code: 0x1e, label: "1 !", x: 56, y: 65, w: 30, h: 30, key_index: 16, light_index: 16, fn_locked: false },
      { hid_code: 0x1f, label: "2 @", x: 94, y: 65, w: 30, h: 30, key_index: 17, light_index: 17, fn_locked: false },
      { hid_code: 0x20, label: "3 #", x: 132, y: 65, w: 30, h: 30, key_index: 18, light_index: 18, fn_locked: false },
      { hid_code: 0x21, label: "4 $", x: 170, y: 65, w: 30, h: 30, key_index: 19, light_index: 19, fn_locked: false },
      { hid_code: 0x22, label: "5 %", x: 208, y: 65, w: 30, h: 30, key_index: 20, light_index: 20, fn_locked: false },
      { hid_code: 0x23, label: "6 ^", x: 246, y: 65, w: 30, h: 30, key_index: 21, light_index: 21, fn_locked: false },
      { hid_code: 0x24, label: "7 &", x: 284, y: 65, w: 30, h: 30, key_index: 22, light_index: 22, fn_locked: false },
      { hid_code: 0x25, label: "8 *", x: 322, y: 65, w: 30, h: 30, key_index: 23, light_index: 23, fn_locked: false },
      { hid_code: 0x26, label: "9 (", x: 360, y: 65, w: 30, h: 30, key_index: 24, light_index: 24, fn_locked: false },
      { hid_code: 0x27, label: "0 )", x: 398, y: 65, w: 30, h: 30, key_index: 25, light_index: 25, fn_locked: false },
      { hid_code: 0x2d, label: "- _", x: 436, y: 65, w: 30, h: 30, key_index: 26, light_index: 26, fn_locked: false },
      { hid_code: 0x2e, label: "= +", x: 474, y: 65, w: 30, h: 30, key_index: 27, light_index: 27, fn_locked: false },
      { hid_code: 0x2a, label: "Backspace", x: 512, y: 65, w: 60, h: 30, key_index: 28, light_index: 28, fn_locked: false },
      { hid_code: 0x4a, label: "Home", x: 598, y: 65, w: 30, h: 30, key_index: 29, light_index: 29, fn_locked: false },
      // Tab row
      { hid_code: 0x2b, label: "Tab", x: 18, y: 105, w: 46, h: 30, key_index: 30, light_index: 30, fn_locked: false },
      { hid_code: 0x14, label: "Q", x: 72, y: 105, w: 30, h: 30, key_index: 31, light_index: 31, fn_locked: false },
      { hid_code: 0x1a, label: "W", x: 110, y: 105, w: 30, h: 30, key_index: 32, light_index: 32, fn_locked: false },
      { hid_code: 0x08, label: "E", x: 148, y: 105, w: 30, h: 30, key_index: 33, light_index: 33, fn_locked: false },
      { hid_code: 0x15, label: "R", x: 186, y: 105, w: 30, h: 30, key_index: 34, light_index: 34, fn_locked: false },
      { hid_code: 0x17, label: "T", x: 224, y: 105, w: 30, h: 30, key_index: 35, light_index: 35, fn_locked: false },
      { hid_code: 0x1c, label: "Y", x: 262, y: 105, w: 30, h: 30, key_index: 36, light_index: 36, fn_locked: false },
      { hid_code: 0x18, label: "U", x: 300, y: 105, w: 30, h: 30, key_index: 37, light_index: 37, fn_locked: false },
      { hid_code: 0x0c, label: "I", x: 338, y: 105, w: 30, h: 30, key_index: 38, light_index: 38, fn_locked: false },
      { hid_code: 0x12, label: "O", x: 376, y: 105, w: 30, h: 30, key_index: 39, light_index: 39, fn_locked: false },
      { hid_code: 0x13, label: "P", x: 414, y: 105, w: 30, h: 30, key_index: 40, light_index: 40, fn_locked: false },
      { hid_code: 0x2f, label: "[ {", x: 452, y: 105, w: 30, h: 30, key_index: 41, light_index: 41, fn_locked: false },
      { hid_code: 0x30, label: "] }", x: 490, y: 105, w: 30, h: 30, key_index: 42, light_index: 42, fn_locked: false },
      { hid_code: 0x31, label: "\\ |", x: 528, y: 105, w: 44, h: 30, key_index: 43, light_index: 43, fn_locked: false },
      { hid_code: 0x4b, label: "PgUp", x: 598, y: 105, w: 30, h: 30, key_index: 44, light_index: 44, fn_locked: false },
      // Caps row
      { hid_code: 0x39, label: "Caps", x: 18, y: 145, w: 56, h: 30, key_index: 45, light_index: 45, fn_locked: false },
      { hid_code: 0x04, label: "A", x: 82, y: 145, w: 30, h: 30, key_index: 46, light_index: 46, fn_locked: false },
      { hid_code: 0x16, label: "S", x: 120, y: 145, w: 30, h: 30, key_index: 47, light_index: 47, fn_locked: false },
      { hid_code: 0x07, label: "D", x: 158, y: 145, w: 30, h: 30, key_index: 48, light_index: 48, fn_locked: false },
      { hid_code: 0x09, label: "F", x: 196, y: 145, w: 30, h: 30, key_index: 49, light_index: 49, fn_locked: false },
      { hid_code: 0x0a, label: "G", x: 234, y: 145, w: 30, h: 30, key_index: 50, light_index: 50, fn_locked: false },
      { hid_code: 0x0b, label: "H", x: 272, y: 145, w: 30, h: 30, key_index: 51, light_index: 51, fn_locked: false },
      { hid_code: 0x0d, label: "J", x: 310, y: 145, w: 30, h: 30, key_index: 52, light_index: 52, fn_locked: false },
      { hid_code: 0x0e, label: "K", x: 348, y: 145, w: 30, h: 30, key_index: 53, light_index: 53, fn_locked: false },
      { hid_code: 0x0f, label: "L", x: 386, y: 145, w: 30, h: 30, key_index: 54, light_index: 54, fn_locked: false },
      { hid_code: 0x33, label: "; :", x: 424, y: 145, w: 30, h: 30, key_index: 55, light_index: 55, fn_locked: false },
      { hid_code: 0x34, label: "' \"", x: 462, y: 145, w: 30, h: 30, key_index: 56, light_index: 56, fn_locked: false },
      { hid_code: 0x28, label: "Enter", x: 500, y: 145, w: 72, h: 30, key_index: 57, light_index: 57, fn_locked: false },
      { hid_code: 0x4e, label: "PgDn", x: 598, y: 145, w: 30, h: 30, key_index: 58, light_index: 58, fn_locked: false },
      // Shift row
      { hid_code: 0xe1, label: "Shift", x: 18, y: 185, w: 74, h: 30, key_index: 59, light_index: 59, fn_locked: false },
      { hid_code: 0x1d, label: "Z", x: 100, y: 185, w: 30, h: 30, key_index: 60, light_index: 60, fn_locked: false },
      { hid_code: 0x1b, label: "X", x: 138, y: 185, w: 30, h: 30, key_index: 61, light_index: 61, fn_locked: false },
      { hid_code: 0x06, label: "C", x: 176, y: 185, w: 30, h: 30, key_index: 62, light_index: 62, fn_locked: false },
      { hid_code: 0x19, label: "V", x: 214, y: 185, w: 30, h: 30, key_index: 63, light_index: 63, fn_locked: false },
      { hid_code: 0x05, label: "B", x: 252, y: 185, w: 30, h: 30, key_index: 64, light_index: 64, fn_locked: false },
      { hid_code: 0x11, label: "N", x: 290, y: 185, w: 30, h: 30, key_index: 65, light_index: 65, fn_locked: false },
      { hid_code: 0x10, label: "M", x: 328, y: 185, w: 30, h: 30, key_index: 66, light_index: 66, fn_locked: false },
      { hid_code: 0x36, label: ", <", x: 366, y: 185, w: 30, h: 30, key_index: 67, light_index: 67, fn_locked: false },
      { hid_code: 0x37, label: ". >", x: 404, y: 185, w: 30, h: 30, key_index: 68, light_index: 68, fn_locked: false },
      { hid_code: 0x38, label: "/ ?", x: 442, y: 185, w: 30, h: 30, key_index: 69, light_index: 69, fn_locked: false },
      { hid_code: 0xe5, label: "Shift", x: 480, y: 185, w: 64, h: 30, key_index: 70, light_index: 70, fn_locked: false },
      { hid_code: 0x52, label: "↑", x: 554, y: 185, w: 30, h: 30, key_index: 71, light_index: 71, fn_locked: false },
      { hid_code: 0x4d, label: "End", x: 598, y: 185, w: 30, h: 30, key_index: 72, light_index: 72, fn_locked: false },
      // Bottom row
      { hid_code: 0xe0, label: "Ctrl", x: 18, y: 225, w: 42, h: 30, key_index: 73, light_index: 73, fn_locked: false },
      { hid_code: 0xe3, label: "Win", x: 68, y: 225, w: 42, h: 30, key_index: 74, light_index: 74, fn_locked: false },
      { hid_code: 0xe2, label: "Alt", x: 118, y: 225, w: 42, h: 30, key_index: 75, light_index: 75, fn_locked: false },
      { hid_code: 0x2c, label: "Space", x: 168, y: 225, w: 236, h: 30, key_index: 76, light_index: 76, fn_locked: false },
      { hid_code: 0xe6, label: "Alt", x: 412, y: 225, w: 42, h: 30, key_index: 77, light_index: 77, fn_locked: false },
      { hid_code: 0xaf, label: "Fn", x: 462, y: 225, w: 42, h: 30, key_index: 78, light_index: 78, fn_locked: true },
      { hid_code: 0xe4, label: "Ctrl", x: 512, y: 225, w: 42, h: 30, key_index: 79, light_index: 79, fn_locked: false },
      { hid_code: 0x50, label: "←", x: 564, y: 225, w: 30, h: 30, key_index: 80, light_index: 80, fn_locked: false },
      { hid_code: 0x51, label: "↓", x: 602, y: 225, w: 30, h: 30, key_index: 81, light_index: 81, fn_locked: false },
      { hid_code: 0x4f, label: "→", x: 640, y: 225, w: 30, h: 30, key_index: 82, light_index: 82, fn_locked: false },
    ],
  };
}

export async function syncKb884lClock(slotId = 0): Promise<string> {
  if (isTauri()) {
    return invoke<string>("kb884l_sync_time", { slotId });
  }
  return "Simulated: Clock synced to current system time.";
}

export async function applyKb884lLighting(cfg: Kb884lLightingConfig): Promise<string> {
  if (isTauri()) {
    return invoke<string>("kb884l_apply_lighting_cfg", { cfg });
  }
  return `Simulated: Applied lighting mode ${cfg.mode}`;
}

export async function loadKb884lState(): Promise<Kb884lSavedState> {
  if (isTauri()) {
    return invoke<Kb884lSavedState>("kb884l_load_state");
  }
  return { lighting: null, settings: null, lighting_source: null, settings_source: null };
}

export async function applyKb884lSettings(cfg: Kb884lSettingsConfig): Promise<string> {
  if (isTauri()) {
    return invoke<string>("kb884l_apply_settings_cfg", { cfg });
  }
  return "Simulated: Applied hardware settings";
}

export async function previewKb884lMediaFile(
  filePath: string,
  fit: LcdFit = "fit"
): Promise<LcdFramePreview[]> {
  if (isTauri()) {
    return invoke<LcdFramePreview[]>("kb884l_preview_file", { filePath, fit });
  }
  return [];
}

export async function uploadKb884lMedia(filePath: string, slotId = 0, fit: LcdFit = "fit"): Promise<string> {
  if (isTauri()) {
    return invoke<string>("kb884l_upload_media_file", { filePath, slotId, fit });
  }
  return "Simulated: Uploaded media frames to LCD";
}

/** Last known screen animation: this app's last upload, else the Havit app's newest one. */
export async function loadKb884lScreen(): Promise<Kb884lScreenState | null> {
  if (isTauri()) {
    return invoke<Kb884lScreenState | null>("kb884l_load_screen");
  }
  return null;
}

export async function saveTempMediaFile(base64Data: string, fileName: string): Promise<string> {
  if (isTauri()) {
    return invoke<string>("save_temp_media", { base64Data, fileName });
  }
  return fileName;
}

export async function pickMediaFile(): Promise<string | null> {
  if (isTauri()) {
    const selected = await openDialog({
      multiple: false,
      filters: [
        {
          name: "Images & Animations",
          extensions: ["gif", "png", "jpg", "jpeg", "bmp", "webp"],
        },
      ],
    });
    return (selected as string) || null;
  }
  return null;
}

export async function fetchFuxiStatus(): Promise<FuxiAudioEndpointStatus> {
  if (isTauri()) {
    return invoke<FuxiAudioEndpointStatus>("fuxi_get_status");
  }
  return {
    speaker_found: true,
    speaker_name: "Havit Fuxi-H7 Audio",
    speaker_volume: 72,
    speaker_muted: false,
    left_balance: 100,
    right_balance: 100,
    mic_found: true,
    mic_name: "Havit Fuxi-H7 Mic",
    mic_volume: 85,
    mic_muted: false,
  };
}

export async function setFuxiSpeaker(volume: number, muted: boolean): Promise<void> {
  if (isTauri()) {
    return invoke("fuxi_set_speaker", { volume, muted });
  }
}

export async function setFuxiBalance(left: number, right: number): Promise<void> {
  if (isTauri()) {
    return invoke("fuxi_set_balance", { left, right });
  }
}

export async function setFuxiMic(volume: number, muted: boolean): Promise<void> {
  if (isTauri()) {
    return invoke("fuxi_set_mic", { volume, muted });
  }
}

export async function fetchProfiles(deviceId?: string): Promise<SavedProfile[]> {
  if (isTauri()) {
    return invoke<SavedProfile[]>("profile_list", { deviceId });
  }
  const raw = localStorage.getItem("havit_profiles");
  return raw ? JSON.parse(raw) : [];
}

export async function saveProfileToStorage(profile: SavedProfile): Promise<SavedProfile> {
  if (isTauri()) {
    return invoke<SavedProfile>("profile_save", { profile });
  }
  const profiles = await fetchProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  localStorage.setItem("havit_profiles", JSON.stringify(profiles));
  return profile;
}

export async function deleteProfileFromStorage(profileId: string): Promise<void> {
  if (isTauri()) {
    return invoke("profile_delete", { profileId });
  }
  const profiles = await fetchProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  localStorage.setItem("havit_profiles", JSON.stringify(filtered));
}

export async function fetchPacketLogs(): Promise<PacketLogEntry[]> {
  if (isTauri()) {
    return invoke<PacketLogEntry[]>("packet_log_list");
  }
  return [];
}

export async function clearPacketLogs(): Promise<void> {
  if (isTauri()) {
    return invoke("packet_log_clear");
  }
}

// ---------------------------------------------------------------------------
// Firmware updates
// No update source or flashing backend exists yet. In the desktop app the check
// reports `supported: false`; the browser preview returns a sample package so the
// update UI can be reviewed.
// ---------------------------------------------------------------------------

export async function checkFirmwareUpdates(): Promise<FirmwareUpdateCheck> {
  if (isTauri()) {
    return { supported: false, updates: [] };
  }
  return {
    supported: true,
    updates: [
      {
        device_id: "kb884l",
        device_name: "KB884L Keyboard",
        current_version: "preview-1.0",
        version: "preview-1.1",
        size_bytes: 1_200_000,
        released: "Preview",
        notes: ["Preview mode: this is a sample release note."],
      },
    ],
  };
}

export async function installFirmwareUpdate(
  update: FirmwareUpdate,
  onProgress: (pct: number) => void
): Promise<void> {
  if (isTauri()) {
    throw new Error(`Firmware installation for ${update.device_name} is not supported in this version.`);
  }
  for (let pct = 0; pct <= 100; pct += 4) {
    onProgress(pct);
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** Opens a link in the system browser (new tab in the browser preview). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
