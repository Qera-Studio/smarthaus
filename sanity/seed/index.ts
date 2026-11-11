// The seed: today's content in the shape the site renders, one entry per
// document. It fills a dataset (sanity/seed/export.run.ts) and is what unit
// tests render, through the getDoc mock in jest.setup.ts.
import type { SeedEntry } from "./to-documents";
import { ABOUT_PAGE } from "./about-page";
import { COMING_SOON } from "./coming-soon";
import { CONSENT_COPY } from "./consent-copy";
import { CONTACT_PAGE } from "./contact-page";
import { FAQ_PAGE } from "./faq-page";
import { HOME_PAGE } from "./home-page";
import { LEGAL } from "./legal";
import { PRICING_PAGE } from "./pricing-page";
import { SITE_SETTINGS } from "./site-settings";

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
];

/** One seeded document, in render shape, as getDoc would return it. */
export function seedDoc(id: string): unknown {
  const entry = SEED.find((e) => e.id === id);
  if (!entry) throw new Error(`seed: no document "${id}"`);
  return entry.value;
}
