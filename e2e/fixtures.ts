import { test as base } from "@playwright/test";

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
 */
type Options = { villa: boolean };

export const test = base.extend<Options & { villaGate: void }>({
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
