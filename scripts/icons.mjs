// Renders the SVG sources in src-tauri/icons/source to every raster the app needs.
//
//   node scripts/icons.mjs
//
// Produces, in src-tauri/icons/: icon.png (1024, also the input for `tauri icon`),
// 32x32.png, 128x128.png, 128x128@2x.png, icon.ico, tray-16.png, tray-32.png and the
// Windows Store Square*Logo PNGs. Sizes below 64 px use the simplified variants
// (icon-small / icon-tiny) instead of downscaling the glowing master, so the mark stays
// legible in the taskbar and title bar; the .ico carries one such image per size.
// Run `npx tauri icon src-tauri/icons/icon.png` first for the macOS .icns, then this
// script to replace the downsampled PNG/ICO it wrote.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "src-tauri", "icons", "source");
const out = join(here, "..", "src-tauri", "icons");

const svg = {
  full: readFileSync(join(src, "icon-1024.svg"), "utf8"),
  small: readFileSync(join(src, "icon-small.svg"), "utf8"),
  tiny: readFileSync(join(src, "icon-tiny.svg"), "utf8"),
  tray: readFileSync(join(src, "tray.svg"), "utf8"),
};

const png = (markup, size) => new Resvg(markup, { fitTo: { mode: "width", value: size } }).render().asPng();

function write(markup, size, file) {
  writeFileSync(file, png(markup, size));
  console.log(`${file} (${size}px)`);
}

/** Which artwork a given pixel size gets. */
const variant = (size) => (size >= 64 ? svg.full : size >= 24 ? svg.small : svg.tiny);

/** ICO container with PNG-compressed entries (supported since Windows Vista). */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

write(svg.full, 1024, join(out, "icon.png"));
write(svg.full, 128, join(out, "128x128.png"));
write(svg.full, 256, join(out, "128x128@2x.png"));
write(svg.small, 32, join(out, "32x32.png"));
write(svg.tray, 16, join(out, "tray-16.png"));
write(svg.tray, 32, join(out, "tray-32.png"));

const icoSizes = [16, 20, 24, 32, 48, 64, 128, 256];
writeFileSync(join(out, "icon.ico"), ico(icoSizes.map((size) => ({ size, data: png(variant(size), size) }))));
console.log(`${join(out, "icon.ico")} (${icoSizes.join(", ")})`);

for (const [name, size] of [
  ["Square30x30Logo", 30],
  ["Square44x44Logo", 44],
  ["Square71x71Logo", 71],
  ["Square89x89Logo", 89],
  ["Square107x107Logo", 107],
  ["Square142x142Logo", 142],
  ["Square150x150Logo", 150],
  ["Square284x284Logo", 284],
  ["Square310x310Logo", 310],
  ["StoreLogo", 50],
]) {
  write(variant(size), size, join(out, `${name}.png`));
}
