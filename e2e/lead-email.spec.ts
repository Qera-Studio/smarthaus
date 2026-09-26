import { test, expect, type Page } from "./fixtures";
import { line, mailFor, sentMail, uniqueName } from "./mail";

/**
 * The email a lead produces, read back from the e2e mail sink: what reaches
 * the inbox, which is the system of record for every enquiry. Each test names
 * its lead uniquely, because every worker and device writes to one sink.
 */

const contactForm = (page: Page) => page.locator("main");
const homeForm = (page: Page) => page.locator('section[aria-labelledby="home-enquiry"]');

async function sendFullForm(page: Page, name: string, opts: { marketing?: boolean } = {}) {
  await page.goto("/contact");
  const form = contactForm(page);
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("054 375 5150");
  await form.getByLabel("Email").fill("lead@example.com");
  await form.getByLabel(/I would like Smarthaus to contact me/).check();
  if (opts.marketing) await form.getByLabel(/Occasionally send me new projects/).check();
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

test.describe("the full contact form's email", () => {
  test("is addressed with the lead's name, and replies go to the lead", async ({ page }) => {
    const name = uniqueName("Nadia");
    await sendFullForm(page, name);
    const mail = await sentMail(name);
    expect(mail.subject).toBe(`New enquiry — ${name}`);
    expect(mail.replyTo).toBe("lead@example.com");
    expect(line(mail, "Name")).toBe(name);
  });

  test("carries the phone in the canonical +971 form, whatever was typed", async ({ page }) => {
    const name = uniqueName("Ravi");
    await sendFullForm(page, name);
    expect(line(await sentMail(name), "Phone")).toBe("+971543755150");
  });

  test("records the contact tick, and marketing declined when left alone", async ({ page }) => {
    const name = uniqueName("Aditya");
    await sendFullForm(page, name);
    const mail = await sentMail(name);
    expect(line(mail, "Contact about this enquiry")).toBe("yes, ticked");
    expect(line(mail, "Marketing")).toBe("no");
  });

  test("records marketing as given when the box was ticked", async ({ page }) => {
    const name = uniqueName("Emma");
    await sendFullForm(page, name, { marketing: true });
    expect(line(await sentMail(name), "Marketing")).toBe("yes, ticked");
  });

  test("names the privacy policy version the visitor was shown, and when", async ({ page }) => {
    const name = uniqueName("James");
    const before = Date.now();
    await sendFullForm(page, name);
    const mail = await sentMail(name);
    expect(line(mail, "Privacy policy shown")).toBe("0.2.0-draft");
    const sentAt = Date.parse(line(mail, "Sent at")!);
    expect(sentAt).toBeGreaterThanOrEqual(before - 1000);
    expect(sentAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test("is written once per submission", async ({ page }) => {
    const name = uniqueName("Once");
    await sendFullForm(page, name);
    await sentMail(name);
    expect(await mailFor(name)).toHaveLength(1);
  });

  test("is never written when validation fails", async ({ page }) => {
    const name = uniqueName("Invalid");
    await page.goto("/contact");
    const form = contactForm(page);
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Phone").fill("12345");
    await form.getByLabel(/I would like Smarthaus to contact me/).check();
    await page.getByRole("button", { name: "Book a site visit" }).click();
    await expect(form.getByRole("alert").first()).toBeVisible();
    expect(await mailFor(name)).toEqual([]);
  });
});

test.describe("the homepage short form's email", () => {
  test("records consent as not asked, since the short form shows a notice instead", async ({
    page,
  }) => {
    const name = uniqueName("Short");
    await page.goto("/");
    const form = homeForm(page);
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Phone").fill("0543755150");
    await form.getByRole("button", { name: "Book a site visit" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    const mail = await sentMail(name);
    expect(line(mail, "Contact about this enquiry")).toBe("not asked (short form, notice only)");
    expect(line(mail, "Marketing")).toBe("not asked (short form, notice only)");
    expect(line(mail, "Interest")).toBe("not given");
    expect(mail.replyTo).toBeUndefined();
  });
});
