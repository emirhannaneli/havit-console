<div align="center">

<img src="src-tauri/icons/icon.png" width="112" height="112" alt="Havit Console icon: a slanted orange H on a dark squircle">

# Havit Console

**A single, lightweight, open-source control center for Havit gaming peripherals.**

[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg)](LICENSE)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![CI](https://github.com/emirhannaneli/havit-console/actions/workflows/ci.yml/badge.svg)](https://github.com/emirhannaneli/havit-console/actions/workflows/ci.yml)

</div>

---

## Why

The vendor software is closed source, uses hundreds of megabytes of RAM in the background and
needs one program per device. Havit Console replaces it with one small app built with
**Tauri v2 + Rust + React**, based on a clean-room reverse engineering of the vendor
protocols ([`morluto/rea`](https://github.com/morluto/rea) + Ghidra).

- **Light:** sits in the system tray, no background services.
- **Private:** no telemetry, no account. Settings go to the device and to local JSON profiles.
- **Direct:** talks to the hardware over USB HID and Windows CoreAudio; no extra drivers.
- **Independent:** a community project, not affiliated with Havit.

---

## Supported devices

### Havit KB884L RGB TFT gaming keyboard
`VID 0x05AC`, `PID 0x024F` (HFD RKGK890 OEM, SONiX MCU)

- **Lighting:** all 20 vendor effects with color, random-color mode, brightness, speed and
  direction. The keyboard image previews the selected effect live.
- **160×96 screen:** upload GIF, PNG, JPG or WEBP (up to 255 frames) with fit / fill / stretch
  placement and dithering so the preview matches the panel. The last uploaded animation is
  shown on start (from this app or the Havit app's database).
- **Clock:** sync the screen clock with the PC.
- **Settings:** Windows key lock, Fn lock, lighting sleep timer.
- **Macros:** record key sequences (writing them to the keyboard is not supported yet).

### Havit Fuxi-H7 wireless gaming headset
`VID 0x040B`, `PID 0x0897`

- **Audio:** volume, mute and left/right balance (relative to the master volume) via CoreAudio.
- **Microphone:** gain and mute.
- **Equalizer and effects:** 10-band EQ with presets, 7.1 virtual surround, room size, noise
  cancellation and sidetone. These are host-side and remembered between launches.

### Profiles, updates, diagnostics

- **Profiles** capture a device's full configuration; apply them from the device page or the
  Profiles page, export and import them as JSON.
- **Updates** come from GitHub Releases through the built-in updater (signed installers).
- **Diagnostics** shows the live log of every packet exchanged with the devices.

The keyboard cannot report its configuration back, so the app shows the last known state
(what it applied itself, else what the Havit app saved). See
[`docs/kb884l-firmware-notes.md`](docs/kb884l-firmware-notes.md) for why reading it back
would require replacing the firmware.

---

## Open beta

Havit Console is in open beta. The KB884L and Fuxi-H7 are verified on real hardware; every
other Havit device is only detected. The onboarding wizard asks whether to **share
compatibility reports**; with that on, the app files a GitHub issue when it detects an untested
Havit device or a device command fails (USB IDs, firmware and app versions, the packet log;
never names or serial numbers). With it off, **Devices → Report compatibility…** opens a
prefilled issue draft you submit yourself. Details: [`docs/compatibility-reports.md`](docs/compatibility-reports.md).

## Install

Download `Havit Console_X.Y.Z_x64-setup.exe` from the
[latest release](https://github.com/emirhannaneli/havit-console/releases/latest). It installs
per user (no administrator prompt) and updates itself afterwards.

Requirements: Windows 10/11 64-bit. WebView2 is installed automatically if missing.

---

## Develop

```bash
git clone https://github.com/emirhannaneli/havit-console.git
cd havit-console
npm install
npm run tauri dev      # desktop app with hot reload
npm run tauri build    # NSIS installer in src-tauri/target/release/bundle/nsis/
```

Requirements: Node.js 22, Rust stable (MSVC), Windows. `npm run dev` alone serves a browser
preview with mock devices at `http://localhost:1420`.

Versioning and releases follow Conventional Commits and release-please; see
[`docs/releasing.md`](docs/releasing.md).

---

## Protocol documentation

- [`docs/protocols/kb884l.md`](docs/protocols/kb884l.md) — KB884L HID transactions, lighting,
  settings, clock and screen upload.
- [`docs/protocols/fuxi-h7.md`](docs/protocols/fuxi-h7.md) — Fuxi-H7 audio endpoints and dongle.
- [`docs/ECOSYSTEM_FAMILIES.md`](docs/ECOSYSTEM_FAMILIES.md) — Havit model families and OEMs.
- [`docs/kb884l-firmware-notes.md`](docs/kb884l-firmware-notes.md) — firmware research.

---

## Contributing

Issues and pull requests are welcome. Commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, …) because
they drive the version number.

## License

MIT — see [`LICENSE`](LICENSE).
