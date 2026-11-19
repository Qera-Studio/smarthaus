// One-shot: draw the connectivity section's ground once, as a picture.
//
//   node scripts/bake-connectivity-ground.mjs
//
// The ground is Figma's export, public/landing/connectivity/bg.svg: six
// ellipses under a Gaussian blur of 100px. Painted as an SVG, WebKit redraws
// those blurs at 3x on a phone as the section scrolls in, long enough to drop
// the frames the scroll reveal watches for (found 2026-11-16). A blur scales up
// without showing it, so half the frame's size is enough.
//
// Drawn by Chromium, not sharp: librsvg's blur put the mean 6 levels darker and
// single pixels 77 off, where Chromium and WebKit agree with each other.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] }));

const DIR = "public/landing/connectivity";
const OUT = { width: 600, height: 297 };

const svg = readFileSync(`${DIR}/bg.svg`).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: OUT });
await page.setContent(
  `<body style="margin:0"><img style="display:block" width="${OUT.width}" height="${OUT.height}" src="data:image/svg+xml;base64,${svg}">`,
);
await page.locator("img").evaluate((img) => img.decode());
const png = await page.screenshot();
await browser.close();

const info = await sharp(png)
  .removeAlpha()
  .webp({ quality: 92, smartSubsample: true })
  .toFile(`${DIR}/ground.webp`);
console.log(`ground.webp ${info.width}x${info.height}, ${info.size} bytes`);
