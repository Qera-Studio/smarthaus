/**
 * One-shot: shrink the raw process photographs in place.
 *
 * next/image re-encodes on demand, but the originals still sit in public/, in
 * git history and in every deploy artefact. These arrived between 455KB and
 * 7.7MB (~24MB total) at up to 7952px on the long edge, which is far past
 * anything the site requests: deviceSizes tops out at 2048.
 *
 * 2560px long edge, quality 82, mozjpeg. Re-run is harmless — already-small
 * files are skipped.
 */
import { readdir, stat, rename } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

// sharp is a transitive dependency of next rather than a direct one, so pnpm
// does not hoist it and a bare `import "sharp"` fails from here. createRequire
// resolves it through next's own dependency graph, which is where it lives.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] }));

const DIR = "public/hero/process";
const MAX_EDGE = 2560;

const files = (await readdir(DIR)).filter((f) => f.endsWith(".jpg"));
let before = 0;
let after = 0;

for (const file of files) {
  const path = join(DIR, file);
  const start = (await stat(path)).size;
  before += start;

  const { width = 0, height = 0 } = await sharp(path).metadata();
  if (Math.max(width, height) <= MAX_EDGE) {
    after += start;
    console.log(`${file}: already ${width}x${height}, skipped`);
    continue;
  }

  // Write to a temp file first: sharp cannot read and write the same path.
  const tmp = `${path}.tmp`;
  await sharp(path)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(tmp);
  await rename(tmp, path);

  const end = (await stat(path)).size;
  after += end;
  const meta = await sharp(path).metadata();
  console.log(
    `${file}: ${width}x${height} ${(start / 1e6).toFixed(1)}MB -> ${meta.width}x${meta.height} ${(end / 1e6).toFixed(1)}MB`,
  );
}

console.log(`\ntotal: ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(1)}MB`);
