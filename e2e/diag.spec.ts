import { test } from "./fixtures";
import type { Page } from "@playwright/test";

// Temporary diagnostic, never merged: does the strip's layer stall Linux WebKit?
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
  const strip = await page.evaluate(() => {
    const t = document.querySelector("[data-hero-strip] > div");
    return t ? `${Math.round(t.getBoundingClientRect().width)}x${Math.round(t.getBoundingClientRect().height)} dpr=${devicePixelRatio}` : "none";
  });
  console.log(`DIAG ${label}: ${frames} track=${strip}`);
}

const VARIANTS: Record<string, string> = {
  shipped: "",
  earlyNoStrip: "[data-hero-strip] { display: none !important; }",
  earlyNoAnimation: "[data-hero-strip] > div { animation: none !important; }",
  earlyOneCopy: "[data-hero-strip] ul[data-copy] { display: none !important; }",
};
for (const [name, css] of Object.entries(VARIANTS)) {
  test(`/ ${name}`, async ({ page }) => {
    test.setTimeout(30_000);
    if (css) await early(page, css);
    await page.goto("/");
    await measure(page, name);
  });
}

test("/ reduced motion", async ({ page }) => {
  test.setTimeout(30_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await measure(page, "reducedMotion");
});

for (const dpr of [1, 2]) {
  test(`/ dpr ${dpr}`, async ({ browser }) => {
    test.setTimeout(30_000);
    const use = test.info().project.use;
    const context = await browser.newContext({
      viewport: use.viewport,
      userAgent: use.userAgent,
      isMobile: use.isMobile,
      hasTouch: use.hasTouch,
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    await page.goto(new URL("/", use.baseURL).href);
    await measure(page, `dpr${dpr}`);
    await context.close();
  });
}
