import { test, expect } from "./fixtures";

/**
 * The security headers every route serves (Security System §8), on the pages
 * a visitor lands on and on the endpoints that are not pages at all.
 */

const ROUTES = ["/", "/contact", "/privacy", "/this-page-does-not-exist", "/api/csp-report"];

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

for (const route of ROUTES) {
  test.describe(route, () => {
    test("isolates the browsing context with COOP same-origin", async ({ request }) => {
      const headers = (await request.get(route)).headers();
      expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    });

    test("names the CSP report endpoint", async ({ request }) => {
      const headers = (await request.get(route)).headers();
      expect(headers["reporting-endpoints"]).toBe('csp-endpoint="/api/csp-report"');
    });

    test("reports enforced violations through both mechanisms", async ({ request }) => {
      const policy = directives((await request.get(route)).headers()["content-security-policy"]!);
      expect(policy["report-uri"]).toBe("/api/csp-report");
      expect(policy["report-to"]).toBe("csp-endpoint");
    });

    test("observes the strict policy in report-only mode", async ({ request }) => {
      const strict = (await request.get(route)).headers()["content-security-policy-report-only"];
      expect(strict, "report-only policy present").toBeTruthy();
      const policy = directives(strict!);
      expect(policy["script-src"]).toBe("'self' 'wasm-unsafe-eval'");
      expect(policy["style-src"]).toBe("'self'");
      expect(policy["report-uri"]).toBe("/api/csp-report");
      expect(policy["report-to"]).toBe("csp-endpoint");
    });
  });
}

test("the report-only policy differs from the enforced one only by 'unsafe-inline'", async ({
  request,
}) => {
  const headers = (await request.get("/")).headers();
  const enforced = directives(headers["content-security-policy"]!);
  const strict = directives(headers["content-security-policy-report-only"]!);
  const without = (value: string) => value.replace(" 'unsafe-inline'", "");
  // upgrade-insecure-requests is absent from both under Playwright.
  expect(Object.keys(strict).sort()).toEqual(Object.keys(enforced).sort());
  for (const [name, value] of Object.entries(enforced)) {
    expect(strict[name], name).toBe(without(value));
  }
});

test.describe("/api/csp-report", () => {
  const legacy = {
    "csp-report": {
      "document-uri": "http://127.0.0.1/",
      "blocked-uri": "https://evil.example/x.js",
      "effective-directive": "script-src-elem",
    },
  };

  test("accepts a CSP report with 204 and an empty body", async ({ request }) => {
    const res = await request.post("/api/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: JSON.stringify(legacy),
    });
    expect(res.status()).toBe(204);
    expect(await res.text()).toBe("");
  });

  test("refuses JSON that is not a report", async ({ request }) => {
    const res = await request.post("/api/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: JSON.stringify({ hello: "world" }),
    });
    expect(res.status()).toBe(400);
  });

  test("refuses a body over 16KB", async ({ request }) => {
    const res = await request.post("/api/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: JSON.stringify({ "csp-report": { pad: "x".repeat(17_000) } }),
    });
    expect(res.status()).toBe(413);
  });

  test("does not answer GET", async ({ request }) => {
    expect((await request.get("/api/csp-report")).status()).toBe(405);
  });
});

test.describe("files crawlers and researchers read", () => {
  test("serves security.txt as plain text with a contact", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/plain/);
    expect(await res.text()).toContain("Contact: mailto:contact@mapletech.ae");
  });

  test("serves robots.txt with the production rules outside a preview", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toMatch(/User-Agent: \*\s+Allow: \//i);
    expect(body).toContain("Sitemap: https://smarthaus.ae/sitemap.xml");
    expect(body).not.toMatch(/Disallow: \/\s/);
  });
});
