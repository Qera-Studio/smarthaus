import { createHash } from "node:crypto";
import { test, expect, type Page } from "./fixtures";
import { expectHydrated, withConsentDecided } from "./checks";

/**
 * The cookie banner paints with the page, not after hydration
 * (src/lib/consent-boot.ts). Blocking the app's JavaScript bundles leaves
 * exactly the server HTML plus the inline boot script: what a visitor sees in
 * the seconds before hydration on a slow phone, frozen so it can be asserted.
 */
const banner = (page: Page) => page.getByRole("region", { name: "Cookie preferences" });

/** Scripts only: the stylesheets share the chunks folder, and the CSS gate is under test. */
async function blockBundles(page: Page) {
  await page.route("**/_next/static/chunks/**", (route) =>
    route.request().resourceType() === "script" ? route.abort() : route.continue(),
  );
}

test("a first visit sees the banner before any bundle has run", async ({ page }) => {
  await blockBundles(page);
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute("data-consent", "ask");
  await expect(page.locator("html")).not.toHaveAttribute("data-consent-ready", /.*/);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole("button", { name: "Decline", exact: true })).toBeVisible();
  // Styled, so the stylesheet is live: the card paints its dark ground.
  expect(await banner(page).evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
});

test("a visitor with a choice on file never sees it, even before hydration", async ({ page }) => {
  await withConsentDecided(page);
  await blockBundles(page);
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute("data-consent", "decided");
  await expect(banner(page)).toBeHidden();
});

test("Global Privacy Control hides it before hydration too", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true }),
  );
  await blockBundles(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-consent", "decided");
  await expect(banner(page)).toBeHidden();
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the banner stays hidden, because its buttons could not work", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-consent", /.*/);
    await expect(banner(page)).toBeHidden();
    // The no-JS way to the same controls is still there.
    await expect(page.getByRole("link", { name: /cookie preferences/i }).first()).toBeAttached();
  });
});

test("once hydrated, React owns it: deciding removes it, and it stays gone", async ({ page }) => {
  await page.goto("/");
  await expectHydrated(page);
  await banner(page).getByRole("button", { name: "Decline", exact: true }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await expectHydrated(page);
  await expect(page.locator("html")).toHaveAttribute("data-consent", "decided");
  await expect(banner(page)).toHaveCount(0);
});

test("the strict policy's hash is the hash of the script the page actually serves", async ({
  page,
}) => {
  const response = await page.goto("/");
  const policy = response!.headers()["content-security-policy-report-only"]!;
  const script = await page
    .locator("head script:not([src])")
    .evaluateAll((els) =>
      els.map((el) => el.textContent ?? "").find((t) => t.includes("data-consent"))!,
    );
  const digest = createHash("sha256").update(script).digest("base64");
  expect(policy).toContain(`'sha256-${digest}'`);
  // And never in the enforced policy, where a hash would switch off
  // 'unsafe-inline' for every script Next emits.
  expect(response!.headers()["content-security-policy"]).not.toContain("'sha256-");
});
