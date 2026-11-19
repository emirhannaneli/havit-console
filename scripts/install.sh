#!/usr/bin/env bash
# Havit Console installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/emirhannaneli/havit-console/main/scripts/install.sh | bash
#
# Options (pass after `bash -s --` when piping):
#   --version X.Y.Z   install a specific release instead of the latest one
#   --deb             Linux: install the .deb package (system-wide, no self-update)
#   --appimage        Linux: install the AppImage into ~/.local (default, updates itself)
#   --no-udev         Linux: skip installing the udev rule
#   --uninstall       remove Havit Console
#
# The script only downloads from this repository's GitHub Releases.

set -euo pipefail

REPO="emirhannaneli/havit-console"
APP_NAME="Havit Console"
RAW="https://raw.githubusercontent.com/${REPO}/main"
UDEV_RULE="/etc/udev/rules.d/70-havit-console.rules"

version=""
linux_format="appimage"
want_udev=1
action="install"

say()  { printf '\033[1;31m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version)   [ $# -ge 2 ] || die "--version needs a value"; version="${2#v}"; shift 2 ;;
    --version=*) version="${1#--version=}"; version="${version#v}"; shift ;;
    --deb)       linux_format="deb"; shift ;;
    --appimage)  linux_format="appimage"; shift ;;
    --no-udev)   want_udev=0; shift ;;
    --uninstall) action="uninstall"; shift ;;
    -h|--help)   sed -n '2,14p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)           die "unknown option: $1" ;;
  esac
done

command -v curl >/dev/null 2>&1 || die "curl is required"

sudo_cmd() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else
    command -v sudo >/dev/null 2>&1 || die "sudo is required for: $*"
    sudo "$@"
  fi
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Prints the download URL of the release asset whose name ends with $1.
asset_url() {
  local api
  if [ -n "$version" ]; then
    api="https://api.github.com/repos/${REPO}/releases/tags/v${version}"
  else
    api="https://api.github.com/repos/${REPO}/releases/latest"
  fi
  curl -fsSL -H "Accept: application/vnd.github+json" "$api" -o "$tmp/release.json" \
    || die "could not read release information from GitHub (${api})"
  grep -o '"browser_download_url": *"[^"]*"' "$tmp/release.json" \
    | sed 's/.*"\(https[^"]*\)"$/\1/' \
    | grep -E "$1\$" | head -n 1 || true
}

download() { # url dest
  say "Downloading $(basename "$1")"
  curl -fL --progress-bar "$1" -o "$2" || die "download failed: $1"
}

# ---------------------------------------------------------------- macOS

mac_install() {
  local url dmg mnt dest app
  url="$(asset_url '_universal\.dmg')"
  [ -n "$url" ] || die "this release has no macOS build"
  dmg="$tmp/havit-console.dmg"
  download "$url" "$dmg"

  mnt="$tmp/mnt"
  mkdir -p "$mnt"
  hdiutil attach -nobrowse -readonly -quiet -mountpoint "$mnt" "$dmg" || die "could not mount the disk image"
  dest="/Applications"
  [ -w "$dest" ] || dest="$HOME/Applications"
  mkdir -p "$dest"
  app="$dest/${APP_NAME}.app"
  say "Installing to $app"
  rm -rf "$app"
  ditto "$mnt/${APP_NAME}.app" "$app"
  hdiutil detach -quiet "$mnt" || true

  # Not notarized yet: drop the quarantine flag so Gatekeeper does not block the first
  # launch, and make sure the bundle carries at least an ad-hoc signature (Apple silicon
  # refuses to run unsigned code).
  xattr -dr com.apple.quarantine "$app" 2>/dev/null || true
  codesign --verify "$app" >/dev/null 2>&1 || codesign --force --deep --sign - "$app" >/dev/null 2>&1 || true

  say "Done. Open ${APP_NAME} from Launchpad or: open \"$app\""
}

mac_uninstall() {
  local app
  for app in "/Applications/${APP_NAME}.app" "$HOME/Applications/${APP_NAME}.app"; do
    [ -d "$app" ] && { say "Removing $app"; rm -rf "$app"; }
  done
  say "Settings and profiles are kept in ~/Library/Application Support/io.github.emirhannaneli.havitconsole"
}

# ---------------------------------------------------------------- Linux

