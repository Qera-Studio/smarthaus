import type { MetadataRoute } from "next";

/**
 * Production is crawlable; every other Vercel deployment is not. A preview is
 * a copy of the site at another URL, and an indexed copy competes with the
 * real one and can leak unreleased work. Vercel also sends X-Robots-Tag on
 * previews; this is the same answer in the file crawlers read first.
 *
 * Decided at build, which is when VERCEL_ENV is known. Local and CI builds set
 * no VERCEL_ENV and get the production rules, so tests see what ships.
 */
export default function robots(): MetadataRoute.Robots {
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  // Every crawler is allowed, AI training crawlers included: decided by
  // Shivanshu on 2026-09-28 (SEO System §0a makes it a per-client call; a
  // refusal list shipped briefly in Phase 5 and was taken out). Search,
  // answer-engine and user-directed crawlers are how the site is found and
  // cited. The Vercel Firewall must not block what this allows
  // (docs/runbooks/vercel-firewall.md).
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://smarthaus.ae/sitemap.xml",
  };
}
