import { test, expect } from "./fixtures";
import { expectAccessible } from "./checks";

/**
 * The error boundary as a visitor meets it, through /e2e-error: a page that
 * throws under Playwright and is a 404 everywhere else.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e-error");
});

test("shows the branded error screen, not Next's default", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Something went wrong on our side",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("keeps the site's nav and footer, so the visitor is not stranded", async ({ page }) => {
  await expect(page.getByRole("contentinfo")).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeAttached();
});

test("shows a reference for the server log and nothing of the error itself", async ({ page }) => {
  await expect(page.getByText(/^Reference: \S+$/)).toBeVisible();
  const text = (await page.locator("main").textContent()) ?? "";
  expect(text).not.toContain("the error boundary under test");
  expect(text).not.toMatch(/\bat \S+ \(/);
});

test("offers the phone, WhatsApp and email", async ({ page }) => {
  // Within the error screen: the footer carries the same channels.
  const screen = page.getByRole("region", { name: "Something went wrong on our side" });
  await expect(screen.getByRole("link", { name: "+971 54 375 5150" })).toHaveAttribute(
    "href",
    "tel:+971543755150",
  );
  await expect(screen.getByRole("link", { name: "WhatsApp", exact: true })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\//,
  );
  await expect(screen.getByRole("link", { name: "contact@mapletech.ae" })).toBeVisible();
});

test("Try again re-renders, and lands on the error again while the page still throws", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Something went wrong on our side",
  );
});

test("passes axe", async ({ page }) => {
  await expectAccessible(page);
});

test("the route answers with a server error status", async ({ request }) => {
  expect((await request.get("/e2e-error")).status()).toBe(500);
});
