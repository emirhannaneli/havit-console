export type DeviceCategory = "keyboard" | "headset" | "mouse" | "microphone" | "unknown";

export interface DeviceCapabilities {
  rgb_lighting: boolean;
  per_key_rgb: boolean;
  keymap: boolean;
  macros: boolean;
  tft_screen: boolean;
  clock_sync: boolean;
  equalizer: boolean;
  surround_7_1: boolean;
  microphone_dsp: boolean;
  battery_status: boolean;
}

export type SupportLevel = "verified" | "experimental" | "unknown";

export interface DetectedDeviceStatus {
  id: string;
  model: string;
  name: string;
  category: DeviceCategory;
  /** Protocol family that owns the driver: "hfd", "xiisound", "qmk_via", "unknown". */
  family: string;
  support: SupportLevel;
  connected: boolean;
  connection_type: string;
  vid_hex: string;
  pid_hex: string;
  firmware_version: string | null;
  matched_interfaces: string[];
  capabilities: DeviceCapabilities;
}

export interface KeyDef {
  hid_code: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  key_index: number;
  light_index: number;
  fn_locked: boolean;
}

export interface ScreenSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  pixel_width: number;
  pixel_height: number;
}

export interface Kb884lPhysicalLayout {
  canvas_width: number;
  canvas_height: number;
  screen: ScreenSlot;
  keys: KeyDef[];
}

export interface Kb884lLightingConfig {
  mode: number;       // vendor mode id, 0..20
  brightness: number; // 0..5
  speed: number;      // 0..5
  direction: number;  // 0..3, meaning depends on mode
  r: number;
  g: number;
  b: number;
  random_color: boolean;
}

export interface Kb884lSettingsConfig {
  sleep_minutes: number;
  debounce_ms: number;
  win_lock: boolean;
  fn_toggle: boolean;
}

/** Last known keyboard config: from this app's last apply, else the Havit app's database. */
export interface Kb884lSavedState {
  lighting: Kb884lLightingConfig | null;
  settings: Kb884lSettingsConfig | null;
  lighting_source: "app" | "vendor" | null;
  settings_source: "app" | "vendor" | null;
}

/** How an image is placed on the 160×96 screen. */
export type LcdFit = "fit" | "fill" | "stretch";

export interface Kb884lScreenState {
  frames: LcdFramePreview[];
  source: "app" | "vendor";
  slot: number | null;
}

export interface LcdFramePreview {
  index: number;
  delay_ms: number;
  data_url: string;
  rgb565_be_base64: string;
}

export interface FuxiAudioEndpointStatus {
  speaker_found: boolean;
  speaker_name: string;
  speaker_volume: number; // 0..100
  speaker_muted: boolean;
  left_balance: number;   // 0..100
  right_balance: number;  // 0..100
  mic_found: boolean;
  mic_name: string;
  mic_volume: number;     // 0..100
  mic_muted: boolean;
}

export type RoomSize = "small" | "medium" | "large";

/** Host-side headset processing (the dongle stores none of it). */
export interface HeadsetDsp {
  bands: number[]; // 10 bands, -20..20 dB
  preamp: number;
  preset: string; // EQ preset name, "Custom" when bands were edited
  surround71: boolean;
  roomSize: RoomSize;
  enc: boolean;
  sidetone: boolean;
}

export interface KeyboardProfileData {
  kind: "kb884l";
  lighting: Kb884lLightingConfig;
  settings: Kb884lSettingsConfig;
}

export interface HeadsetProfileData {
  kind: "fuxi-h7";
  dsp: HeadsetDsp;
  audio: {
    speaker_volume: number;
    mic_volume: number;
    left_balance: number;
    right_balance: number;
  };
}

export type ProfileData = KeyboardProfileData | HeadsetProfileData;

export interface SavedProfile {
  id: string;
  name: string;
  device_id: string;
  updated_at: string;
  /** `ProfileData` for profiles saved by this version; older files may hold anything. */
  data: ProfileData | Record<string, unknown>;
}

export interface PacketLogEntry {
  id: number;
  timestamp: string;
  device_id: string;
  direction: string; // "TX" | "RX" | "INFO" | "ERR"
  channel: string;
  summary: string;
  byte_len: number;
  hex_preview: string;
}

/** A firmware package offered for a connected device. */
export interface FirmwareUpdate {
  device_id: string;
  device_name: string;
  current_version: string | null;
  version: string;
  size_bytes: number;
  released: string;
  notes: string[];
}

export interface FirmwareUpdateCheck {
  /** False while no firmware update source exists for this build. */
  supported: boolean;
  updates: FirmwareUpdate[];
}
