// One-shot: bake the hero glass's ground texture.
//
//   node scripts/bake-glass-ground.mjs <source picture> [width] [quality]
//
// The source is the 16:9 ring picture behind the glass in Figma (node
// 4886:1856); it is not in the repo. The frame blurs it progressively, less at
// the top and more at the foot, and that depends only on the row, so it is
// baked here and the shader (src/components/HomeHero/glass-shader.ts) samples
// it once. BLUR_TOP and BLUR_FOOT are the blur's sigma as a share of the
// picture's height, fitted to the exported frame on 2026-11-14 (7.9px and
// 40.9px of 1024).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const BLUR_TOP = 7.9 / 1024;
const BLUR_FOOT = 40.9 / 1024;
const LEVELS = 24;

const [source, width = "512", quality = "0.8"] = process.argv.slice(2);
if (!source) throw new Error("usage: bake-glass-ground.mjs <source picture> [width] [quality]");

const browser = await chromium.launch();
const page = await browser.newPage();
const webp = await page.evaluate(
  async ({ url, outWidth, quality, top, foot, levels }) => {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    const outHeight = Math.round((outWidth * picture.height) / picture.width);
    // Worked at twice the output, with a black margin for the blur to read.
    const w = outWidth * 2;
    const h = outHeight * 2;
    const pad = Math.ceil(foot * h * 3);
    const blurred = Array.from({ length: levels }, (_, i) => {
      const sigma = (top + ((foot - top) * i) / (levels - 1)) * h;
      const canvas = new OffscreenCanvas(w + 2 * pad, h + 2 * pad);
      const context = canvas.getContext("2d");
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.filter = `blur(${sigma}px)`;
      context.drawImage(picture, pad, pad, w, h);
      return context.getImageData(pad, pad, w, h).data;
    });
    // Each row from the two levels either side of its own blur.
    const out = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      const at = ((y + 0.5) / h) * (levels - 1);
      const low = Math.min(levels - 2, Math.floor(at));
      const t = at - low;
      for (let i = y * w * 4; i < (y + 1) * w * 4; i++) {
        out.data[i] = blurred[low][i] * (1 - t) + blurred[low + 1][i] * t;
      }
    }
    const full = new OffscreenCanvas(w, h);
    full.getContext("2d").putImageData(out, 0, 0);
    const small = new OffscreenCanvas(outWidth, outHeight);
    const context = small.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(full, 0, 0, outWidth, outHeight);
    const blob = await small.convertToBlob({ type: "image/webp", quality });
    return [...new Uint8Array(await blob.arrayBuffer())];
  },
  {
    url: `data:image/png;base64,${readFileSync(source).toString("base64")}`,
    outWidth: Number(width),
    quality: Number(quality),
    top: BLUR_TOP,
    foot: BLUR_FOOT,
    levels: LEVELS,
  },
);
await browser.close();

const target = new URL("../public/hero/glass/ground.webp", import.meta.url);
writeFileSync(target, Buffer.from(webp));
console.log(`ground.webp: ${webp.length} bytes`);
