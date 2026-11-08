# Versioning, releases and in-app updates

Everything runs on GitHub: `emirhannaneli/havit-console`.

## Flow

1. Commit to `main` with [Conventional Commits](https://www.conventionalcommits.org/):
   `fix:` → patch, `feat:` → minor, `feat!:` or a `BREAKING CHANGE:` footer → major.
   Other types (`chore:`, `docs:`, `refactor:`) do not trigger a release.
2. `CI` (`.github/workflows/ci.yml`) type-checks, bundles the frontend and runs
   `cargo check`/`cargo test` on every push and pull request.
3. `Release` (`.github/workflows/release.yml`), job `release-please`, keeps a release pull
   request open with the next version. It bumps `package.json`,
   `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` and writes `CHANGELOG.md`
   (`release-please-config.json`, `.release-please-manifest.json`).
4. Merging the release PR creates the tag `vX.Y.Z` and a GitHub Release. The `build` job
   compiles the NSIS installer on Windows, signs the updater bundle and uploads the
   installer, the `.sig` and `latest.json` to that release.
5. Installed apps read
   `https://github.com/emirhannaneli/havit-console/releases/latest/download/latest.json`
   on launch (when automatic update checks are enabled) and from the Updates page, download the signed installer, run it passively and relaunch.

## Secrets and settings (one time)

- Signing keypair: `%USERPROFILE%\.tauri\havit-console.key` (private, no password) and
  `havit-console.key.pub` (embedded in `tauri.conf.json`). Back the private key up. If it
  is lost, existing installs can never update again; a new key means a manual reinstall
  for every user.
- Repository secrets: `TAURI_SIGNING_PRIVATE_KEY` = contents of `havit-console.key`,
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = empty.
- Repository setting "Allow GitHub Actions to create and approve pull requests"
  (Settings → Actions → General) must be on, otherwise release-please cannot open the
  release PR.

## Installer

`bundle.targets` is `nsis` only: one `Havit Console_X.Y.Z_x64-setup.exe` with a
Turkish/English wizard, per-user install (no admin prompt) and a Start Menu folder.
WebView2 is downloaded silently by the installer if the machine lacks it.
