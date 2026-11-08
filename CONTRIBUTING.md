# Contributing to Havit Console

Havit Console is a community project. Bug reports, new device support and UI improvements
are welcome.

---

## Architecture

Two layers:

1. **Rust core (`src-tauri/src/`)**
   - `transport/hid.rs`: USB HID I/O (feature reports, output reports, long-timeout
     overlapped writes).
   - `device_registry.rs`: detection of connected devices and their capabilities.
   - `devices/`: per-device protocol drivers (`kb884l`, `fuxi_h7`) and last-known state.
   - `packet_log.rs`: live packet log shown on the Diagnostics page.
   - `profiles.rs`: local JSON storage for profiles.
2. **UI (`src/`)**
   - React 19 + TypeScript + Tailwind CSS v4.
   - `components/ui.tsx` holds the shared controls (sections, rows, switch, select, …);
     device pages live in `components/kb884l`, `components/fuxi`; shared device settings
     and profile capture/apply live in `state/DeviceSettings.tsx`.

The protocol documentation is in `docs/protocols/`.

---

## Adding a Havit device

Havit peripherals come from a few OEM families (see `docs/ECOSYSTEM_FAMILIES.md`):

1. **Rongyuan / HFD (keyboards):** `0xFF13` feature-report transactions.
2. **XiiSound (headsets):** Windows CoreAudio plus the `0xF100` dongle HID link.
3. **QMK / VIA:** standard raw HID (`0xFF60`).
4. **Houyi / VS (mice):** 64-byte sensor and DPI packets.

Steps:

1. **Find the VID/PID.** Plug the device in and list it:
   ```powershell
   Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like "*VID_*" }
   ```
2. **Analyze the protocol.** Decompile the vendor software (`morluto/rea` + Ghidra) and
   derive the report ids and packet layouts. Write them down in `docs/protocols/<device>.md`;
   the existing files show the expected level of detail. Never commit vendor binaries.
3. **Register the device** in `discover_havit_devices()`
   (`src-tauri/src/device_registry.rs`): VID/PID, usage pages and `DeviceCapabilities`.
4. **Write the driver** in `src-tauri/src/devices/<device>/` and expose Tauri commands in
   `src-tauri/src/lib.rs`. Run slow or HID work through `off_ui_thread`.
5. **Build the page** in `src/components/<device>/`, add the view to `src/App.tsx` and the
   sidebar, and extend `state/DeviceSettings.tsx` if the device should support profiles.

Test on real hardware before opening a pull request, and include what you observed.

---

## Checks

Run these before pushing; CI runs the same set:

```bash
npx tsc --noEmit -p .
npm run build
cd src-tauri && cargo check --locked && cargo test --locked
```

---

## Commits and pull requests

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:` (minor), `fix:` (patch), `feat!:` / `BREAKING CHANGE:` (major). release-please
  turns them into the version number and the changelog, so the type matters.
- Code, comments, documentation and UI text are in English.
- Fork, branch (`git checkout -b feat/<device>`), open a pull request against `main`.
  Mention the device model you tested with and attach evidence (screenshot or a
  Diagnostics log excerpt).
