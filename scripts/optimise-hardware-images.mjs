/**
 * One-shot: shrink the raw hardware renders in place.
 *
 * Same job as optimise-process-images.mjs, for public/hero/hardware/. These
 * arrived as 4 to 8MB PNGs at up to 4800px; deviceSizes tops out at 2048.
 * Three carry an alpha channel that is never visibly used (checked by
 * compositing over magenta), so every file is flattened to JPEG and the PNG
 * removed. Re-run is harmless: already-small JPEGs are skipped.
 */
import { readdir, stat, rename, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] }));

const DIR = "public/hero/hardware";
const MAX_EDGE = 2560;

const files = (await readdir(DIR)).filter((f) => /\.(png|jpe?g)$/i.test(f));
let before = 0;
let after = 0;

for (const file of files) {
  const path = join(DIR, file);
  const start = (await stat(path)).size;
  before += start;

  const { width = 0, height = 0 } = await sharp(path).metadata();
  const isJpeg = /\.jpe?g$/i.test(file);
  if (isJpeg && Math.max(width, height) <= MAX_EDGE) {
    after += start;
    console.log(`${file}: already ${width}x${height}, skipped`);
    continue;
  }

  const out = path.replace(/\.\w+$/, ".jpg");
  const tmp = `${out}.tmp`;
  await sharp(path)
    .flatten({ background: "#ffffff" })
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(tmp);
  if (!isJpeg) await unlink(path);
  await rename(tmp, out);

  const end = (await stat(out)).size;
  after += end;
  const meta = await sharp(out).metadata();
  console.log(
    `${file}: ${width}x${height} ${(start / 1e6).toFixed(1)}MB -> ${meta.width}x${meta.height} ${(end / 1e6).toFixed(1)}MB`,
  );
}

console.log(`\ntotal: ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(1)}MB`);
