import { createHash } from "node:crypto";
import { test as base } from "@playwright/test";

import { SPLASH_SEEN_KEY } from "../src/lib/splash-boot";

export { expect, devices, type Locator, type Page } from "@playwright/test";

/**
 * Every spec imports `test` from here, never from @playwright/test. ESLint
 * enforces it (eslint.config.mjs) and so does scripts/__tests__/e2e-fixtures.test.ts.
 *
 * ## The villa is off unless a spec asks for it
 *
 * The hero's three.js villa renders every animation frame while the hero is on
 * screen. In a headless browser the GPU is software-emulated, so each frame of
 * the model is expensive, and under parallel load it blocked the main thread
 * for up to 3s: the back-to-top button's smooth scroll stalled at 687px and
 * failed its test (measured 2026-09-26: 1.0s to the top with the model
 * blocked, 1.5s with it, multi-second stalls under contention).
 *
 * Decided 2026-09-26: switch the villa off in e2e rather than change how the
 * hero renders. It is switched off through the product's own gate, not a test
 * hook: every page reports Save-Data, which VillaCanvas already honours by
 * keeping the poster and loading no three.js. Nothing else on the site reads
 * Save-Data (checked). A spec that tests the villa opts back in with
 *   test.use({ villa: true });
 *
 * The recorded cost: e2e no longer measures what the villa does to scrolling
 * and input on a slow machine. That is a known gap, not a fixed one.
 *
 * Contexts a test creates itself (browser.newContext) do not get this; none of
 * them load the homepage today.
 *
 * 2026-09-28: the homepage now mounts the fluid hero (FluidHero/FluidCanvas),
 * which honours the same Save-Data gate, so this fixture keeps it off in the
 * same way and `villa: true` opts back in to whichever hero canvas is mounted.
 * The option keeps its name: renaming it touches every spec for no behaviour.
 */
type Options = { villa: boolean; splash: boolean; clientAddress: string | undefined };

/*
 * ## The splash is seen unless a spec asks for it
 *
 * The first full load in a tab shows the loading splash over the page for up
 * to 2.5s (src/lib/splash-boot.ts). Every test is a first load, so every test
 * would wait behind it, and any test that reads what is on screen by point or
 * by pixel would read the splash. Each page therefore starts with the splash
 * marked as seen in sessionStorage, through the same key the product reads.
 * e2e/splash.spec.ts opts back in with
 *   test.use({ splash: true });
 */

/**
 * ## Every test is its own visitor
 *
 * Enquiry sends are rate-limited per client address (src/lib/rate-limit.ts),
 * and every test reaches the server from loopback, so the whole suite would
 * share one bucket of five sends. Each test instead presents its own
 * x-forwarded-for, derived from the test, its retry and its repeat, so no two
 * runs of anything share a bucket. A spec that tests the limit itself pins one
 * address with test.use({ clientAddress: "…" }).
 *
 * Trusting the header is safe only because production runs on Vercel, which
 * overwrites x-forwarded-for with the real client address; the e2e server is
 * `next start` on loopback, which passes it through. See
 * docs/runbooks/vercel-firewall.md for the platform guarantee this relies on.
 */
export function addressFor(seed: string): string {
  const [a, b, c] = createHash("sha256").update(seed).digest();
  // 10.0.0.0/8, never 10.x.x.0 or .255, so it always reads as one host.
  return `10.${a}.${b}.${(c! % 254) + 1}`;
}

export const test = base.extend<Options & { villaGate: void; clientGate: void; splashGate: void }>({
  splash: [false, { option: true }],
  splashGate: [
    async ({ page, splash }, use) => {
      if (!splash) {
        await page.addInitScript((key) => {
          try {
            window.sessionStorage.setItem(key, "1");
          } catch {
            // Storage blocked: the product shows no splash either.
          }
        }, SPLASH_SEEN_KEY);
      }
      await use();
    },
    { auto: true },
  ],
  clientAddress: [undefined, { option: true }],
  clientGate: [
    async ({ context, clientAddress }, use, testInfo) => {
      const address =
        clientAddress ??
        addressFor(`${testInfo.testId}:${testInfo.retry}:${testInfo.repeatEachIndex}`);
      await context.setExtraHTTPHeaders({ "x-forwarded-for": address });
      await use();
    },
    { auto: true },
  ],
  villa: [false, { option: true }],
  villaGate: [
    async ({ page, villa }, use) => {
      if (!villa) {
        await page.addInitScript(() => {
          const connection = (navigator as Navigator & { connection?: object }).connection ?? {};
          Object.defineProperty(navigator, "connection", {
            configurable: true,
            value: { ...connection, saveData: true },
          });
        });
      }
      await use();
    },
    { auto: true },
  ],
});
