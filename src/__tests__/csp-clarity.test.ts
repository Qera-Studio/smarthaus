import nextConfig from "../../next.config";

/**
 * NEXT_PUBLIC_CLARITY_ID opens the policy as well as starting the script
 * (src/lib/clarity.ts). The e2e build has no id, so e2e/headers.spec.ts sees only
 * the closed policy; this holds the open one, in both the enforced policy and
 * its report-only twin.
 */
const ID_VAR = "NEXT_PUBLIC_CLARITY_ID";
const original = process.env[ID_VAR];

afterEach(() => {
  if (original === undefined) delete process.env[ID_VAR];
  else process.env[ID_VAR] = original;
});

async function policies() {
  const rules = await nextConfig.headers!();
  const headers = rules.flatMap((rule) => rule.headers);
  return ["Content-Security-Policy", "Content-Security-Policy-Report-Only"].map((key) => {
    const value = headers.find((header) => header.key === key)!.value;
    return Object.fromEntries(
      value.split(";").map((directive) => {
        const [name, ...sources] = directive.trim().split(" ");
        return [name, sources];
      }),
    );
  });
}

describe("the CSP and Google Analytics", () => {
  const GA_VAR = "NEXT_PUBLIC_GA_ID";

  afterEach(() => {
    delete process.env[GA_VAR];
  });

  it("names no Google host while the id is unset", async () => {
    delete process.env[GA_VAR];
    for (const policy of await policies()) {
      expect(JSON.stringify(policy)).not.toMatch(/google/);
    }
  });

  it("opens the script, beacon and image hosts once the id is set, and nothing else", async () => {
    process.env[GA_VAR] = "G-TEST123";
    for (const policy of await policies()) {
      expect(policy["script-src"]).toContain("https://www.googletagmanager.com");
      expect(policy["connect-src"]).toEqual(
        expect.arrayContaining([
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
        ]),
      );
      expect(policy["img-src"]).toContain("https://*.google-analytics.com");
      expect(JSON.stringify(policy["font-src"])).not.toMatch(/google/);
      expect(policy["frame-src"]).toBeUndefined();
    }
  });
});

describe("the CSP and Clarity", () => {
  it("names no Clarity or Bing host while the id is unset", async () => {
    delete process.env[ID_VAR];
    for (const policy of await policies()) {
      expect(JSON.stringify(policy)).not.toMatch(/clarity|bing/);
    }
  });

  it("opens exactly what Clarity was seen to use once the id is set", async () => {
    process.env[ID_VAR] = "testproject";
    for (const policy of await policies()) {
      expect(policy["script-src"]).toEqual(
        expect.arrayContaining(["https://www.clarity.ms", "https://scripts.clarity.ms"]),
      );
      expect(policy["connect-src"]).toEqual([
        "'self'",
        "https://*.clarity.ms",
        "https://c.bing.com",
      ]);
      expect(policy["img-src"]).toEqual([
        "'self'",
        "data:",
        "https://c.clarity.ms",
        "https://c.bing.com",
      ]);
    }
  });

  it("opens nothing else for it: frames, fonts and objects stay closed", async () => {
    process.env[ID_VAR] = "testproject";
    for (const policy of await policies()) {
      expect(JSON.stringify(policy["font-src"])).not.toMatch(/clarity|bing/);
      expect(policy["frame-src"]).toBeUndefined();
      expect(policy["object-src"]).toEqual(["'none'"]);
    }
  });
});
