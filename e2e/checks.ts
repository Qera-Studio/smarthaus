import AxeBuilder from "@axe-core/playwright";
import { buildConsentRecord, CONSENT_COOKIE } from "../src/lib/consent";
import { expect, test, type Locator, type Page } from "./fixtures";

/**
 * The checks every page suite makes, in one place so they cannot drift apart.
 * Before this file there were twelve copies of the axe call, nine of the
 * overflow check in three different strengths, and eleven em-dash checks, some
 * reading `innerText` (which skips a closed <details>) and some `textContent`.
 * Each helper here is the strictest of the versions it replaced.
 *
 * Specs import AxeBuilder only through this file (eslint.config.mjs), so a new
 * suite cannot quietly run a narrower axe than the rest.
 */

/**
 * axe with every rule it ships, best-practice included: no tag filter, which
 * is what every suite ran before. A filter would narrow it silently.
 *
 * On failure the full violations are attached to the report, and the message
 * lists each rule with the elements it flagged.
 */
export async function expectAccessible(page: Page, options: { include?: string } = {}) {
  // Scan the settled state, not a frame of a transition. axe reads computed
  // colours at one instant, so a label caught half way through its light-to-
  // dark swap is measured as the blend: on 2026-09-27 the back-to-top label
  // failed color-contrast on Galaxy S24 under load and passed at 0, 300 and
  // 1500ms when probed alone. Only CSS transitions are waited for: scroll-
  // driven and looping animations never finish and are the resting state.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((a) => a instanceof CSSTransition && a.playState === "running").length,
        ),
      { message: "CSS transitions still running before the axe scan", timeout: 5_000 },
    )
    .toBe(0);
  let builder = new AxeBuilder({ page });
  if (options.include) builder = builder.include(options.include);
  const { violations } = await builder.analyze();
  if (violations.length > 0) {
    await test.info().attach("axe violations", {
      body: JSON.stringify(violations, null, 2),
      contentType: "application/json",
    });
  }
  expect(
    violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")})`,
    ),
    "axe violations",
  ).toEqual([]);
}

/**
 * The document is no wider than the viewport. `clientWidth`, not
 * `innerWidth`: innerWidth includes a classic scrollbar, so comparing against
 * it hid up to its width of overflow, and some copies added a further pixel.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `the page is ${scroll - client}px wider than the viewport`).toBeLessThanOrEqual(
    client,
  );
}

/**
 * No em dash anywhere in the scope, the house copy rule. `textContent`, not
 * `innerText`: a closed <details> hides its answer from the rendered text, and
 * that is exactly the copy most likely to be pasted in from elsewhere.
 */
export async function expectNoEmDash(scope: Locator) {
  const text = (await scope.textContent()) ?? "";
  const at = text.indexOf("—");
  expect(
    at,
    at < 0 ? "no em dash" : `em dash in: "${text.slice(Math.max(0, at - 40), at + 40).trim()}"`,
  ).toBe(-1);
}

/**
 * The page has hydrated: its client components are live. The consent region
 * is rendered only by a client effect on a first visit, which every test's
 * fresh context is, so its presence means React has run.
 *
 * For tests of client behaviour (focus moving to an error, a client-side route
 * change). Without it, a tap on CI's slower WebKit runner can land before
 * hydration and exercise the no-JavaScript path instead of the one asserted.
 */
export async function expectHydrated(page: Page) {
  await expect(page.getByRole("region", { name: "Cookie preferences" })).toBeAttached({
    timeout: 15_000,
  });
}

/**
 * A consent choice already on file, so the banner never mounts. For tests
 * whose subject is the page's own layout: the banner adds its height to the
 * footer's padding while it shows (Footer.module.scss), which is right for a
 * visitor and noise for a geometry test. The record comes from the app's own
 * builder, so it cannot drift from what the site writes.
 */
export async function withConsentDecided(page: Page) {
  const url = test.info().project.use.baseURL ?? "http://127.0.0.1:3210";
  await page.context().addCookies([
    {
      name: CONSENT_COOKIE,
      value: encodeURIComponent(JSON.stringify(buildConsentRecord(false))),
      url,
    },
  ]);
}
