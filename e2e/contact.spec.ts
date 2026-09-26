import { test, expect } from "./fixtures";
import {
  expectAccessible,
  expectHydrated,
  expectNoEmDash,
  expectNoHorizontalOverflow,
} from "./checks";

/**
 * The contact page — the site's only conversion event.
 *
 * What matters here is the form's behaviour under the three outcomes that are
 * invisible to a DOM assertion: a valid submission confirms with the details
 * the visitor typed, an invalid one names the specific field and puts focus
 * there, and a bot filling the honeypot is neither told nor delivered.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/contact");
});

/**
 * Every locator is scoped to main. The footer carries its own (disabled) email
 * field on every page, so an unscoped getByLabel("Email") is ambiguous — and
 * "the page has two email inputs" is a fact about the layout, not a bug to
 * design the page around.
 */
const form = (page: import("@playwright/test").Page) => page.locator("main");

test("responds with one h1 and is indexable", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  // The placeholder's noindex must be gone, or the real page never ranks.
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0);
});

test("passes axe accessibility checks", async ({ page }) => {
  await expectAccessible(page);
});

test("no em dashes in the copy, including the collapsed FAQ answers", async ({ page }) => {
  // The same house rule the legal and placeholder pages assert. textContent,
  // not innerText: a closed <details> hides its answer from the rendered text,
  // so innerText alone would let an em dash through in exactly the copy most
  // likely to be pasted in from elsewhere.
  await expectNoEmDash(page.locator("main"));
});

