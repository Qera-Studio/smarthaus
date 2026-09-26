import { test, expect, type Page } from "./fixtures";

/**
 * What every footer link promises, on every device: where it goes, how it
 * opens, and what it tells a screen reader. The geometry lives in
 * footer.spec.ts, which runs on the desktop project only.
 */

const footer = (page: Page) => page.locator("footer");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("every external footer link opens a new tab without handing over the opener", async ({
  page,
}) => {
  const external = footer(page).locator('a[href^="http"]');
  const count = await external.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const link = external.nth(i);
    const href = await link.getAttribute("href");
    await expect(link, `${href} target`).toHaveAttribute("target", "_blank");
    const rel = ((await link.getAttribute("rel")) ?? "").split(/\s+/);
    expect(rel, `${href} rel`).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
  }
});

test("the phone link dials the E.164 number and shows the grouped one", async ({ page }) => {
  const tel = footer(page).locator('a[href^="tel:"]');
  await expect(tel).toHaveCount(1);
  await expect(tel).toHaveAttribute("href", "tel:+971543755150");
  await expect(tel).toContainText("+971 54 375 5150");
});

test("the email link opens a message to the published address", async ({ page }) => {
  const mail = footer(page).locator('a[href^="mailto:"]');
  await expect(mail).toHaveCount(1);
  await expect(mail).toHaveAttribute("href", "mailto:contact@mapletech.ae");
});

test.describe("social links", () => {
  const socials = (page: Page) => footer(page).locator("ul a[aria-label^='Smarthaus on']");

  test("there are five, each with an accessible name and a hidden icon", async ({ page }) => {
    await expect(socials(page)).toHaveCount(5);
    for (const link of await socials(page).all()) {
      await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("WhatsApp is the real channel and says so plainly", async ({ page }) => {
    const whatsapp = footer(page).getByRole("link", { name: "Smarthaus on WhatsApp", exact: true });
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+$/);
  });

  for (const platform of ["Instagram", "Facebook", "X", "LinkedIn"]) {
    test(`${platform} tells a screen reader the profile is coming soon`, async ({ page }) => {
      // Until the real profile exists the link lands on the platform's home
      // page, so its accessible name must not promise the Smarthaus profile.
      const link = footer(page).getByRole("link", {
        name: `Smarthaus on ${platform} (profile coming soon)`,
        exact: true,
      });
      await expect(link).toHaveCount(1);
      const href = new URL((await link.getAttribute("href"))!);
      expect(href.pathname).toBe("/");
    });
  }
});

test.describe("the newsletter field", () => {
  test("is disabled, with its reason tied to it for assistive technology", async ({ page }) => {
    const input = footer(page).getByLabel("Email address");
    await expect(input).toBeDisabled();
    await expect(footer(page).getByRole("button", { name: "Submit" })).toBeDisabled();
    const note = await input.getAttribute("aria-describedby");
    expect(note).toBeTruthy();
    await expect(page.locator(`#${note}`)).toHaveText("Newsletter opens soon.");
  });

  test("cannot be typed into, so no address is taken and silently dropped", async ({ page }) => {
    const input = footer(page).getByLabel("Email address");
    await input.fill("someone@example.com", { force: true }).catch(() => {});
    await expect(input).toHaveValue("");
  });
});

/**
 * KNOWN FAILURE, reported 2026-09-26. The footer's installation links point at
 * fragments of /solutions (#smart-home-automation and six more), and /solutions
 * is a coming-soon page with none of those ids, so every one lands at the top
 * of a placeholder. Fixing it is a content and routing decision on the plan
 * (Phase 4: point the links at /solutions without dead fragments until the page
 * exists). `test.fail` passes while the links are dead and fails the day they
 * resolve, so the fix has to update this test on purpose.
 */
test("every in-page fragment a footer link points to exists on its page", async ({ page }) => {
  test.fail(true, "footer /solutions#… links are dead until the Solutions page exists");
  const hrefs = await footer(page)
    .locator('a[href*="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => href.startsWith("/") && !href.startsWith("/#")),
    );
  expect(hrefs.length).toBeGreaterThan(0);
  const missing: string[] = [];
  for (const href of hrefs) {
    const [path, id] = href.split("#") as [string, string];
    await page.goto(path);
    if ((await page.locator(`[id="${id}"]`).count()) === 0) missing.push(href);
  }
  expect(missing).toEqual([]);
});
