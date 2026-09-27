import { test, expect, addressFor, type Page } from "./fixtures";
import { expectHydrated } from "./checks";
import { mailFor, sentMail, uniqueName } from "./mail";

/**
 * One email per identical enquiry (src/lib/dedupe.ts), as a visitor meets it:
 * the second send confirms like the first, and the inbox gets one lead. The
 * ways a real visitor sends twice are a refresh of the no-JavaScript
 * confirmation, a second tab, and a retry after a slow send; all arrive at
 * the server as the same post again, which is what these do.
 */

async function send(page: Page, name: string, message = "") {
  await page.goto("/");
  await expectHydrated(page);
  const form = page.locator('section[aria-labelledby="home-enquiry"]');
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("0543755150");
  if (message) await form.getByLabel(/Message/).fill(message);
  // Enter, not a tap: the consent banner can sit over the button on a phone.
  await form.getByLabel("Phone").press("Enter");
  await expect(page.getByRole("status")).toContainText(name.split(" ")[0]!);
}

test.beforeEach(async ({ page }) => {
  const info = test.info();
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": addressFor(
      `duplicate:${info.title}:${info.project.name}:${info.retry}:${info.repeatEachIndex}`,
    ),
  });
});

test("the same enquiry sent twice confirms twice and arrives once", async ({ page }) => {
  const name = uniqueName("Twice");
  await send(page, name);
  await sentMail(name);
  await send(page, name);
  // Long enough for a second write to land if one were coming.
  await page.waitForTimeout(1_500);
  expect(await mailFor(name)).toHaveLength(1);
});

test("a second tab sending the same enquiry does not double it", async ({ page, context }) => {
  const name = uniqueName("Two tabs");
  const other = await context.newPage();
  await Promise.all([send(page, name), send(other, name)]);
  await page.waitForTimeout(1_500);
  expect(await mailFor(name)).toHaveLength(1);
  await other.close();
});

test("a corrected enquiry is a new lead and arrives", async ({ page }) => {
  const name = uniqueName("Corrected");
  await send(page, name, "One villa.");
  await sentMail(name);
  await send(page, name, "Two villas, not one.");
  await expect.poll(async () => (await mailFor(name)).length).toBe(2);
});
