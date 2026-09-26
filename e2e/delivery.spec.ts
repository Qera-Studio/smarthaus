import { test, expect } from "./fixtures";
import { mailFor, uniqueName } from "./mail";

/**
 * @delivery: one real email through Resend, run only by the CI `delivery` job
 * (E2E_REAL_MAIL=1, with the Resend secrets). Every other project writes
 * emails to the mail sink; this proves the real path still works: the API
 * key, the verified sending domain, and the account's quota.
 *
 * Not a required check, deliberately: it fails whenever Resend refuses a send
 * (on 2026-09-26, the monthly quota), which is a fact about the account, not
 * about the code under review. It is visible on every PR.
 */
test("a real enquiry is delivered through Resend @delivery", async ({ page }) => {
  const name = uniqueName("Delivery check");
  await page.goto("/contact");
  const form = page.locator("main");
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Phone").fill("0543755150");
  await form.getByLabel(/I would like Smarthaus to contact me/).check();
  await page.getByRole("button", { name: "Book a site visit" }).click();

  // The confirmation, not the failure banner: Resend accepted the send.
  await expect(page.getByRole("status")).toContainText(name.split(" ")[0]!, { timeout: 20_000 });
  // And it went out for real: the sink never saw it. A server left in sink
  // mode would confirm too, so this is what makes the test mean "delivered".
  expect(await mailFor(name)).toEqual([]);
});
