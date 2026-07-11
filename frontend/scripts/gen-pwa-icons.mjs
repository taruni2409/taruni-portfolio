/**
 * Generates the portfolio PWA icons from the brand mark (src/app/icon.png).
 * Run from the frontend dir so sharp resolves:  node scripts/gen-pwa-icons.mjs
 *
 * Outputs to public/: 192 + 512 "any" icons (filled), a padded 512 "maskable"
 * (extra margin so the face survives circular/squircle masks), and a 180px
 * apple-touch-icon. White background so it reads on any home screen.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "app", "icon.png");
const OUT = join(ROOT, "public");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function any(name, size) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(join(OUT, name));
  console.log("wrote", name, `(${size}x${size})`);
}

async function maskable(name, size) {
  const pad = Math.round(size * 0.11); // ~11% margin each side for the mask safe zone
  const inner = size - pad * 2;
  await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: WHITE })
    .flatten({ background: WHITE })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: WHITE })
    .png()
    .toFile(join(OUT, name));
  console.log("wrote", name, `(${size}x${size}, maskable)`);
}

await any("icon-192.png", 192);
await any("icon-512.png", 512);
await maskable("icon-maskable.png", 512);
await any("apple-touch-icon.png", 180);
