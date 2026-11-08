# KB884L firmware research notes

Goal: find out whether the keyboard firmware can be updated or modified so that the
screen (LCD) contents can be read back over USB.

## What the vendor app does

`DeviceDriver.exe` (Ghidra output in `.re_workspace/kb884l/analysis/decompiled`) contains
**no firmware flashing code**:

- Language string 600 "Firmware Upgrade" is only used as a label for a main-window control
  (`FUN_0043fa30`, `FUN_0041c060`). Strings 601–606 (upgrade dialog) are referenced nowhere.
- The only update path is the PC software check in `FUN_00450fb0`: it reads
  `device.config/upgrade.url/software/url` from `device.xml`, downloads `version.txt` with
  WinINet (`FUN_00461800`) and compares it with the app version. The shipped `device.xml`
  has no `upgrade.url` node, so the check is inert.
- No "enter bootloader" command is sent anywhere. All vendor commands use the `0x04` report
  framing documented in `protocols/kb884l.md`.

So there is no vendor firmware image, download URL or flashing protocol to reuse.

## MCU

USB manufacturer string is `SONiX`, `bcdDevice 0x0120`. HFD (RKGK890 OEM) parts are
rebranded Sonix SN32F2xx MCUs (SonixQMK lists HFD2201KBA / HFD48KP500 / HFD64KG800, all
equivalent to SN32F248B). The exact part is only known after the ISP bootloader reports its
version (`CMD_GET_FW_VERSION`) or by opening the case.

## ISP bootloader (from `SonixFlasherC`, copies in `.re_workspace/kb884l/refs`)

- The bootloader lives in ROM at `0x1FFF0000`; it is entered by pulling the BOOT pin to GND
  at power-up, or by a magic 64-byte HID feature report that the stock firmware accepts.
  For HFD firmware the payload is two little-endian u32s `0x5A8942AA, 0xCC6271FF`
  (`sonixflasher -r hfd`). In bootloader mode the device enumerates as Sonix
  `0x0C45:0x7040` (SN32F24xB) or another PID from `device.h`.
- Commands are 64-byte feature reports with `CMD_BASE 0x55AA`: get version (1),
  set code security (3), enable erase (4), enable program (5), get checksum (6),
  return to user mode (7). **There is no read command.** Flash contents cannot be read back
  over USB; verification is checksum-only.
- Reading the stock firmware requires SWD: open the case, solder SWCLK/SWDIO/GND/BOOT,
  ST-Link + OpenOCD with `SonixQMK/sonix_dumper`, which bypasses code security using ROM
  gadgets.

## Conclusion

Reading the current screen animation back requires replacing the firmware, because the
stock firmware has no such command and cannot be patched without a hardware dump.
A replacement would be a SonixQMK port plus new drivers for the 160×96 TFT, the external
SPI flash that stores the frames (up to 255 × 30 KB), the RTC clock and the lighting modes.
None of these exist in SonixQMK today. The stock firmware cannot be restored unless it was
dumped over SWD first.

Decision: not pursued. The app shows the last known screen content instead
(`src-tauri/src/devices/kb884l/state.rs`).
