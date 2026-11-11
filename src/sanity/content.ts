// One getter per document. cache() makes every component that asks for the
// same document within one render share one fetch.
import { cache } from "react";
import { getDoc } from "./fetch";
import type {
  AboutPage,
  ComingSoonPage,
  ConsentCopy,
  LegalDocument,
  ContactPage,
  FaqPage,
  HomePage,
  PricingPage,
  SiteSettings,
} from "./types";

export const getSettings = cache(() => getDoc<SiteSettings>("siteSettings"));
export const getContactPage = cache(() => getDoc<ContactPage>("contactPage"));
export const getHomePage = cache(() => getDoc<HomePage>("homePage"));
export const getAboutPage = cache(() => getDoc<AboutPage>("aboutPage"));
export const getPricingPage = cache(() => getDoc<PricingPage>("pricingPage"));
export const getFaqPage = cache(() => getDoc<FaqPage>("faqPage"));
export const getComingSoonPage = cache((route: "solutions" | "designers" | "developers") =>
  getDoc<ComingSoonPage>(`comingSoon-${route}`),
);

export type LegalName = "privacy" | "terms" | "accessibility";
export const getLegalDocument = cache((name: LegalName) => getDoc<LegalDocument>(`legal-${name}`));
export const getConsentCopy = cache(() => getDoc<ConsentCopy>("consentCopy"));

/**
 * /faq is publishable once no answer is pending and an editor has turned it on:
 * an unconfirmed figure an answer engine repeats back is worse than none.
 */
export function isFaqPublishable(page: Pick<FaqPage, "seo" | "categories">): boolean {
  const pending = page.categories.some((c) => c.entries.some((e) => e.pending));
  return Boolean(page.seo.index) && !pending;
}

type Routed = { seo: { index?: boolean }; updatedAt?: string };

/**
 * Every content route, with the document that decides whether it is in search
 * and when it last changed. The sitemap is built from this, so it lists the
 * indexable pages exactly; src/app/__tests__/sitemap.test.ts holds it to each
 * page's own metadata.
 */
export const ROUTES: readonly { path: string; load: () => Promise<Routed> }[] = [
  { path: "/", load: getHomePage },
  { path: "/about", load: getAboutPage },
  { path: "/contact", load: getContactPage },
  { path: "/pricing", load: getPricingPage },
  {
    path: "/faq",
    load: async () => {
      const page = await getFaqPage();
      return { ...page, seo: { ...page.seo, index: isFaqPublishable(page) } };
    },
  },
  { path: "/solutions", load: () => getComingSoonPage("solutions") },
  { path: "/designers", load: () => getComingSoonPage("designers") },
  { path: "/developers", load: () => getComingSoonPage("developers") },
  { path: "/privacy", load: () => getLegalDocument("privacy") },
  { path: "/terms", load: () => getLegalDocument("terms") },
  { path: "/accessibility", load: () => getLegalDocument("accessibility") },
  { path: "/cookie-preferences", load: getConsentCopy },
];
