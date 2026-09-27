/**
 * @jest-environment node
 */
import robots from "../robots";
import { TRAINING_CRAWLERS } from "../../content/crawler-policy";

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
  it("lets every crawler in on production except the training crawlers, and points at the sitemap", () => {
    expect(withEnv("production")).toEqual({
      rules: [
        { userAgent: "*", allow: "/" },
        { userAgent: [...TRAINING_CRAWLERS], disallow: "/" },
      ],
      sitemap: "https://smarthaus.ae/sitemap.xml",
    });
  });

  it("refuses exactly the six training crawlers SEO System §0a names", () => {
    expect([...TRAINING_CRAWLERS].sort()).toEqual(
      [
        "Applebot-Extended",
        "Bytespider",
        "CCBot",
        "ClaudeBot",
        "GPTBot",
        "meta-externalagent",
      ].sort(),
    );
  });

  it.each([
    "OAI-SearchBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot",
    "ChatGPT-User",
    "Googlebot",
  ])("never refuses %s, a search or user-directed crawler", (bot) => {
    expect(TRAINING_CRAWLERS as readonly string[]).not.toContain(bot);
    const rules = withEnv("production").rules;
    const groups = Array.isArray(rules) ? rules : [rules];
    for (const group of groups) {
      const agents = ([] as string[]).concat(group.userAgent ?? []);
      if (agents.includes(bot)) expect(group.disallow).toBeUndefined();
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
