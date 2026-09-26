import { test, expect } from "./fixtures";
import { line, sentMail, uniqueName } from "./mail";

/**
 * With JavaScript off, or before it has loaded on a slow phone, the site still
 * works: the enquiry form posts and answers, and links navigate. This is the
 * path a tap takes when it lands before hydration, which CI's WebKit runner
 * showed can happen. Progressive enhancement, asserted rather than assumed.
 */
test.use({ javaScriptEnabled: false });

test("an empty contact form posts and comes back naming both required fields", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await page.waitForLoadState("load");
  await expect(page.getByText("Add your name so we know who we're calling.")).toBeVisible();
  await expect(page.getByText("Add a phone number so we can call you back.")).toBeVisible();
});

test("a valid contact form posts, confirms, and the lead email is written", async ({ page }) => {
  const name = uniqueName("NoJS");
  await page.goto("/contact");
  const form = page.locator("main");
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("0543755150");
  await form.getByLabel(/I would like Smarthaus to contact me/).check();
  await page.getByRole("button", { name: "Book a site visit" }).click();
  await page.waitForLoadState("load");
  await expect(page.getByRole("status")).toContainText(`Thanks, ${name}`);
  expect(line(await sentMail(name), "Contact about this enquiry")).toBe("yes, ticked");
});

test("the homepage short form posts and confirms", async ({ page }) => {
  const name = uniqueName("NoJS short");
  await page.goto("/");
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("0543755150");
  await form.getByRole("button", { name: "Book a site visit" }).click();
  await page.waitForLoadState("load");
  await expect(page.getByRole("status")).toContainText(name.split(" ")[0]!);
});

test("a footer link navigates as a plain link", async ({ page }) => {
  await page.goto("/solutions");
  await page.getByRole("link", { name: "FAQs" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
