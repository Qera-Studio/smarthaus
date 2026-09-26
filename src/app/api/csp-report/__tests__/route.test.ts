/**
 * @jest-environment node
 */

// The CSP report endpoint as a browser, or an attacker, reaches it.
import { POST } from "../route";

let ipCounter = 0;
const freshIp = () => `198.18.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

function report(body: unknown, init: { type?: string; ip?: string; length?: string } = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": init.type ?? "application/csp-report",
    "x-forwarded-for": init.ip ?? freshIp(),
  };
  if (init.length !== undefined) headers["content-length"] = init.length;
  return new Request("https://smarthaus.ae/api/csp-report", {
    method: "POST",
    headers,
    body: text,
  });
}

const legacy = (blocked: string, page = "https://smarthaus.ae/") => ({
  "csp-report": {
    "document-uri": page,
    "blocked-uri": blocked,
    "effective-directive": "script-src-elem",
    disposition: "enforce",
  },
});

describe("POST /api/csp-report", () => {
  let logged: jest.SpyInstance;

  beforeEach(() => {
    logged = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    logged.mockRestore();
  });

  it("accepts a legacy report with 204 and logs one structured line", async () => {
    const response = await POST(report(legacy("https://evil.example/a.js?token=secret")));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(logged).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logged.mock.calls[0][0])).toEqual({
      event: "csp-violation",
      directive: "script-src-elem",
      blocked: "https://evil.example/a.js",
      document: "https://smarthaus.ae/",
      disposition: "enforce",
    });
  });

  it("never logs a query string, which can carry personal data", async () => {
    await POST(
      report(legacy("https://evil.example/b.js", "https://smarthaus.ae/contact?email=x@y.z")),
    );
    expect(logged.mock.calls[0][0]).not.toContain("email=");
  });

  it("accepts a Reporting API batch", async () => {
    const body = [
      {
        type: "csp-violation",
        body: {
          documentURL: "https://smarthaus.ae/faq",
          blockedURL: "inline",
          effectiveDirective: "script-src-elem",
          disposition: "report",
        },
      },
    ];
    const response = await POST(report(body, { type: "application/reports+json" }));
    expect(response.status).toBe(204);
    expect(JSON.parse(logged.mock.calls[0][0]).disposition).toBe("report");
  });

  it("logs each distinct violation in a Reporting API batch", async () => {
    const violation = (blockedURL: string) => ({
      type: "csp-violation",
      body: { documentURL: "https://smarthaus.ae/", blockedURL, effectiveDirective: "img-src" },
    });
    const body = [violation("https://a.example/1.png"), violation("https://b.example/2.png")];
    expect((await POST(report(body, { type: "application/reports+json" }))).status).toBe(204);
    expect(logged.mock.calls.map((call) => JSON.parse(call[0]).blocked)).toEqual([
      "https://a.example/1.png",
      "https://b.example/2.png",
    ]);
  });

  it("accepts a batch with no CSP reports in it, and logs nothing", async () => {
    const body = [{ type: "deprecation", body: { id: "x" } }];
    expect((await POST(report(body, { type: "application/reports+json" }))).status).toBe(204);
    expect(logged).not.toHaveBeenCalled();
  });

  it("logs a repeat of the same violation only once", async () => {
    await POST(report(legacy("https://evil.example/repeat.js")));
    await POST(report(legacy("https://evil.example/repeat.js")));
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("answers 400 to a body that is not JSON", async () => {
    expect((await POST(report("{not json"))).status).toBe(400);
    expect(logged).not.toHaveBeenCalled();
  });

  it("answers 400 to JSON that is not a CSP report", async () => {
    expect((await POST(report({ hello: "world" }))).status).toBe(400);
  });

  it("answers 400 to the wrong content type", async () => {
    expect((await POST(report(legacy("x"), { type: "application/json" }))).status).toBe(400);
  });

  it("answers 413 when the declared length is over 16KB, without reading it", async () => {
    expect((await POST(report(legacy("x"), { length: "16385" }))).status).toBe(413);
  });

  it("answers 413 when the body is over 16KB whatever it declares", async () => {
    const big = { "csp-report": { "blocked-uri": "x", pad: "y".repeat(17_000) } };
    expect((await POST(report(big, { length: "10" }))).status).toBe(413);
  });

  it("accepts a body exactly at the 16KB limit if it is a valid report", async () => {
    const base = JSON.stringify(legacy("https://evil.example/limit.js"));
    const padded = base.slice(0, -2) + `,"pad":"${"z".repeat(16384 - base.length - 9)}"}}`;
    expect(padded.length).toBe(16384);
    expect((await POST(report(padded))).status).toBe(204);
  });

  it("rate-limits one client after 30 reports a minute", async () => {
    const ip = "198.19.0.1";
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await POST(report(legacy(`https://evil.example/${i}.js`), { ip }))).status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it("checks the rate limit before reading the body", async () => {
    const ip = "198.19.0.2";
    for (let i = 0; i < 30; i += 1) await POST(report(legacy("x"), { ip }));
    expect((await POST(report("{not json", { ip }))).status).toBe(429);
  });

  it("keeps serving other clients while one is limited", async () => {
    const ip = "198.19.0.3";
    for (let i = 0; i < 31; i += 1) await POST(report(legacy("x"), { ip }));
    expect((await POST(report(legacy("https://evil.example/other.js")))).status).toBe(204);
  });
});
