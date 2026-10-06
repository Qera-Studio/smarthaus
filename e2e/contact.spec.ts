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
  await expect(page.getByRole("heading", { level: 1, name: "Book a site visit" })).toBeVisible();
  // The placeholder's noindex must be gone, or the real page never ranks.
  const robots = await page.locator('head meta[name="robots"]').getAttribute("content");
  expect(robots).toMatch(/^index, follow/);
  expect(robots).not.toContain("noindex");
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
  await expect(status).toContainText(
    "We’ll usually call you on +971543755150 during business hours.",
  );

  // The form is replaced, not merely hidden.
  await expect(form(page).getByLabel("Name")).toHaveCount(0);
  await expect(status.getByRole("link", { name: /WhatsApp/i })).toBeVisible();

  // Spacing, at the client's call (2026-10-06): the body at the normal line
  // height, 32px above the WhatsApp button, and 24px above the solutions link.
  const body = status.getByText("If you’d rather not wait");
  const lineHeight = await body.evaluate((el) => {
    const style = getComputedStyle(el);
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
  });
  expect(lineHeight).toBeCloseTo(1.5, 2);
  const [bodyBottom, buttonTop] = await Promise.all([
    body.evaluate((el) => el.getBoundingClientRect().bottom),
    status
      .getByRole("link", { name: /WhatsApp/i })
      .evaluate((el) => el.getBoundingClientRect().top),
  ]);
  expect(Math.round(buttonTop - bodyBottom)).toBe(32);
  await expect(status.getByRole("link", { name: "See what we install" })).toHaveCSS(
    "margin-top",
    "24px",
  );
});

test("an empty submission names both required fields and focuses the first", async ({ page }) => {
  // Focus management is client behaviour: tap only once it is live. On CI's
  // WebKit runner a tap before hydration went down the no-JS path instead.
  await expectHydrated(page);
  await page.getByRole("button", { name: "Book a site visit" }).click();

  // Each field's own message (the summary above repeats them as links).
  await expect(page.locator("#name-error")).toHaveText(
    "Add your name so we know who we're calling.",
  );
  await expect(page.locator("#phone-error")).toHaveText(
    "Add a phone number so we can call you back.",
  );

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

  await expect(page.locator("#phone-error")).toHaveText(
    "Check the number. It should start with +971 or 05.",
  );
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
  // The site and page schema are here (business, website, page); what must
  // not be is a FAQPage, or any node carrying the fee.
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
  expect(blocks.join("")).not.toContain('"FAQPage"');
  expect(blocks.join("")).not.toMatch(/1,?500/);
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

// Every section on the page pairs a title on the left with its content on the
// right. The channels sit there as three columns, label over value, with the
// labels on one line and the values on another (2026-10-04).
test("puts the contact channels in the right column, three across, label over value", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the two-column page starts at lg");
  await page.setViewportSize({ width: 1440, height: 900 });
  const section = page.locator("section[aria-labelledby='get-in-touch']");
  const rows = await section.locator("li").evaluateAll((els) =>
    els.map((li) => {
      const at = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right) };
      };
      return { label: at(li.querySelector("span")!), value: at(li.querySelector("a")!) };
    }),
  );
  const column = await page
    .locator("section[aria-labelledby='location'] > div")
    .evaluate((el) => Math.round(el.getBoundingClientRect().x));

  expect(rows).toHaveLength(3);
  // Starts at the right column's edge, and runs left to right.
  expect(rows[0]!.label.x).toBe(column);
  expect(rows[1]!.label.x).toBeGreaterThan(rows[0]!.label.right);
  expect(rows[2]!.label.x).toBeGreaterThan(rows[1]!.value.right);
  // One line of labels, one line of values below them.
  expect(new Set(rows.map((r) => r.label.y)).size).toBe(1);
  expect(new Set(rows.map((r) => r.value.y)).size).toBe(1);
  expect(rows[0]!.value.y).toBeGreaterThan(rows[0]!.label.y);
  // Air between a label and its value, not two lines set flush.
  const gap = await section
    .locator("li")
    .first()
    .evaluate((li) => {
      const label = li.querySelector("span")!.getBoundingClientRect();
      return Math.round(li.querySelector("a")!.getBoundingClientRect().top - label.bottom);
    });
  expect(gap).toBeGreaterThanOrEqual(8);
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
  await expect(page.locator("#contactConsent-error")).toHaveText(
    "Please confirm you would like us to contact you about your enquiry.",
  );
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

// Validation is server-only. The form once imported three plain constants
// from the Zod schema module, which shipped and ran all of Zod in the
// browser at load (src/lib/contact-fields.ts). Nothing the browser runs may
// contain it; Zod's class names survive minification as strings.
test.describe("the browser's share of the form", () => {
  for (const path of ["/contact", "/"]) {
    test(`${path} loads no Zod`, async ({ page }) => {
      const scripts: string[] = [];
      page.on("response", async (response) => {
        if (response.request().resourceType() === "script") scripts.push(response.url());
      });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(scripts.length).toBeGreaterThan(0);
      for (const url of scripts) {
        const body = await (await page.request.get(url)).text();
        expect({ url, zod: /ZodObject|ZodError|ZodString/.test(body) }).toEqual({
          url,
          zod: false,
        });
      }
    });
  }
});
