/**
 * Renders public/icon.svg into the Android launcher icons (legacy square + round,
 * adaptive foreground) and the splash screens, at every density.
 *
 *   node scripts/generate-icons.mjs        (after `npx cap add android`)
 */
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
if (!existsSync(RES)) {
  console.error('No android/ project yet. Run:  npx cap add android');
  process.exit(1);
}

const BRAND = '#1f6f4a';
const icon = readFileSync(join(ROOT, 'public', 'icon.svg'), 'utf8');
// The plate and cutlery without the green rounded square behind them.
const glyph = icon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect[^>]*\/>/, '');

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
let files = 0;
const write = (path, data) => {
  writeFileSync(path, data);
  files++;
};

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`);
  // Legacy launchers (Android 7 and older): the full square and a round variant.
  write(join(dir, 'ic_launcher.png'), png(icon, 48 * k));
  const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${BRAND}"/><g transform="translate(32 32) scale(0.82) translate(-32 -32)">${glyph}</g></svg>`;
  write(join(dir, 'ic_launcher_round.png'), png(round, 48 * k));
  // Adaptive icon foreground: 108 dp canvas, artwork kept inside the 66 dp safe zone.
  const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(21 21) scale(${66 / 64})">${glyph}</g></svg>`;
  write(join(dir, 'ic_launcher_foreground.png'), png(fg, 108 * k));
}

// The adaptive background is a flat colour.
write(
  join(RES, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND}</color>\n</resources>\n`,
);

// Splash screens: the icon centred on the brand colour, at whatever size each slot already has.
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
for (const dir of readdirSync(RES).filter((x) => x.startsWith('drawable'))) {
  const file = join(RES, dir, 'splash.png');
  if (!existsSync(file)) continue;
  const [w, h] = pngSize(readFileSync(file));
  const s = Math.min(w, h) * 0.28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${BRAND}"/><g transform="translate(${(w - s) / 2} ${(h - s) / 2}) scale(${s / 64})">${glyph}</g></svg>`;
  write(file, png(svg, w));
}

console.log(`Wrote ${files} icon and splash files.`);
