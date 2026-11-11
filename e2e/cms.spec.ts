import { test, expect } from "./fixtures";

/**
 * The site's content comes from Sanity (the ci dataset, here), and a visitor
 * must never know it: no request from the browser to any Sanity host, every
 * picture through our own image optimiser, the publish webhook closed to
 * anyone without the secret, and the draft preview's looser policy only for a
 * request that carries the draft cookie.
 */

const PAGES = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
  "/accessibility",
  "/cookie-preferences",
  "/solutions",
];

const directives = (policy: string) =>
  Object.fromEntries(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name!, values.join(" ")];
      }),
  );

test.describe("a visitor's browser", () => {
  for (const path of PAGES) {
    test(`${path} asks nothing of Sanity`, async ({ page }) => {
      const sanity: string[] = [];
      page.on("request", (req) => {
        if (/(^|\.)sanity\.io$|sanity-cdn\.com$/.test(new URL(req.url()).hostname)) {
          sanity.push(req.url());
        }
      });
      await page.goto(path);
      // Down the whole page, so every lazy picture asks for its file. Script,
      // not the wheel: mobile WebKit has none.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
      });
      await page.waitForLoadState("networkidle");
      expect(sanity).toEqual([]);
    });
  }

  test("gets Sanity's pictures from our own optimiser, never from its CDN", async ({ page }) => {
    await page.goto("/");
    const srcs = await page
      .locator("[data-hero-strip] img")
      .evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src),
      );
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      const url = new URL(src);
      expect(url.pathname).toBe("/_next/image");
      expect(url.searchParams.get("url")).toMatch(/^https:\/\/cdn\.sanity\.io\/images\//);
    }
  });
});

test.describe("the publish webhook", () => {
  test("changes nothing for an unsigned call", async ({ request }) => {
    const response = await request.post("/api/revalidate", { data: { _type: "homePage" } });
    expect([401, 503]).toContain(response.status());
    expect(await response.text()).toBe("");
  });
});

test.describe("the draft preview", () => {
  test("cannot be entered without the Studio's secret", async ({ request }) => {
    const response = await request.get("/api/draft-mode/enable", { maxRedirects: 0 });
    expect(response.status()).not.toBe(200);
    expect(response.status()).toBeLessThan(600);
    expect(response.headers()["set-cookie"] ?? "").not.toContain("__prerender_bypass");
  });

  test("leaves a visitor's page unframeable, with analytics allowed as usual", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(directives(response.headers()["content-security-policy"]!)["frame-ancestors"]).toBe(
      "'none'",
    );
  });

  test("lets the Studio frame a page only for a request with the draft cookie", async ({
    request,
  }) => {
    const response = await request.get("/", {
      headers: { cookie: "__prerender_bypass=anything" },
    });
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    const policy = directives(response.headers()["content-security-policy"]!);
    expect(policy["frame-ancestors"]).toBe("'self'");
    // The Studio's policy: Sanity reachable, and no analytics on a draft.
    expect(policy["connect-src"]).toBe("'self' https://*.sanity.io wss://*.sanity.io");
    expect(policy["script-src"]).not.toMatch(/https?:/);
    const strict = directives(response.headers()["content-security-policy-report-only"]!);
    expect(strict["frame-ancestors"]).toBe("'self'");
  });
});

test.describe("llms.txt", () => {
  test("is built from the content, as plain text, linking only indexable pages", async ({
    request,
  }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const text = await response.text();
    expect(text.startsWith("# Smarthaus\n")).toBe(true);
    expect(text).toContain("](https://smarthaus.ae/about)");
    expect(text).not.toContain("](https://smarthaus.ae/privacy)");
  });
});
