# Changelog

## [0.8.0](https://github.com/emirhannaneli/havit-console/compare/v0.7.2...v0.8.0) (2026-11-19)


### Features

* **linux:** in-app device access setup; saturated KB884L preset colors ([c72feac](https://github.com/emirhannaneli/havit-console/commit/c72feac30056f01c09b52aff9ad58e4024331d4a))
* **linux:** set up device access from the app ([39f7531](https://github.com/emirhannaneli/havit-console/commit/39f75314776b3af78581306e74b1c4426094a3f0))


### Bug Fixes

* **kb884l:** send less green for the orange preset so it doesn't look yellow ([e474b5d](https://github.com/emirhannaneli/havit-console/commit/e474b5d4ee67b32b0c3a8bb362d847da63a13fe0))
* **kb884l:** send less green for the yellow preset so it doesn't look pale ([3f5ef2e](https://github.com/emirhannaneli/havit-console/commit/3f5ef2ed2f7c95d250da7214be5bf6eff095a377))
* **kb884l:** use saturated preset colors so the keys match the swatches ([738412d](https://github.com/emirhannaneli/havit-console/commit/738412ded45518b3ae97a2ed3f79649186f69c7e))

## [0.7.2](https://github.com/emirhannaneli/havit-console/compare/v0.7.1...v0.7.2) (2026-11-19)


### Bug Fixes

* KB884L control channel on Linux, layout for tiled windows ([f64695b](https://github.com/emirhannaneli/havit-console/commit/f64695b797520464a643b9cd2e79068cca23ef82))
* **kb884l:** reach the 0xFF13 control channel over libusb on Linux ([5cc776d](https://github.com/emirhannaneli/havit-console/commit/5cc776dd0ebb5050c6aaf57004c0591e7b371a34))
* **ui:** fit tiled and narrow windows ([22996dd](https://github.com/emirhannaneli/havit-console/commit/22996dd2d76251ef786ad30ec41a4b4377fb33f6))

## [0.7.1](https://github.com/emirhannaneli/havit-console/compare/v0.7.0...v0.7.1) (2026-11-19)


### Bug Fixes

* **fuxi:** show EQ presets in a dropdown so they fit narrow windows ([db8feb0](https://github.com/emirhannaneli/havit-console/commit/db8feb0ef8d3f4f8d2b7855bd298e7d0b942e5d1))

## [0.7.0](https://github.com/emirhannaneli/havit-console/compare/v0.6.0...v0.7.0) (2026-11-19)


### Features

* **install:** add install scripts and per-platform install guide ([910ae0f](https://github.com/emirhannaneli/havit-console/commit/910ae0f65d326670a3cfe064e2b913715aada846))

## [0.6.0](https://github.com/emirhannaneli/havit-console/compare/v0.5.0...v0.6.0) (2026-11-08)


### Features

* **release:** ship macOS and Linux builds ([a5ffd99](https://github.com/emirhannaneli/havit-console/commit/a5ffd99691227fe3a2b2b6c63be60b294fab899b))
* **release:** ship macOS and Linux builds ([5755081](https://github.com/emirhannaneli/havit-console/commit/575508198429e88032dd02fcd1a9d7a5ac2334b5))

## [0.5.0](https://github.com/emirhannaneli/havit-console/compare/v0.4.2...v0.5.0) (2026-11-08)


### Features

* **headset:** redesign equalizer with preset segments and custom sliders ([e898b73](https://github.com/emirhannaneli/havit-console/commit/e898b73b5f12fc8eab448ffb18de0348a7529dab))
* **i18n:** add 15 languages including Chinese and Japanese ([27d0f24](https://github.com/emirhannaneli/havit-console/commit/27d0f2484a50da314f0f8fa47c0c9ab82e6cd50a))


### Bug Fixes

* **ci:** sync Cargo.lock version and skip hardware-only test ([bfd5d45](https://github.com/emirhannaneli/havit-console/commit/bfd5d4566b05e3a7b365a267fb8aca7c374e77e7))

## [0.4.2](https://github.com/emirhannaneli/havit-console/compare/v0.4.1...v0.4.2) (2026-11-08)


### Bug Fixes

* **ui:** apply brand red theme, smooth transitions, and keyboard layout fix ([f3e2fec](https://github.com/emirhannaneli/havit-console/commit/f3e2fecb694aa2980c55c5858476bcffdbb51a3a))

## [0.4.1](https://github.com/emirhannaneli/havit-console/compare/v0.4.0...v0.4.1) (2026-11-08)


### Bug Fixes

* **telemetry:** default compatibility reports to enabled in open beta ([3e20e7b](https://github.com/emirhannaneli/havit-console/commit/3e20e7b1298c5d679dbd6dbf0c90ed040b522174))

## [0.4.0](https://github.com/emirhannaneli/havit-console/compare/v0.3.0...v0.4.0) (2026-11-08)


### Features

* **headset:** add connection mode and battery status bar ([77d3641](https://github.com/emirhannaneli/havit-console/commit/77d36419b7e67987f7de07d1285cb27607488ed3))

## [0.3.0](https://github.com/emirhannaneli/havit-console/compare/v0.2.0...v0.3.0) (2026-11-08)


### Features

* add Turkish and English UI languages and the new app icon ([5222032](https://github.com/emirhannaneli/havit-console/commit/52220320b4c2c6fae4a48abb414983057fc8f5cd))
* **audio:** fix channel balance drift, add live mic VU meter and ambient glow ([9d82303](https://github.com/emirhannaneli/havit-console/commit/9d823031dc0d94ef4b9b3a2cc2ceeed0131f133d))
* open beta with device catalog and opt-in compatibility reports ([56140a0](https://github.com/emirhannaneli/havit-console/commit/56140a027c35717a4994373ca1ed88b0bbc31d0a))


### Bug Fixes

* **i18n:** translate the connection type labels reported by the backend ([5d0d321](https://github.com/emirhannaneli/havit-console/commit/5d0d321bb0d75cd160d01798ef078358fc023f3e))
* **relay:** serve reports from hc-reports.emirman.dev because ISPs block workers.dev ([3496ccd](https://github.com/emirhannaneli/havit-console/commit/3496ccd785c422bb313ca709d7d975c7fde830d2))
* **relay:** size fences to the content, strip line breaks from single-line fields, cap the request body while streaming ([6b716ff](https://github.com/emirhannaneli/havit-console/commit/6b716ff0d98d08af0075a59cc7f3b3c096065422))
* **relay:** size fences to the content, strip line breaks from single-line fields, cap the request body while streaming ([e2ad807](https://github.com/emirhannaneli/havit-console/commit/e2ad807531f59763dcdfa6aaef0edb42f34a44ed))
* **sidebar:** move Diagnostics to an icon button in the footer ([429941e](https://github.com/emirhannaneli/havit-console/commit/429941e51d02d92ea0a051aa383e3bf43dade49a))
* **ui:** compact language picker in the toolbar ([0f34d23](https://github.com/emirhannaneli/havit-console/commit/0f34d23492652ce895d65687961b91417e14b84d))
* **ui:** move the language picker to the toolbar; update wrangler to v4 ([2d41cfb](https://github.com/emirhannaneli/havit-console/commit/2d41cfb1b56fa75fa72bb7017ed6d75d3659e32e))

## [0.2.0](https://github.com/emirhannaneli/havit-console/compare/v0.1.0...v0.2.0) (2026-11-08)


### Features

* initial release of havit-console (Tauri v2 + Rust + React 19) ([2cec5fa](https://github.com/emirhannaneli/havit-console/commit/2cec5fa6a6b862cb7a9fdbe5d69d493ade2d10e4))
* redesign ui, fix kb884l protocol, add profiles, tray, updater ([8211540](https://github.com/emirhannaneli/havit-console/commit/8211540bc92cc12f731d13e292bf083d4e9113e1))
* switch the app and project documentation to English ([13b9855](https://github.com/emirhannaneli/havit-console/commit/13b9855c8d40f18d82a8439e3dd6a0ce1840ba3b))
