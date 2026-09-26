import { expect, test } from "./fixtures";
import type { Request } from "@playwright/test";

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

  // Named for what it guards. On CI the image optimizer once stopped answering
  // one cache key for the rest of the run, and the only symptom was three
  // unrelated tests timing out on networkidle. A hung image now fails here.
  test("every image the homepage requests is answered", async ({ page }) => {
    // Request objects, not URLs: the same image can be asked for twice.
    const pending = new Set<Request>();
    const failed: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "image") pending.add(request);
    });
    page.on("requestfinished", (request) => pending.delete(request));
    page.on("requestfailed", (request) => {
      if (pending.delete(request)) failed.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Cookie preferences" })).toBeVisible();
    const stuck = await expect
      .poll(() => [...pending].map((request) => request.url()), { timeout: 15_000 })
      .toEqual([])
      .then(
        () => [],
        () => [...pending].map((request) => request.url()),
      );
    // When one hangs, ask the server for it directly, outside the browser, so
    // the report says which side is holding it: an answer here means the
    // browser never finished a response the server can give.
    const probes = await Promise.all(
      stuck.map(async (url) => {
        const started = Date.now();
        const verdict = await page.request.get(url, { timeout: 10_000 }).then(
          (response) => `server answered ${response.status()}`,
          (error: Error) => `server did not answer: ${error.message.split("\n")[0]}`,
        );
        return `${url}: ${verdict} after ${Date.now() - started}ms`;
      }),
    );
    expect(probes, "images the browser requested and never got").toEqual([]);
    expect(failed).toEqual([]);
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

// The villa default lives in e2e/fixtures.ts. Both halves are pinned here: off
// unless asked, and on when asked, so the switch cannot rot into "always off".
test.describe("the hero's villa in e2e", () => {
  test("is off by default: the page reports Save-Data and no canvas mounts", async ({ page }) => {
    const villaRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/hero\/villa\.glb|\/draco\//.test(request.url())) villaRequests.push(request.url());
    });
    await page.goto("/");
    expect(
      await page.evaluate(
        () =>
          (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
      ),
    ).toBe(true);
    // The gate runs in an effect at hydration and, when it passes, starts the
    // load on a zero timeout. So: hydrated, then a window far longer than that
    // timeout, and neither the model nor its decoder was ever asked for.
    await expect(page.getByRole("region", { name: "Cookie preferences" })).toBeVisible();
    await page.waitForTimeout(2_000);
    expect(villaRequests).toEqual([]);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test.describe("when a spec opts in", () => {
    test.use({ villa: true });

    test("mounts on a desktop pointer", async ({ page, isMobile }) => {
      test.skip(isMobile, "touch devices never get the villa, by the product's own gate");
      await page.goto("/");
      await expect(page.locator("[data-ready] canvas")).toHaveCount(1, { timeout: 20_000 });
    });
  });
});
