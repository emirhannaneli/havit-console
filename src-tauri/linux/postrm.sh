#!/bin/sh
# Drop the removed udev rule from the running udev daemon.
if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules || true
  udevadm trigger --subsystem-match=hidraw || true
fi
exit 0