linux_udev() {
  [ "$want_udev" -eq 1 ] || return 0
  # The .deb ships its own copy in /usr/lib/udev/rules.d.
  [ "$linux_format" = "deb" ] && return 0
  say "Installing udev rule (${UDEV_RULE}); this needs sudo"
  # Same content as src-tauri/linux/70-havit-console.rules.
  cat > "$tmp/70-havit-console.rules" <<'RULES'
# Havit Console: let the logged-in user open the supported Havit devices without root.
KERNEL=="hidraw*", ATTRS{idVendor}=="05ac", ATTRS{idProduct}=="024f", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="040b", ATTRS{idProduct}=="0897", TAG+="uaccess"
RULES
  sudo_cmd install -m 0644 "$tmp/70-havit-console.rules" "$UDEV_RULE"
  sudo_cmd udevadm control --reload-rules
  sudo_cmd udevadm trigger --subsystem-match=hidraw || true
}

linux_install_appimage() {
  local url bin_dir app_dir apps_dir icon_dir target
  url="$(asset_url '_amd64\.AppImage')"
  [ -n "$url" ] || die "this release has no AppImage"

  bin_dir="$HOME/.local/bin"
  app_dir="$HOME/.local/share/havit-console"
  apps_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
  icon_dir="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/128x128/apps"
  mkdir -p "$bin_dir" "$app_dir" "$apps_dir" "$icon_dir"

  # Keep the AppImage in a user-writable place so the built-in updater can replace it.
  target="$app_dir/HavitConsole.AppImage"
  download "$url" "$tmp/HavitConsole.AppImage"
  install -m 0755 "$tmp/HavitConsole.AppImage" "$target"
  ln -sf "$target" "$bin_dir/havit-console"

  curl -fsSL "${RAW}/src-tauri/icons/128x128.png" -o "$icon_dir/havit-console.png" \
    || warn "could not download the icon"

  cat > "$apps_dir/havit-console.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Control center for Havit keyboards and headsets
Exec="${target}" %U
Icon=havit-console
Terminal=false
Categories=Utility;Settings;HardwareSettings;
StartupWMClass=havit-console
EOF
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$apps_dir" >/dev/null 2>&1 || true

  case ":$PATH:" in *":$bin_dir:"*) ;; *) warn "$bin_dir is not in PATH; start the app from the menu or add it to PATH" ;; esac
}

linux_install_deb() {
  local url deb
  command -v dpkg >/dev/null 2>&1 || die "--deb needs a Debian-based system (dpkg not found)"
  url="$(asset_url '_amd64\.deb')"
  [ -n "$url" ] || die "this release has no .deb package"
  deb="$tmp/havit-console.deb"
  download "$url" "$deb"
  say "Installing the package; this needs sudo"
  chmod 0644 "$deb"
  if command -v apt-get >/dev/null 2>&1; then
    sudo_cmd apt-get install -y "$deb"
  else
    sudo_cmd dpkg -i "$deb"
  fi
  warn "the .deb build does not update itself; rerun this script to upgrade"
}

linux_install() {
  [ "$(uname -m)" = "x86_64" ] || die "only x86_64 Linux builds are published (this machine is $(uname -m))"
  if [ "$linux_format" = "deb" ]; then linux_install_deb; else linux_install_appimage; fi
  linux_udev
  say "Done. Start ${APP_NAME} from the application menu. Replug the devices if they are not detected."
}

linux_uninstall() {
  local data="${XDG_DATA_HOME:-$HOME/.local/share}"
  if command -v dpkg >/dev/null 2>&1 && dpkg -s havit-console >/dev/null 2>&1; then
    say "Removing the havit-console package"
    sudo_cmd dpkg -r havit-console
  fi
  rm -f "$HOME/.local/bin/havit-console" "$data/applications/havit-console.desktop" \
        "$data/icons/hicolor/128x128/apps/havit-console.png"
  rm -rf "$HOME/.local/share/havit-console"
  if [ -f "$UDEV_RULE" ]; then
    say "Removing ${UDEV_RULE}; this needs sudo"
    sudo_cmd rm -f "$UDEV_RULE"
    sudo_cmd udevadm control --reload-rules || true
  fi
  say "Removed. Settings and profiles are kept in ~/.config/io.github.emirhannaneli.havitconsole"
}

# ---------------------------------------------------------------- main

case "$(uname -s)" in
  Darwin) if [ "$action" = "install" ]; then mac_install; else mac_uninstall; fi ;;
  Linux)  if [ "$action" = "install" ]; then linux_install; else linux_uninstall; fi ;;
  *)      die "unsupported system $(uname -s); on Windows use scripts/install.ps1" ;;
esac
