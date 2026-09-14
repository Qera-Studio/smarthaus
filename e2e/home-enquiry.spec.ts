import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The short enquiry form at the foot of the homepage, above the footer.
 *
 * It is the contact page's ContactForm in its `short` variant, so the shared
 * behaviour is already covered by contact.spec.ts. What this file asserts is
 * the part that is specific to the short form and would otherwise regress
 * silently: which fields it shows, which it does not, and that dropping the
 * consent checkbox did not drop the notice that replaced it.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/**
 * Scoped to the section, not to main. The footer carries its own disabled email
 * field on every page, so an unscoped getByLabel("Email") is ambiguous.
 */
const enquiry = (page: import("@playwright/test").Page) =>
  page.locator('section[aria-labelledby="home-enquiry"]');

test("sits above the footer", async ({ page }) => {
  const section = enquiry(page);
  await expect(section).toBeVisible();

  const sectionBox = await section.boundingBox();
  const footerBox = await page.locator("footer").boundingBox();
  expect(sectionBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  // Below the whole section, not merely below its top edge.
  expect(footerBox!.y).toBeGreaterThanOrEqual(sectionBox!.y + sectionBox!.height - 1);
});

test("shows exactly the four fields, and none of the three that were dropped", async ({ page }) => {
  const section = enquiry(page);

  await expect(section.getByLabel("Name")).toBeVisible();
  await expect(section.getByLabel("Email")).toBeVisible();
  await expect(section.getByLabel("Phone")).toBeVisible();
  await expect(section.getByLabel("Message")).toBeVisible();

  // The three the short form drops. Checked by name rather than by counting
  // inputs, so a future added field does not make this pass for the wrong
  // reason.
  await expect(section.locator('[name="community"]')).toHaveCount(0);
  await expect(section.locator('[name="interest"]')).toHaveCount(0);
  await expect(section.locator('[name="contactConsent"]')).toHaveCount(0);
  await expect(section.locator('[name="marketingConsent"]')).toHaveCount(0);
});

test("carries the notice that replaces the consent checkbox", async ({ page }) => {
  const section = enquiry(page);

  // Consent deck 6.4. Dropping the tick without this line would leave the form
  // collecting personal data while stating no purpose at all.
  await expect(section.getByText(/We use your details to answer your enquiry/)).toBeVisible();
  await expect(section.getByRole("link", { name: /Privacy Policy/ })).toHaveAttribute(
    "href",
    "/privacy",
  );
});

test("submits without a consent tick and confirms", async ({ page }) => {
  const section = enquiry(page);
  await section.getByLabel("Name").fill("James");
  await section.getByLabel("Phone").fill("0543755150");
  await section.getByLabel("Email").fill("james@example.com");

  await section.getByRole("button", { name: "Book a site visit" }).click();

  const status = page.getByRole("status");
  await expect(status).toBeVisible();
  await expect(status).toContainText("James");
});

test("still validates: a bad number names the field", async ({ page }) => {
  const section = enquiry(page);
  await section.getByLabel("Name").fill("James");
  await section.getByLabel("Phone").fill("12345");

  await section.getByRole("button", { name: "Book a site visit" }).click();

  await expect(section.getByRole("alert")).toContainText("+971");
});

test("the homepage still has exactly one h1", async ({ page }) => {
  // The section's heading is an h2. An h1 here would give the page two.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(enquiry(page).getByRole("heading", { level: 2 })).toBeVisible();
});

test("passes axe accessibility checks", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("no em dashes in the copy", async ({ page }) => {
  const copy = await enquiry(page).textContent();
  expect(copy).not.toContain("—");
});
