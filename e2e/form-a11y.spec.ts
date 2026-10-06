import { test, expect, type Page } from "./fixtures";
import { expectAccessible, expectHydrated } from "./checks";
import { mailFor, uniqueName } from "./mail";

/**
 * The contact form's accessibility, in a real browser: the phone format in its label,
 * one summary of every problem, and a submit button that stays focusable while
 * it sends without ever sending twice.
 */

const form = (page: Page) => page.locator("main");

test.beforeEach(async ({ page }) => {
  await page.goto("/contact");
  await expectHydrated(page);
});

test("states the phone format in its label, and no hint line until a value is wrong", async ({
  page,
}) => {
  await expect(form(page).getByRole("textbox", { name: "Phone (UAE mobile)" })).toBeVisible();
  await expect(form(page).getByLabel("Phone")).not.toHaveAttribute("aria-describedby");
  await expect(form(page).getByLabel("Message")).not.toHaveAttribute("aria-describedby");
  await expect(form(page).getByText("A UAE mobile number", { exact: false })).toHaveCount(0);
  await expect(form(page).getByText("Up to 2,000 characters")).toHaveCount(0);
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

test.describe("the form's look, at the client's call (2026-10-06)", () => {
  test("keeps the lighter placeholder above AA contrast on the canvas", async ({ page }) => {
    const ratio = await form(page)
      .getByLabel("Name")
      .evaluate((input) => {
        const rgb = (value: string) =>
          value
            .match(/\d+(\.\d+)?/g)!
            .slice(0, 3)
            .map(Number);
        const lum = ([r, g, b]: number[]) => {
          const [R, G, B] = [r!, g!, b!].map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * R! + 0.7152 * G! + 0.0722 * B!;
        };
        const text = lum(rgb(getComputedStyle(input, "::placeholder").color));
        // The canvas is painted on <html>; body and the form are transparent.
        const ground = lum(rgb(getComputedStyle(document.documentElement).backgroundColor));
        return (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05);
      });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(5);
  });

  test("sets the two field columns 64px apart", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, "one column below md");
    const [name, email] = await Promise.all(
      ["Name", "Email"].map((label) =>
        form(page)
          .getByLabel(label)
          .evaluate((el) => el.closest("[class*='field']")!.getBoundingClientRect()),
      ),
    );
    expect(Math.round(email!.left - name!.right)).toBe(64);
  });

  test("draws the tick boxes at 22px, and the whole label still ticks them", async ({ page }) => {
    const box = form(page).getByRole("checkbox", { name: /I would like Smarthaus/ });
    const size = await box.evaluate((el) => el.getBoundingClientRect());
    expect([size.width, size.height]).toEqual([22, 22]);
    await form(page).getByText("I would like Smarthaus to contact me").click();
    await expect(box).toBeChecked();
  });
});
