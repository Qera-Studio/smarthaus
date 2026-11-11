import { test, expect } from "./fixtures";

/**
 * The Sanity Studio at /studio (src/app/studio/[[...tool]]/page.tsx). Editors
 * only, so this checks what keeps it apart from the site: its own CSP, no
 * site chrome, no third-party script, and no way into a search index.
 *
 * Nothing here waits on Sanity's API. The Studio talks to it from the browser,
 * and a test that needs it up would fail on Sanity's outages, not on ours.
 */

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

const policyAt = async (
  request: import("@playwright/test").APIRequestContext,
  route: string,
  header = "content-security-policy",
) => directives((await request.get(route)).headers()[header]!);

test.describe("the Studio's CSP", () => {
  for (const route of ["/studio", "/studio/structure"]) {
    test(`${route} may reach Sanity's API over https and wss`, async ({ request }) => {
      const policy = await policyAt(request, route);
      expect(policy["connect-src"]).toBe("'self' https://*.sanity.io wss://*.sanity.io");
    });

    test(`${route} shows Sanity's images, sign-in avatars and upload previews`, async ({
      request,
    }) => {
      const policy = await policyAt(request, route);
      expect(policy["img-src"]).toBe(
        "'self' data: blob: https://cdn.sanity.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
      );
    });

    test(`${route} loads Sanity's fonts`, async ({ request }) => {
      const policy = await policyAt(request, route);
      expect(policy["font-src"]).toBe("'self' https://design-system-static.sanity.io");
    });

    test(`${route} allows no third-party script, Clarity and GA4 included`, async ({ request }) => {
      const policy = await policyAt(request, route);
      expect(policy["script-src"]).not.toMatch(/https?:/);
    });

    test(`${route} widens the report-only twin the same way`, async ({ request }) => {
      const strict = await policyAt(request, route, "content-security-policy-report-only");
      expect(strict["connect-src"]).toBe("'self' https://*.sanity.io wss://*.sanity.io");
      expect(strict["font-src"]).toBe("'self' https://design-system-static.sanity.io");
      expect(strict["script-src"]).not.toContain("'unsafe-inline'");
    });
  }

  test("the marketing pages stay closed to Sanity", async ({ request }) => {
    for (const route of ["/", "/contact"]) {
      const policy = await policyAt(request, route);
      expect(policy["connect-src"]).not.toContain("sanity");
      expect(policy["img-src"]).not.toContain("sanity");
      expect(policy["font-src"]).toBe("'self'");
    }
  });

  test("keeps every other security header the site sends", async ({ request }) => {
    const headers = (await request.get("/studio")).headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("the Studio page", () => {
  test("stands alone: only main is drawn, no nav, footer, bar or banner", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.locator("[data-studio]")).toBeAttached();
    const drawn = await page.evaluate(() =>
      [...document.body.children]
        .filter((child) => getComputedStyle(child).display !== "none")
        .map((child) => child.tagName),
    );
    expect(drawn).toEqual(["MAIN"]);
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
  });

  test("leaves main no room for the floating nav", async ({ page }) => {
    await page.goto("/studio");
    const padding = await page
      .locator("main")
      .evaluate((main) => getComputedStyle(main).paddingBlockEnd);
    expect(padding).toBe("0px");
  });

  test("loads no script from another origin", async ({ page }) => {
    const foreign: string[] = [];
    page.on("request", (request) => {
      if (
        request.resourceType() === "script" &&
        !request.url().startsWith(page.url().split("/studio")[0]!)
      ) {
        foreign.push(request.url());
      }
    });
    await page.goto("/studio");
    await expect(page.locator("script[src*='sanity-cdn']")).toHaveCount(0);
    expect(foreign).toEqual([]);
  });

  test("is noindex", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("is not in the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<urlset");
    expect(sitemap).not.toContain("/studio");
  });

  test("leaves the site's own chrome alone everywhere else", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("[data-studio]")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});
