# Havit Ecosystem — OEM Protocol Family Matrix

To unify dozens of Havit keyboards, headsets, and mice into a single lightweight application (`havit-console`), devices are grouped by their underlying **OEM controller & protocol family** rather than duplicating one-off drivers per model.

## 1. Rongyuan / HFD `DeviceDriver` HID Family (`kb884l` Engine)
- **Installer Signature:** Inno Setup (`DeviceDriver.exe` + `device.xml` + `KeyboardLayout.xml`)
- **Transport:**
  - `UsagePage 0xFF13` (`Usage 0x0001`): 65-byte Feature/Output control channel (RGB lighting, per-key RGB, keymap, Fn layer, macros, clock sync)
  - `UsagePage 0xFF68` (`Usage 0x0061`): 4097-byte bulk Output channel (160×96 TFT screen GIF/image upload)
- **Confirmed / Candidate Havit Models:**
  - **KB884L Gaming Keyboard** (`VID 0x05AC`, `PID 0x024F`, ID `RKGK890`) — *Primary Verified Target*
  - KB884L Pro Gaming Keyboard
  - KB909L / KB912L Gaming Keyboard
  - KB08L PRO Gaming Keyboard
  - Astralforce-3 Gaming Keyboard

## 2. Weltrend / `XiiSound` USB Audio + HID Family (`fuxi_h7` Engine)
- **Installer Signature:** NSIS (`XiiSoundPanel.exe` + `devmonitor.exe` + `para_protocol.exe` + `XiiSoundAPO.dll`)
- **Transport:**
  - Windows CoreAudio (`MMDevice` Render & Capture endpoints: Volume, Mute, L/R Balance)
  - Vendor HID `UsagePage 0xF100` (65-byte Output / 13-byte Input on `MI_03`)
  - Host APO DSP / Equalizer & 7.1 Surround configuration
- **Confirmed / Candidate Havit Models:**
  - **Fuxi-H7 Quad-Mode Gaming Headset** (`VID 0x040B`, `PID 0x0897`) — *Primary Verified Target*
  - H2002d Pro Gaming Headset
  - Fuxi-H8 / Fuxi-H3 Plus / Huaxu-X3 Gaming Headsets

## 3. QMK / VIA Open Protocol Family (`via_qmk` Engine)
- **Signature:** Official Havit `.json` VIA v3 definitions (`qmk_lighting` / `qmk_rgb_matrix`)
- **Transport:** Standard QMK Raw HID (`UsagePage 0xFF60`, `Usage 0x0061`, 32-byte packets)
- **Confirmed Havit Models:**
  - **KB896L (`Cupid70`)** (`VID 0x342D`, `PID 0xE419`)
  - **Astralforce-1** (`VID 0xAA96`, `PID 0xAA52`, 6×15 matrix)
  - **Astralforce-2** (`VID 0xAA96`, `PID 0xAA53`, 5×15 matrix)

## 4. Modern Gaming Mouse Families (Roadmap Phase 2)
- **Electron / JS HID Family:** `GMS41 Gaming Mouse` (analyzable directly via `rea analyze-javascript-application`)
- **Houyi Pro / Max 8K Family:** `Houyi-M1`, `Houyi-M1 Pro`, `Houyi-M1 Max G 8K`, `Houyi-M2 Plus/Pro/M2C`, `Houyi-M3 Pro/M3C`, `Houyi-M4 / M4 Pro`, `M5 Pro`
