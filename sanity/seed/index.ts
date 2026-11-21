// The seed: today's content in the shape the site renders, one entry per
// document. It fills a dataset (sanity/seed/export.run.ts) and is what unit
// tests render, through the getDoc mock in jest.setup.ts.
import type { SeedEntry } from "./to-documents";
import { ABOUT_PAGE } from "./about-page";
import { BLOG_PAGE, POSTS } from "./blog";
import { COMING_SOON } from "./coming-soon";
import { CONSENT_COPY } from "./consent-copy";
import { CONTACT_PAGE } from "./contact-page";
import { FAQ_PAGE } from "./faq-page";
import { HOME_PAGE } from "./home-page";
import { LEGAL } from "./legal";
import { PRICING_PAGE } from "./pricing-page";
import { SITE_SETTINGS } from "./site-settings";
import { SOLUTION_PAGES } from "./solutions";

export const SEED: readonly SeedEntry[] = [
  { id: "siteSettings", type: "siteSettings", value: SITE_SETTINGS },
  { id: "homePage", type: "homePage", value: HOME_PAGE },
  { id: "contactPage", type: "contactPage", value: CONTACT_PAGE },
  { id: "aboutPage", type: "aboutPage", value: ABOUT_PAGE },
  { id: "pricingPage", type: "pricingPage", value: PRICING_PAGE },
  { id: "faqPage", type: "faqPage", value: FAQ_PAGE },
  { id: "consentCopy", type: "consentCopy", value: CONSENT_COPY },
  ...Object.entries(LEGAL).map(([name, value]) => ({
    id: `legal-${name}`,
    type: "legalPage",
    value,
  })),
  ...Object.entries(COMING_SOON).map(([route, value]) => ({
    id: `comingSoon-${route}`,
    type: "comingSoonPage",
    value,
  })),
  ...Object.entries(SOLUTION_PAGES).map(([id, value]) => ({
    id: `solution-${id}`,
    type: "solutionPage",
    value,
  })),
  { id: "blogPage", type: "blogPage", value: BLOG_PAGE },
  // The articles: the one type with as many documents as editors write.
  ...POSTS.map((value) => ({ id: `post-${value.slug}`, type: "post", value })),
];

/**
 * The documents the blog added (2026-11-14). Production was seeded before
 * they existed and is never re-seeded, so these alone were imported into it:
 * sanity/seed/export.run.ts writes them to their own file.
 */
export const BLOG_SEED = SEED.filter((e) => e.type === "blogPage" || e.type === "post");

/**
 * The solution pages (2026-11-15), written on their own like the blog's.
 * Cameras was imported into production alone, without --replace, at
 * Shivanshu's yes, and the other seven the same way later that day (this file
 * less cameras), at his second yes. They are the Studio's from then on.
 */
export const SOLUTION_SEED = SEED.filter((e) => e.type === "solutionPage");

/** One seeded document, in render shape, as getDoc would return it. */
export function seedDoc(id: string): unknown {
  const entry = SEED.find((e) => e.id === id);
  if (!entry) throw new Error(`seed: no document "${id}"`);
  return entry.value;
}

/** Every seeded document of a type, newest first, as getDocs would return them. */
export function seedDocs(type: string): unknown[] {
  return SEED.filter((e) => e.type === type)
    .map((e) => e.value as { date?: string })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
