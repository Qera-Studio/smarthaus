import { expect, test } from "@playwright/test";

// The e2e server is not the production server: next.config.ts drops two
// headers when PLAYWRIGHT is set, because WebKit on plain-HTTP loopback aborts
// every asset under them. These tests pin that difference to exactly those two,
// so the test server cannot quietly drift into testing a different site.

test.describe("the e2e server", () => {
  test("serves HSTS with max-age=0, so WebKit does not upgrade loopback to https", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["strict-transport-security"]).toBe("max-age=0");
  });

  test("omits upgrade-insecure-requests from the CSP and keeps every other directive", async ({
    request,
  }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";
    expect(csp).not.toContain("upgrade-insecure-requests");
    for (const directive of [
      "default-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
  });

  test("sends the rest of the production header set unchanged", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("hydrates, which the loopback address exists to guarantee", async ({ page }) => {
    // If WebKit upgraded to https, Server Components would still render and
    // every client island would be dead. The consent banner only exists once
    // React has hydrated and read the cookie, so it is a hydration witness.
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Cookie preferences" })).toBeVisible();
  });
});

// Runs only in the forced-colors project (playwright.config.ts). A smoke check
// that the mode is live and the page survives it; per-component checks land
// with the forced-colors work (plan Phase 2 and Phase 6).
test.describe("forced colours @forced-colors", () => {
  test("the page sees forced colours and still renders its heading and primary action", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Book a site visit" }),
    ).toBeVisible();
  });
});

// Runs only in the zoom-200 project: a 1440px laptop at 200% zoom.
test.describe("200% zoom @zoom", () => {
  for (const route of ["/contact", "/privacy", "/terms", "/faq", "/pricing"]) {
    test(`${route} fits the width at 200% zoom`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
    });
  }
});
