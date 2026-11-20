//! systemd user unit that starts the app with the graphical session.
//!
//! The XDG entry written by tauri-plugin-autostart (`~/.config/autostart`) is only
//! honoured by full desktops (GNOME, KDE, ...). Standalone compositors such as
//! Hyprland or Sway ignore it, but under uwsm/systemd sessions they still reach
//! `graphical-session.target`, so a unit wanted by that target covers them too.
//! On desktops that run both, the second launch is absorbed by single-instance.

use std::path::{Path, PathBuf};

const UNIT_NAME: &str = "havit-console.service";
const TARGET: &str = "graphical-session.target";

fn unit_dir() -> Option<PathBuf> {
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))?;
    Some(base.join("systemd").join("user"))
}

/// Quote a path for an `ExecStart=` line.
fn quote_exec(path: &str) -> String {
    let escaped = path
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('%', "%%");
    format!("\"{escaped}\"")
}

fn unit_contents(exe: &str, hidden_arg: &str) -> String {
    format!(
        "[Unit]\n\
         Description=Havit Console (keyboard and headset control)\n\
         PartOf={TARGET}\n\
         After={TARGET}\n\
         \n\
         [Service]\n\
         Type=exec\n\
         ExecStart={} {hidden_arg}\n\
         Restart=no\n\
         \n\
         [Install]\n\
         WantedBy={TARGET}\n",
        quote_exec(exe)
    )
}

/// Path the session should launch: the AppImage itself, not its temporary mount.
fn launch_path(appimage: Option<&Path>) -> Option<String> {
    let path = match appimage {
        Some(p) => p.to_path_buf(),
        None => std::env::current_exe().ok()?,
    };
    path.to_str().map(str::to_owned)
}

/// Write (or refresh) the unit and its `.wants` link. Safe to call on every start.
pub fn enable(appimage: Option<&Path>, hidden_arg: &str) -> std::io::Result<()> {
    let Some(dir) = unit_dir() else {
        return Ok(());
    };
    let Some(exe) = launch_path(appimage) else {
        return Ok(());
    };

    std::fs::create_dir_all(&dir)?;
    let unit_path = dir.join(UNIT_NAME);
    let contents = unit_contents(&exe, hidden_arg);
    if std::fs::read_to_string(&unit_path).ok().as_deref() != Some(contents.as_str()) {
        std::fs::write(&unit_path, contents)?;
    }

    let wants_dir = dir.join(format!("{TARGET}.wants"));
    std::fs::create_dir_all(&wants_dir)?;
    let link = wants_dir.join(UNIT_NAME);
    if std::fs::read_link(&link).ok().as_deref() != Some(unit_path.as_path()) {
        let _ = std::fs::remove_file(&link);
        std::os::unix::fs::symlink(&unit_path, &link)?;
    }
    Ok(())
}

pub fn disable() -> std::io::Result<()> {
    let Some(dir) = unit_dir() else {
        return Ok(());
    };
    for path in [
        dir.join(format!("{TARGET}.wants")).join(UNIT_NAME),
        dir.join(UNIT_NAME),
    ] {
        match std::fs::remove_file(&path) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e),
            _ => {}
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unit_quotes_path_and_targets_session() {
        let unit = unit_contents("/home/a b/50%/havit-console.AppImage", "--hidden");
        assert!(unit.contains("ExecStart=\"/home/a b/50%%/havit-console.AppImage\" --hidden\n"));
        assert!(unit.contains("WantedBy=graphical-session.target\n"));
        assert!(unit.contains("PartOf=graphical-session.target\n"));
    }
}
