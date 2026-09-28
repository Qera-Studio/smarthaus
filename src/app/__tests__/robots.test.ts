/**
 * @jest-environment node
 */
import robots from "../robots";

const env = process.env;
afterEach(() => {
  process.env = env;
});

const withEnv = (value: string | undefined) => {
  process.env = { ...env };
  if (value === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = value;
  return robots();
};

describe("robots", () => {
  it("lets every crawler in on production, and points at the sitemap", () => {
    expect(withEnv("production")).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://smarthaus.ae/sitemap.xml",
    });
  });

  // Decided 2026-09-28: AI crawlers are not refused, training ones included.
  // One group for everyone means no crawler can be singled out by accident.
  it("names no crawler, so none is treated differently from the rest", () => {
    const rules = withEnv("production").rules;
    const groups = Array.isArray(rules) ? rules : [rules];
    expect(groups).toHaveLength(1);
    expect(groups[0]).not.toHaveProperty("disallow");
  });

  it.each([
    "GPTBot",
    "ClaudeBot",
    "CCBot",
    "Google-Extended",
    "OAI-SearchBot",
    "PerplexityBot",
    "ChatGPT-User",
    "Googlebot",
  ])("does not refuse %s", (bot) => {
    const rules = withEnv("production").rules;
    const groups = Array.isArray(rules) ? rules : [rules];
    for (const group of groups) {
      const agents = ([] as string[]).concat(group.userAgent ?? []);
      if (agents.includes(bot) || agents.includes("*")) expect(group.disallow).toBeUndefined();
    }
  });

  it.each(["preview", "development"])("shuts every crawler out of a %s deployment", (value) => {
    expect(withEnv(value)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("gives a preview no sitemap, so nothing points crawlers at its copy", () => {
    expect(withEnv("preview")).not.toHaveProperty("sitemap");
  });

  it("serves the production rules to local and CI builds, which set no VERCEL_ENV", () => {
    expect(withEnv(undefined)).toEqual(withEnv("production"));
  });
});
