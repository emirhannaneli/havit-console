export type DeviceCategory = "keyboard" | "headset" | "mouse" | "microphone";

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

export interface DetectedDeviceStatus {
  id: string;
  model: string;
  name: string;
  category: DeviceCategory;
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
  mode: number;
  brightness: number; // 1..5
  speed: number;      // 1..5
  direction: number;  // 0..3
  r: number;
  g: number;
  b: number;
}

export interface Kb884lSettingsConfig {
  sleep_minutes: number;
  debounce_ms: number;
  win_lock: boolean;
  fn_toggle: boolean;
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

export interface SavedProfile {
  id: string;
  name: string;
  device_id: string;
  updated_at: string;
  data: Record<string, unknown>;
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
