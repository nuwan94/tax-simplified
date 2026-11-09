// Renders the favicon, app icons and social share image from the SVG sources in assets/brand.
// Run after changing those sources:  node scripts/icons.mjs
// Uses sharp, which ships with Next.js.

import { copyFile, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const src = (f) => new URL(`../assets/brand/${f}`, import.meta.url);
const out = (f) => new URL(`../${f}`, import.meta.url);

const icon = await readFile(src('icon.svg'));
const maskable = await readFile(src('icon-maskable.svg'));
const og = await readFile(src('og.svg'));

const png = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

// favicon.ico holding 16, 32 and 48 px PNGs (PNG-in-ICO is supported by every current browser)
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(icon, s)));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((img, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(sizes[i], e);
  header.writeUInt8(sizes[i], e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(img.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += img.length;
});
await writeFile(out('src/app/favicon.ico'), Buffer.concat([header, ...images]));

await copyFile(src('icon.svg'), out('src/app/icon.svg'));
await writeFile(out('src/app/apple-icon.png'), await png(maskable, 180));
await writeFile(out('public/icon-192.png'), await png(icon, 192));
await writeFile(out('public/icon-512.png'), await png(icon, 512));
await writeFile(out('public/icon-maskable-512.png'), await png(maskable, 512));

const share = await sharp(og, { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toBuffer();
await writeFile(out('src/app/opengraph-image.png'), share);
await writeFile(out('src/app/twitter-image.png'), share);

console.log('icons and share image written');
