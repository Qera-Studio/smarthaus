import AxeBuilder from "@axe-core/playwright";
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
