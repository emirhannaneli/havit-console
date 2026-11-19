#!/bin/sh
# Apply the bundled udev rule so the devices work without replugging.
if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules || true
  udevadm trigger --subsystem-match=hidraw || true
  udevadm trigger --subsystem-match=usb --attr-match=idVendor=05ac || true
fi
exit 0
