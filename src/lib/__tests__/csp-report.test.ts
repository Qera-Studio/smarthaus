/**
 * @jest-environment node
 */

// CSP violation reports: both browser formats, reduced to four fields with no
// query strings, and each distinct violation logged once an hour.
import {
  createDeduper,
  MAX_REPORT_BYTES,
  parseReport,
  trimUrl,
  type Violation,
} from "../csp-report";

const REPORTS = "application/reports+json";
const LEGACY = "application/csp-report";

const reportingApi = (body: Record<string, unknown>, type = "csp-violation") => [
  { type, age: 10, url: "https://smarthaus.ae/", user_agent: "x", body },
];

describe("trimUrl", () => {
  it("keeps origin and path, and drops the query and fragment", () => {
    expect(trimUrl("https://smarthaus.ae/contact?email=a@b.c#form")).toBe(
      "https://smarthaus.ae/contact",
    );
  });

  it("keeps a browser keyword like inline or eval", () => {
    expect(trimUrl("inline")).toBe("inline");
    expect(trimUrl("eval")).toBe("eval");
  });

  it("bounds a non-URL value to 64 characters", () => {
    expect(trimUrl("x".repeat(500))).toHaveLength(64);
  });

  it("says unknown for a missing value", () => {
    expect(trimUrl(undefined)).toBe("unknown");
    expect(trimUrl("")).toBe("unknown");
  });
});

describe("parseReport: the Reporting API format", () => {
  it("reduces a csp-violation to its four fields", () => {
    const body = reportingApi({
      documentURL: "https://smarthaus.ae/pricing?ref=x",
      blockedURL: "https://evil.example/x.js",
      effectiveDirective: "script-src-elem",
      disposition: "enforce",
      sample: "",
    });
    expect(parseReport(REPORTS, body)).toEqual([
      {
        directive: "script-src-elem",
        blocked: "https://evil.example/x.js",
        document: "https://smarthaus.ae/pricing",
        disposition: "enforce",
      },
    ]);
  });

  it("reads the report-only disposition", () => {
    const body = reportingApi({
      effectiveDirective: "script-src",
      blockedURL: "inline",
      disposition: "report",
    });
    expect(parseReport(REPORTS, body)?.[0]?.disposition).toBe("report");
  });

  it("keeps only csp-violation entries from a mixed batch", () => {
    const body = [
      ...reportingApi({ effectiveDirective: "img-src" }),
      ...reportingApi({ id: "x" }, "deprecation"),
    ];
    expect(parseReport(REPORTS, body)).toHaveLength(1);
  });

  it("accepts a batch with no csp-violation entries as an empty list", () => {
    expect(parseReport(REPORTS, reportingApi({ id: "x" }, "intervention"))).toEqual([]);
  });

  it("fills unknowns rather than failing on a sparse report", () => {
    expect(parseReport(REPORTS, reportingApi({}))).toEqual([
      { directive: "unknown", blocked: "unknown", document: "unknown", disposition: "enforce" },
    ]);
  });

  it("tolerates a charset parameter and odd casing on the content type", () => {
    expect(parseReport("Application/Reports+JSON; charset=utf-8", reportingApi({}))).toHaveLength(
      1,
    );
  });

  it.each([
    ["an object instead of an array", { type: "csp-violation", body: {} }],
    ["an entry with no body", [{ type: "csp-violation" }]],
    ["a disposition that is neither enforce nor report", reportingApi({ disposition: "block" })],
    ["a field longer than 2048 characters", reportingApi({ blockedURL: "x".repeat(2049) })],
    ["more than 50 reports", Array.from({ length: 51 }, () => reportingApi({})[0])],
  ])("rejects %s", (_label, body) => {
    expect(parseReport(REPORTS, body)).toBeNull();
  });
});

describe("parseReport: the legacy report-uri format", () => {
  it("reduces a report to its four fields", () => {
    const body = {
      "csp-report": {
        "document-uri": "https://smarthaus.ae/?utm=x",
        "blocked-uri": "inline",
        "effective-directive": "style-src-attr",
        "violated-directive": "style-src",
        disposition: "report",
      },
    };
    expect(parseReport(LEGACY, body)).toEqual([
      {
        directive: "style-src-attr",
        blocked: "inline",
        document: "https://smarthaus.ae/",
        disposition: "report",
      },
    ]);
  });

  it("falls back to violated-directive where effective-directive is absent", () => {
    const body = { "csp-report": { "violated-directive": "img-src" } };
    expect(parseReport(LEGACY, body)?.[0]?.directive).toBe("img-src");
  });

  it("treats a report with no disposition as enforced", () => {
    expect(parseReport(LEGACY, { "csp-report": {} })?.[0]?.disposition).toBe("enforce");
  });

  it.each([
    ["no csp-report key", { report: {} }],
    ["a csp-report that is a string", { "csp-report": "x" }],
    ["an oversized field", { "csp-report": { "blocked-uri": "x".repeat(2049) } }],
  ])("rejects %s", (_label, body) => {
    expect(parseReport(LEGACY, body)).toBeNull();
  });
});

describe("parseReport: anything else", () => {
  it.each(["application/json", "text/plain", ""])("rejects content type %j", (type) => {
    expect(parseReport(type, reportingApi({}))).toBeNull();
  });
});

describe("createDeduper", () => {
  const v = (overrides: Partial<Violation> = {}): Violation => ({
    directive: "script-src",
    blocked: "inline",
    document: "https://smarthaus.ae/",
    disposition: "report",
    ...overrides,
  });

  it("lets a violation through the first time and holds repeats for the window", () => {
    let t = 0;
    const first = createDeduper({ windowMs: 1000, now: () => t });
    expect(first(v())).toBe(true);
    expect(first(v())).toBe(false);
    t = 999;
    expect(first(v())).toBe(false);
    t = 1000;
    expect(first(v())).toBe(true);
  });

  it.each([
    ["directive", { directive: "img-src" }],
    ["blocked resource", { blocked: "https://evil.example/x.js" }],
    ["page", { document: "https://smarthaus.ae/pricing" }],
    ["disposition", { disposition: "enforce" as const }],
  ])("treats a different %s as a different violation", (_label, change) => {
    const first = createDeduper();
    first(v());
    expect(first(v(change))).toBe(true);
  });

  it("forgets the oldest past maxKeys, so memory is bounded", () => {
    const first = createDeduper({ maxKeys: 2 });
    first(v({ document: "a" }));
    first(v({ document: "b" }));
    first(v({ document: "c" }));
    expect(first(v({ document: "a" }))).toBe(true);
    expect(first(v({ document: "c" }))).toBe(false);
  });

  it("uses the real clock and an hour's window by default", () => {
    const first = createDeduper();
    expect(first(v())).toBe(true);
    expect(first(v())).toBe(false);
  });
});

describe("limits", () => {
  it("caps a report body at 16KB", () => {
    expect(MAX_REPORT_BYTES).toBe(16384);
  });
});