test("a valid submission confirms with the name and number given", async ({ page }) => {
  await form(page).getByLabel("Name").fill("Nadia");
  await form(page).getByLabel("Phone").fill("0543755150");
  await form(page).getByLabel("Email").fill("nadia@example.com");
  // Required, and deliberately unticked by default: a pre-ticked consent box is
  // basket sneaking, and a tick the visitor did not make is not a choice. So a
  // valid submission has to include this click.
  await form(page)
    .getByLabel(/I would like Smarthaus to contact me/)
    .check();

  await page.getByRole("button", { name: "Book a site visit" }).click();

  const status = page.getByRole("status");
  await expect(status).toBeVisible();
  // Both values are echoed back by the action, because the form is gone by the
  // time this renders and the copy interpolates them.
  await expect(status).toContainText("Thanks, Nadia");
  // A local 05… number typed in comes back as the canonical +971… form. The
  // copy promises a call on this number, so it has to be the number we stored.
  await expect(status).toContainText("+971543755150");
  // "Usually": the terms say no response time is guaranteed, so the
  // confirmation must not promise one.
  await expect(status).toContainText("We’ll usually call you on +971543755150 within the hour");

  // The form is replaced, not merely hidden.
  await expect(form(page).getByLabel("Name")).toHaveCount(0);
  await expect(status.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
});

test("an empty submission names both required fields and focuses the first", async ({ page }) => {
  // Focus management is client behaviour: tap only once it is live. On CI's
  // WebKit runner a tap before hydration went down the no-JS path instead.
  await expectHydrated(page);
  await page.getByRole("button", { name: "Book a site visit" }).click();

  await expect(page.getByText("Add your name so we know who we're calling.")).toBeVisible();
  await expect(page.getByText("Add a phone number so we can call you back.")).toBeVisible();

  // Focus must move to the first failing field, or a keyboard user is left at
  // the submit button with errors above them they were never told about.
  await expect(form(page).getByLabel("Name")).toBeFocused();

  // The form is still there.
  await expect(page.getByRole("button", { name: "Book a site visit" })).toBeVisible();
});

test("a badly formatted number is rejected on format, not presence", async ({ page }) => {
  await form(page).getByLabel("Name").fill("Ravi");
  await form(page).getByLabel("Phone").fill("+445551234567");

  await page.getByRole("button", { name: "Book a site visit" }).click();

  await expect(page.getByText("Check the number. It should start with +971 or 05.")).toBeVisible();
  await expect(form(page).getByLabel("Phone")).toBeFocused();
});

test("the honeypot rejects silently, with no error shown", async ({ page }) => {
  await form(page).getByLabel("Name").fill("Definitely A Human");
  await form(page).getByLabel("Phone").fill("0543755150");
  // A real visitor can never reach this field: it is visually hidden, out of
  // the tab order, and aria-hidden. Only a form-filling bot sets it.
  await page.locator('input[name="company"]').fill("Spam Co");

  await page.getByRole("button", { name: "Book a site visit" }).click();

  // Success shape, so the bot learns nothing about why it failed...
  await expect(page.getByRole("status")).toBeVisible();
  // ...and no error is surfaced. Scoped to main: Next mounts its own
  // route-announcer with role="alert" on every page, which is not ours.
  await expect(form(page).getByRole("alert")).toHaveCount(0);
});

test("the honeypot is hidden from everyone who is not a bot", async ({ page }) => {
  const honeypot = page.locator('input[name="company"]');
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("autocomplete", "off");
  // Clipped to a 1px box rather than display:none, which a bot would skip.
  await expect(honeypot).not.toBeInViewport();
});

test("every FAQ opens by keyboard", async ({ page }) => {
  const questions = page.locator("summary");
  const count = await questions.count();
  expect(count).toBe(5);

  for (let i = 0; i < count; i += 1) {
    const summary = questions.nth(i);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(summary.locator("xpath=..")).toHaveAttribute("open", "");
  }
});

test("no FAQ structured data while the assessment fee is unconfirmed", async ({ page }) => {
  // The AED 1,500 figure is `pending` in src/content/faq.ts. Structured data is
  // what an answer engine quotes verbatim, so it must not carry a price nobody
  // has signed off. /faq withholds its schema for the same reason.
  //
  // When the fee is confirmed, this assertion inverts rather than gets deleted.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test("the fee is stated once, and only where a reader can question it", async ({ page }) => {
  const answers = (await page.locator("details p").allTextContents()).join(" ");
  expect(answers).toContain("AED 1,500");
});

test("the FAQ does not claim a founding year", async ({ page }) => {
  // AGENTS.md: the founding year is a placeholder and must never be invented.
  // This is the answer most likely to acquire one by a well-meaning edit.
  //
  // Read from the DOM, not innerText: a closed <details> correctly excludes its
  // answer from the rendered text, and opening each one first would test the
  // disclosure rather than the copy.
  const answers = await page.locator("details p").allTextContents();
  const copy = answers.join(" ");

  expect(copy).toContain("SIRA-licensed Dubai company");
  expect(copy).not.toMatch(/operating since/i);
  expect(copy).not.toContain("[YEAR]");
});

test("the directions link opens safely off-site", async ({ page }) => {
  const link = page.getByRole("link", { name: "Get directions" });
  await expect(link).toHaveAttribute("href", /maps\.app\.goo\.gl/);
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("target", "_blank");
});

// The email is the longest of the three and the one that broke: in a half-width
// section it had 464px of row for 484px of text and wrapped mid-domain, so the
// address read "contact@mapletech.a / e". Height against line-height rather than
// a screenshot, because the failure is a second line and nothing else.
test("every contact channel stays on one line", async ({ page }) => {
  const values = page.locator("section[aria-labelledby='get-in-touch'] li a");
  await expect(values).toHaveCount(3);

  for (const value of await values.all()) {
    const lines = await value.evaluate((el) => {
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
      return Math.round(el.getBoundingClientRect().height / lineHeight);
    });
    expect(lines, `${await value.textContent()} wrapped`).toBe(1);
  }
});

test("the page does not overflow horizontally", async ({ page }) => {
  await expectNoHorizontalOverflow(page);
});

test("the consent boxes start unticked and the required one gates submission", async ({ page }) => {
  const contact = form(page).getByLabel(/I would like Smarthaus to contact me/);
  const marketing = form(page).getByLabel(/Occasionally send me new projects/);

  // Neither is pre-ticked. Both are named dark patterns if they are: a
  // pre-ticked box is basket sneaking, and bundled consent is prohibited
  // outright by Legal §6.
  await expect(contact).not.toBeChecked();
  await expect(marketing).not.toBeChecked();

  // Submitting with everything else valid still fails, and says why on the
  // field rather than flashing the whole form.
  await form(page).getByLabel("Name").fill("Ravi");
  await form(page).getByLabel("Phone").fill("0543755150");
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await expect(
    page.getByText("Please confirm you would like us to contact you about your enquiry."),
  ).toBeVisible();
});

test("the marketing box never gates submission", async ({ page }) => {
  // Marketing consent has to be separable from the enquiry: requiring it would
  // be exactly the bundling Legal §6 prohibits.
  await form(page).getByLabel("Name").fill("Aditya");
  await form(page).getByLabel("Phone").fill("0543755150");
  await form(page)
    .getByLabel(/I would like Smarthaus to contact me/)
    .check();
  // Marketing left untouched.
  await page.getByRole("button", { name: "Book a site visit" }).click();

  await expect(page.getByRole("status")).toBeVisible();
});

test("the required marker is visible text, not colour alone", async ({ page }) => {
  // A required marker a colourblind visitor cannot perceive is not a marker.
  await expect(form(page).getByText("(required)")).toBeVisible();
});
