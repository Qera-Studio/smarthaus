import { test, expect, addressFor, type Page } from "./fixtures";
import { mailFor, uniqueName } from "./mail";

/**
 * The send ceiling as a visitor meets it: five enquiries from one address go
 * through, the sixth is refused with its own message, and nothing is sent.
 * Emails land in the e2e mail sink, so this costs no Resend quota.
 *
 * Each test pins its own address, per project and retry, because locally every
 * project shares one server and would otherwise share one bucket.
 */

async function sendShort(page: Page, name: string) {
  await page.goto("/");
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("0543755150");
  await form.getByRole("button", { name: "Book a site visit" }).click();
}

async function pin(page: Page, label: string) {
  const info = test.info();
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": addressFor(
      `${label}:${info.project.name}:${info.retry}:${info.repeatEachIndex}`,
    ),
  });
}

test("five sends go through, and the sixth is refused with its own message", async ({ page }) => {
  await pin(page, "rate-limit-sixth");
  const marker = uniqueName("Limit");
  for (let i = 1; i <= 5; i += 1) {
    await sendShort(page, `${marker} ${i}`);
    await expect(page.getByRole("status"), `send ${i}`).toBeVisible();
  }

  await sendShort(page, `${marker} 6`);
  const alert = page
    .locator('section[aria-labelledby="home-enquiry"]')
    .getByRole("alert")
    .filter({ hasText: "Several enquiries" });
  await expect(alert).toContainText(
    "Several enquiries have come from here in the last few minutes, so this one was not sent. Try again in a few minutes.",
  );
  await expect(alert.getByRole("link", { name: "Message us on WhatsApp" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);

  // Five emails written, and not a sixth.
  await expect.poll(async () => (await mailFor(marker)).length).toBe(5);
  expect(await mailFor(`${marker} 6`)).toEqual([]);
});

test("a refused visitor keeps what they typed", async ({ page }) => {
  await pin(page, "rate-limit-refill");
  const marker = uniqueName("Refill");
  for (let i = 1; i <= 5; i += 1) {
    await sendShort(page, `${marker} ${i}`);
    await expect(page.getByRole("status")).toBeVisible();
  }
  await sendShort(page, `${marker} kept`);
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  await expect(form.getByRole("alert").filter({ hasText: "Several enquiries" })).toBeVisible();
  await expect(form.getByLabel("Name")).toHaveValue(`${marker} kept`);
  await expect(form.getByLabel("Phone")).toHaveValue("0543755150");
});

test("another visitor is unaffected while one is refused", async ({ page, browser }) => {
  await pin(page, "rate-limit-first");
  const marker = uniqueName("Busy");
  for (let i = 1; i <= 6; i += 1) await sendShort(page, `${marker} ${i}`);
  await expect(page.getByRole("alert").filter({ hasText: "Several enquiries" })).toBeVisible();

  const other = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": addressFor(
        `rate-limit-other:${test.info().project.name}:${test.info().retry}`,
      ),
    },
  });
  const otherPage = await other.newPage();
  await sendShort(otherPage, uniqueName("Other visitor"));
  await expect(otherPage.getByRole("status")).toBeVisible();
  await other.close();
});

test("failed validations do not use up the allowance", async ({ page }) => {
  await pin(page, "rate-limit-typos");
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  await page.goto("/");
  for (let i = 0; i < 6; i += 1) {
    await form.getByLabel("Name").fill("Typo");
    await form.getByLabel("Phone").fill("12");
    await form.getByRole("button", { name: "Book a site visit" }).click();
    await expect(form.getByRole("alert").first()).toBeVisible();
  }
  await sendShort(page, uniqueName("After typos"));
  await expect(page.getByRole("status")).toBeVisible();
});
