# Havit Console installer for Windows 10/11 (x64).
#
#   irm https://raw.githubusercontent.com/emirhannaneli/havit-console/main/scripts/install.ps1 | iex
#
# A specific version or a silent install:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/emirhannaneli/havit-console/main/scripts/install.ps1))) -Version 0.6.0 -Silent
#
# Downloads the NSIS installer from this repository's GitHub Releases and runs it. The
# installer is per user, so no administrator prompt appears.

param(
    [string]$Version = "",
    [switch]$Silent
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # Invoke-WebRequest is much faster without the progress bar
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$Repo = "emirhannaneli/havit-console"

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "Havit Console needs 64-bit Windows."
}

$Version = $Version.TrimStart("v")
$api = if ($Version) { "https://api.github.com/repos/$Repo/releases/tags/v$Version" }
       else          { "https://api.github.com/repos/$Repo/releases/latest" }

Write-Host "==> Reading release information" -ForegroundColor Red
$release = Invoke-RestMethod -Uri $api -Headers @{ Accept = "application/vnd.github+json" }
$asset = $release.assets | Where-Object { $_.name -like "*_x64-setup.exe" } | Select-Object -First 1
if (-not $asset) { throw "Release $($release.tag_name) has no Windows installer." }

$dest = Join-Path ([IO.Path]::GetTempPath()) $asset.name
Write-Host "==> Downloading $($asset.name)" -ForegroundColor Red
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dest -UseBasicParsing

Write-Host "==> Running the installer" -ForegroundColor Red
$proc = if ($Silent) { Start-Process -FilePath $dest -ArgumentList "/S" -Wait -PassThru }
        else         { Start-Process -FilePath $dest -Wait -PassThru }
Remove-Item $dest -ErrorAction SilentlyContinue

if ($proc.ExitCode -ne 0) { throw "The installer exited with code $($proc.ExitCode)." }
Write-Host "==> Havit Console $($release.tag_name) is installed. It updates itself from now on." -ForegroundColor Red
