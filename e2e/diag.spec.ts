import { test } from "./fixtures";
import type { Page } from "@playwright/test";

// Temporary diagnostic, never merged: what in the strip stalls Linux WebKit?
async function early(page: Page, css: string) {
  await page.addInitScript((c) => {
    const add = () => {
      const s = document.createElement("style");
      s.textContent = c;
      (document.head ?? document.documentElement).append(s);
    };
    if (document.documentElement) add();
    else
      new MutationObserver((_, o) => {
        if (document.documentElement) {
          o.disconnect();
          add();
        }
      }).observe(document, { childList: true });
  }, css);
}

async function measure(page: Page, label: string) {
  await page.waitForTimeout(2000);
  const frames = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < 1000) requestAnimationFrame(f);
          else resolve(`frames=${n}`);
        };
        requestAnimationFrame(f);
        setTimeout(() => resolve(`TIMEOUT frames=${n}`), 5000);
      }),
  );
  console.log(`DIAG ${label}: ${frames}`);
}

const VARIANTS: Record<string, string> = {
  shipped: "",
  noBackdrop:
    "[data-hero-strip] *, [data-hero-strip] *::before { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }",
  noMask:
    "[data-hero-strip] *, [data-hero-strip] *::before { mask-image: none !important; -webkit-mask-image: none !important; }",
  noBefore: "[data-hero-strip] *::before { content: none !important; }",
  noIsolation: "[data-hero-strip] * { isolation: auto !important; }",
  noImages: "[data-hero-strip] img { display: none !important; }",
};
for (const [name, css] of Object.entries(VARIANTS)) {
  test(`/ ${name}`, async ({ page }) => {
    test.setTimeout(30_000);
    if (css) await early(page, css);
    await page.goto("/");
    await measure(page, name);
  });
}
