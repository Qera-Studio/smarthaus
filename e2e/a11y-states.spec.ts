import { test, expect, addressFor } from "./fixtures";
import { expectAccessible, expectHydrated, withConsentDecided } from "./checks";
import { uniqueName } from "./mail";
import type { Page } from "@playwright/test";

/** Hydrated, then the banner answered, so it neither covers a tap nor joins the scan. */
async function hydratedWithoutBanner(page: Page) {
  await expectHydrated(page);
  const region = page.getByRole("region", { name: "Cookie preferences" });
  await region.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(region).toHaveCount(0);
}

/**
 * Axe in the states a visitor opens, not only the one a page loads in. Every
 * route already passes axe as served (smoke, legal, faq, pricing and the
 * rest), and the invalid form and the error boundary have their own. These
 * are the others: each is markup that does not exist until someone acts, so a
 * load-time scan never sees it.
 */

test("the phone menu, open", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the toggle exists only below lg");
  await page.goto("/");
  await hydratedWithoutBanner(page);
  const toggle = page.getByRole("button", { name: /open menu/i });
  await toggle.click();
  await expect(page.getByRole("button", { name: /close menu/i })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expectAccessible(page);
});

test("the consent preferences panel, open", async ({ page }) => {
  await page.goto("/");
  await expectHydrated(page);
  const region = page.getByRole("region", { name: "Cookie preferences" });
  await region.getByRole("button", { name: "Choose what to share", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Analytics" })).toBeVisible();
  await expectAccessible(page);
});

test("the contact confirmation", async ({ page }) => {
  await page.goto("/contact");
  await hydratedWithoutBanner(page);
  const main = page.locator("main");
  const name = uniqueName("Axe confirm");
  await main.getByLabel("Name").fill(name);
  await main.getByLabel("Phone").fill("0543755150");
  await main.getByLabel(/I would like Smarthaus to contact me/).check();
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await expect(page.getByRole("status")).toContainText(`Thanks, ${name}`);
  await expectAccessible(page);
});

test("a form refused by the send limit", async ({ page }) => {
  const info = test.info();
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": addressFor(
      `a11y-refused:${info.project.name}:${info.retry}:${info.repeatEachIndex}`,
    ),
  });
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  const marker = uniqueName("Axe limit");
  // Banner left undecided, so its arrival proves each visit hydrated, and
  // Enter in the phone field submits without a tap the banner could take.
  for (let i = 1; i <= 6; i += 1) {
    await page.goto("/");
    await expectHydrated(page);
    await form.getByLabel("Name").fill(`${marker} ${i}`);
    await form.getByLabel("Phone").fill("0543755150");
    await form.getByLabel("Phone").press("Enter");
    if (i < 6) await expect(page.getByRole("status")).toBeVisible();
  }
  await expect(form.getByRole("alert").filter({ hasText: "Several enquiries" })).toBeVisible();
  await expectAccessible(page);
});

test("an FAQ answer, open", async ({ page }) => {
  await withConsentDecided(page);
  await page.goto("/faq");
  // A tap that lands mid-hydration can have its open state reset, which
  // flaked once on CI's iPhone runner. Same wait as the form tests above.
  await expectHydrated(page);
  const first = page.locator("main details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expectAccessible(page);
});

test("a pricing comparison row, open", async ({ page }) => {
  await withConsentDecided(page);
  await page.goto("/pricing");
  await expectHydrated(page);
  const row = page.locator("[data-pricing-comparison] details details").first();
  await row.locator("summary").click();
  await expect(row).toHaveAttribute("open", "");
  await expectAccessible(page);
});
