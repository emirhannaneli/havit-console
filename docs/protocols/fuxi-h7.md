# Havit Fuxi-H7 Gaming Headset — System Architecture & Protocol Specification

> **Target Hardware:** Havit Fuxi-H7 Quad-Mode Wireless Gaming Headset  
> **USB Identifiers:** `VID: 0x040B`, `PID: 0x0897`, Release: `0x0032` (Composite USB Audio + HID)  
> **Reverse Engineered From:** `XiiSoundPanel.exe` (Qt5 GUI), `devmonitor.exe` (263 KB x64), `para_protocol.exe` (35 KB x64), `XiiSoundAPO.dll` (335 KB x64), `cfg/*.json`, `config/config.txt`, `translations/ts_en.qm`  
> **Toolchain Evidence:** Ghidra 12.1.4 decompiler output via `morluto/rea` (Functions: `FUN_140011550`, `FUN_140011950`, `FUN_1400120c0`, `FUN_140012280`, `FUN_140012680`, `FUN_1400128b0`, `FUN_140001480`, `FUN_140001c10`).

---

## 1. USB Architecture & Endpoints

Under `VID_040B&PID_0897` (USB 2.4GHz Dongle / Wired Mode), the device exposes:

| Interface | Class / UsagePage | Function | Endpoints / Reports |
|---|---|---|---|
| `MI_00` | Audio Control (`0x01`) | CoreAudio Render & Capture | Stereo Speakers (`48 kHz / 16-bit`) & Mono Microphone |
| `MI_01` | Audio Streaming (Out) | Headphone Playback PCM | Isochronous Out |
| `MI_02` | Audio Streaming (In) | Microphone Capture PCM | Isochronous In |
| **`MI_03` & `col01`** | **Vendor HID `0xF100`** | **Hardware Link & Control** | **Out: 65 bytes (`WriteFile`), In: 13 bytes (`ReadFile`)** |
| `MI_03` & `col02` | Consumer Control `0x000C` | Media Volume & Mute Keys | In: 3 bytes |

---

## 2. Dual-Layer Software Architecture

Unlike keyboards where all features live in micro-controller firmware, high-end PC gaming headsets split features across two layers:

1. **Hardware / USB HID Layer (On-Headset / Dongle):**
   - Headset wireless connection status (2.4GHz connected vs searching).
   - Battery level & charging state.
   - Hardware button events (Mic mute button, 7.1 toggling).
2. **Audio DSP / APO Layer (Host Software):**
   - 10-band Graphic Equalizer (`jhq.json` & `config.txt`).
   - 7.1 Virtual Surround Sound speaker placement and rotation.
   - Environmental Audio / Reverb (Room sizes: Small, Middle, Large; Environments: Bathroom, Underwater, Music Hall).
   - Microphone ENC (Environmental Noise Cancellation) and Sidetone.
   - Magic Voice / Pitch Shift (Monster, Cartoon, Male, Female).

---

## 3. Hardware USB HID Protocol (`devmonitor.exe`)

The companion service communicates with `MI_03` & `col01` (`UsagePage 0xF100`) using overlapped I/O:

### 3.1 Device Identification & Handle Acquisition (`0x140011950`)
- Enumerate HID devices via `SetupDiGetClassDevsW` with HID GUID.
- Path match filter: `&MI_03` and `&col01`.
- Open with `CreateFileW(DevicePath, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, ..., OPEN_EXISTING, FILE_FLAG_OVERLAPPED)`.

### 3.2 Output Report (Host to Dongle) — 65 Bytes (`0x140012680`)
- `Report[0]`: Report ID = `0x00`.
- `Report[1]`: Packet Header = `0x08`.
- `Report[2]`: Checksum byte = $\sum_{i=2}^{62} \text{Byte}_i \pmod{256}$.
- `Report[3..62]`: Seeded pseudo-random validation payload.
- `Report[63..64]`: Bitmask index token.

### 3.3 Input Report (Dongle to Host) — 13 Bytes (`0x1400128b0`)
When polled with `ReadFile`, the dongle returns 13 bytes:
- **Link Checksum:** `Byte[5] ^ Byte[6] ^ Byte[7] == 0xC9`.
- **Decrypted Payload Token:**
  - `Byte[1] ^ Byte[7]`
  - `Byte[2] ^ (Byte[7] + 0x97)`
  - `Byte[3] ^ (Byte[7] + 0x2E)`
  - `Byte[4] ^ (Byte[7] - 0x3B)`
- **Wireless Status:** If link checksum is valid, the headset is wirelessly bonded and active.

---

## 4. Host Audio DSP & Equalizer (`para_protocol.exe` & `XiiSoundAPO.dll`)

### 4.1 Realtime Shared Memory IPC (`0x140001c10`)
Realtime audio DSP parameters are shared between UI and the audio engine via a named shared memory mapping:
- **Mapping Name:** `Global\{1344FDEC-5100-4B20-B329-25C6521464BE}`
- **Buffer Size:** `0x2000` (8,192 bytes).
- **Structure:**
  - `Offset 0..3`: Payload length `0x3A7` (935 bytes).
  - `Offset 4..938`: DSP Parameter block (EQ bands, 7.1 gains/delays, Reverb params).
  - Checksum: Standard CRC32 table verified at `0x140001c10`.

### 4.2 10-Band Graphic Equalizer Frequencies & dB Ranges
From `cfg/config.txt` and `cfg/jhq.json`:
- **Bands:** `30 Hz`, `60 Hz`, `120 Hz`, `250 Hz`, `500 Hz`, `1 kHz`, `2 kHz`, `4 kHz`, `8 kHz`, `16 kHz`.
- **dB Gain Range:** `-20 dB` to `+20 dB` (slider unit: `1 dB`).
- **Preamp:** Default `-6 dB`.

#### Stock EQ Profiles (`cfg/jhq.json`):
| Profile | 30Hz | 60Hz | 120Hz | 250Hz | 500Hz | 1kHz | 2kHz | 4kHz | 8kHz | 16kHz |
|---|---|---|---|---|---|---|---|---|---|---|
| **Default** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Bass** | +8 | +6 | +4 | +2 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Treble** | 0 | 0 | 0 | 0 | 0 | +2 | +4 | +6 | +8 | +8 |
| **Rock** | +5 | +3 | -1 | -2 | +1 | +3 | +5 | +6 | +7 | +7 |
| **Live** | -2 | 0 | +2 | +3 | +4 | +4 | +3 | +2 | +2 | +1 |
| **Dance** | +6 | +5 | +2 | 0 | -1 | +2 | +4 | +5 | +4 | +3 |

---

## 5. Clean-Room Implementation Strategy in `havit-console`

To ensure **100% portability, safety, and stability** on Windows without requiring users to install unstable third-party kernel APO drivers:

1. **Native Mode (Default, Zero-Driver):**
   - Uses Windows CoreAudio (`IMMDevice` / `IAudioEndpointVolume` in [windows_audio.rs](file:///D:/projects/havit-console/src-tauri/src/devices/fuxi_h7/windows_audio.rs)) to provide master volume, mute, separate L/R channel balance, microphone gain, and mic mute.
   - Communicates with USB HID `MI_03` (`0xF100`) to query connection status and wireless link health.
2. **Advanced DSP Mode (Optional Interop):**
   - Writes to `Global\{1344FDEC-5100-4B20-B329-25C6521464BE}` shared memory or EqualizerAPO `config.txt` if the user has the APO component installed, seamlessly applying 10-band EQ and 7.1 profiles.
