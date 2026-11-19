//! Linux device access: the udev rule that lets the logged-in user open the devices.
//!
//! The install script and the .deb put the rule in place, but the AppImage updates itself
//! without touching it, and a hand-installed AppImage starts with none. The app compares the
//! installed rule with the one it ships and, when lines are missing, installs it through
//! `pkexec`, which asks for the password in the desktop's own polkit dialog.

#[cfg(target_os = "linux")]
mod imp {
    use std::io::Write;
    use std::process::{Command, Stdio};

    const RULES: &str = include_str!("../linux/70-havit-console.rules");
    const RULE_FILE: &str = "70-havit-console.rules";
    const RULE_DIRS: &[&str] = &["/etc/udev/rules.d", "/usr/lib/udev/rules.d", "/lib/udev/rules.d"];

    /// Writes the rule from stdin, reloads udev and re-applies it to devices already plugged in.
    const INSTALL_SCRIPT: &str = "umask 022; \
        cat > /etc/udev/rules.d/70-havit-console.rules.new || exit 1; \
        mv /etc/udev/rules.d/70-havit-console.rules.new /etc/udev/rules.d/70-havit-console.rules || exit 1; \
        udevadm control --reload-rules; \
        udevadm trigger --subsystem-match=hidraw; \
        udevadm trigger --subsystem-match=usb --attr-match=idVendor=05ac; \
        udevadm trigger --subsystem-match=usb --attr-match=idVendor=040b; \
        udevadm settle --timeout=5; \
        exit 0";

    fn rule_lines(text: &str) -> impl Iterator<Item = &str> {
        text.lines().map(str::trim).filter(|l| !l.is_empty() && !l.starts_with('#'))
    }

    pub fn setup_needed() -> bool {
        let installed: String = RULE_DIRS
            .iter()
            .filter_map(|dir| std::fs::read_to_string(format!("{dir}/{RULE_FILE}")).ok())
            .collect::<Vec<_>>()
            .join("\n");
        let have: Vec<&str> = rule_lines(&installed).collect();
        rule_lines(RULES).any(|line| !have.contains(&line))
    }

    pub fn install() -> Result<(), String> {
        let mut child = Command::new("pkexec")
            .args(["/bin/sh", "-c", INSTALL_SCRIPT])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::NotFound => {
                    "pkexec is not installed; install polkit or add the udev rule by hand (see README, \"Linux udev rule\")".to_string()
                }
                _ => format!("Could not start pkexec: {e}"),
            })?;
        child
            .stdin
            .take()
            .ok_or("pkexec stdin unavailable")?
            .write_all(RULES.as_bytes())
            .map_err(|e| format!("Could not pass the rule to pkexec: {e}"))?;
        let out = child.wait_with_output().map_err(|e| format!("pkexec failed: {e}"))?;
        match out.status.code() {
            Some(0) => Ok(()),
            // pkexec: 126 = the user dismissed the dialog or was not authorized,
            // 127 = no polkit agent could ask (none is running in this session).
            Some(126) => Err("Authorization was cancelled.".to_string()),
            Some(127) => Err(
                "No password dialog is available: start a polkit agent (e.g. hyprpolkitagent, polkit-gnome) and try again."
                    .to_string(),
            ),
            code => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                Err(format!("Installing the udev rule failed ({code:?}): {}", stderr.trim()))
            }
        }
    }
}

#[cfg(not(target_os = "linux"))]
mod imp {
    pub fn setup_needed() -> bool {
        false
    }

    pub fn install() -> Result<(), String> {
        Err("Device access setup is only needed on Linux.".to_string())
    }
}

pub use imp::{install, setup_needed};
