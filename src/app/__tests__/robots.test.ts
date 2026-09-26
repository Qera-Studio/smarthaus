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
