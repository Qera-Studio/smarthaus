import { createHash } from "node:crypto";
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
type Options = { villa: boolean; clientAddress: string | undefined };

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
 * docs/runbooks/vercel-firewall.md for how that was confirmed.
 */
export function addressFor(seed: string): string {
  const [a, b, c] = createHash("sha256").update(seed).digest();
  // 10.0.0.0/8, never 10.x.x.0 or .255, so it always reads as one host.
  return `10.${a}.${b}.${(c! % 254) + 1}`;
}

export const test = base.extend<Options & { villaGate: void; clientGate: void }>({
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
