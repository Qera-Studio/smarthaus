/**
 * @jest-environment node
 */

/**
 * og:image must resolve to a host that actually serves it.
 *
 * metadataBase was hardcoded to the production domain, so every deployment —
 * previews and the vercel.app production URL included — emitted an og:image
 * absolute to smarthaus.ae. While that domain is unconfigured the image 404s,
 * and WhatsApp, Slack and iMessage all fall back to a text-only card: the tags
 * are present and correct, the picture behind them is missing.
 *
 * These assert the resolution order rather than the markup, because the bug was
 * never in the tags.
 */

const ORIGINAL = process.env;

/** Re-imports layout.tsx under a fresh env, returning the resolved base. */
async function resolveBase(env: Record<string, string>): Promise<string> {
  jest.resetModules();
  process.env = { ...ORIGINAL, ...env };
  // Deleting is required: spreading ORIGINAL carries over whatever the real
  // shell had set, which would mask the case under test.
  for (const key of [
    "NEXT_PUBLIC_SITE_URL",
    "VERCEL_ENV",
    "VERCEL_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
  ]) {
    if (!(key in env)) delete process.env[key];
  }
  const { metadata } = (await import("../layout")) as { metadata: { metadataBase: URL } };
  return metadata.metadataBase.origin;
}

afterEach(() => {
  process.env = ORIGINAL;
});

describe("metadataBase", () => {
  it("falls back to the canonical domain with no deployment env", async () => {
    expect(await resolveBase({})).toBe("https://smarthaus.ae");
  });

  it("uses the production deployment's own host", async () => {
    // The regression: before the fix this returned smarthaus.ae, whose
    // og-image.png did not resolve.
    const base = await resolveBase({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "smarthaus-livid.vercel.app",
    });
    expect(base).toBe("https://smarthaus-livid.vercel.app");
  });

  it("reverts to the custom domain once one is attached", async () => {
    const base = await resolveBase({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "smarthaus.ae",
    });
    expect(base).toBe("https://smarthaus.ae");
  });

  it("points a preview at itself, not at production", async () => {
    const base = await resolveBase({
      VERCEL_ENV: "preview",
      VERCEL_URL: "smarthaus-git-branch.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "smarthaus.ae",
    });
    expect(base).toBe("https://smarthaus-git-branch.vercel.app");
  });

  it("lets an explicit site URL win over everything", async () => {
    const base = await resolveBase({
      NEXT_PUBLIC_SITE_URL: "https://staging.example.com",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "smarthaus.ae",
    });
    expect(base).toBe("https://staging.example.com");
  });
});
