import { test, expect, type Page } from "./fixtures";
import { expectAccessible, expectHydrated } from "./checks";
import { mailFor, uniqueName } from "./mail";

/**
 * The contact form's accessibility, in a real browser: hints before errors,
 * one summary of every problem, and a submit button that stays focusable while
 * it sends without ever sending twice.
 */

const form = (page: Page) => page.locator("main");

test.beforeEach(async ({ page }) => {
  await page.goto("/contact");
  await expectHydrated(page);
});

test("states the phone format and the message limit before anything is typed", async ({ page }) => {
  await expect(form(page).getByLabel("Phone")).toHaveAccessibleDescription(
    "A UAE mobile number. Starting with 05 or +971 both work.",
  );
  await expect(form(page).getByLabel("Message")).toHaveAccessibleDescription(
    "Optional. Up to 2,000 characters.",
  );
});

test("an empty submission summarises every problem once, as the only alert", async ({ page }) => {
  await page.getByRole("button", { name: "Book a site visit" }).click();
  const summary = form(page).getByRole("alert");
  await expect(summary).toHaveCount(1);
  await expect(summary).toContainText("Check these before sending:");
  await expect(summary.getByRole("link")).toHaveText([
    "Add your name so we know who we're calling.",
    "Add a phone number so we can call you back.",
    "Please confirm you would like us to contact you about your enquiry.",
  ]);
});

test("each summary link takes the visitor to its field", async ({ page }) => {
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await form(page)
    .getByRole("alert")
    .getByRole("link", { name: /Add a phone number/ })
    .click();
  await expect(form(page).getByLabel("Phone")).toBeFocused();
});

test("focus lands on the first field in error, which reads its message", async ({ page }) => {
  await page.getByRole("button", { name: "Book a site visit" }).click();
  const name = form(page).getByLabel("Name");
  await expect(name).toBeFocused();
  await expect(name).toHaveAccessibleDescription("Add your name so we know who we're calling.");
});

test("passes axe with the summary and the field errors showing", async ({ page }) => {
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await expect(form(page).getByRole("alert")).toBeVisible();
  await expectAccessible(page);
});

test("while sending, the button stays focusable and busy, and a second press sends nothing", async ({
  page,
}) => {
  const name = uniqueName("Double");
  await form(page).getByLabel("Name").fill(name);
  await form(page).getByLabel("Phone").fill("0543755150");
  await form(page)
    .getByLabel(/I would like Smarthaus to contact me/)
    .check();

  // Hold the server action's reply, so "sending" lasts long enough to press again.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/contact", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });

  const submit = page.getByRole("button", { name: "Book a site visit" });
  await submit.click();
  const sending = page.getByRole("button", { name: "Sending" });
  await expect(sending).toHaveAttribute("aria-busy", "true");
  await expect(sending).toHaveAttribute("aria-disabled", "true");
  // Not natively disabled, which would drop focus. (Playwright's own
  // toBeEnabled counts aria-disabled as disabled, so the property is read.)
  expect(await sending.evaluate((el) => (el as HTMLButtonElement).disabled)).toBe(false);
  await sending.focus();
  await expect(sending).toBeFocused();
  // Pressed again, from the keyboard, while the first send is held.
  await page.keyboard.press("Enter");

  release();
  await expect(page.getByRole("status")).toContainText(`Thanks, ${name}`);
  await expect.poll(async () => (await mailFor(name)).length).toBe(1);
  // And it stays at one: the second press was stopped, not merely late.
  await page.waitForTimeout(1_000);
  expect(await mailFor(name)).toHaveLength(1);
});
