// Every type the Studio knows, in one list for src/sanity/config.ts and the
// seed converter. Primitives first: the documents are made of them.
import { figure, localeString, localeText, type SchemaType } from "./primitives";
import { seo } from "./seo";
import { articleImage, blogPage, localeArticle, post } from "./blog";
import { contactPage } from "./contact-page";
import { homePage } from "./home-page";
import { consentCopy, legalPage, localeBlocks } from "./legal";
import { aboutPage, comingSoonPage, faqPage, pricingPage } from "./pages";
import { siteSettings } from "./site-settings";
import { solutionPage } from "./solution";

export const schemaTypes: SchemaType[] = [
  localeString,
  localeText,
  figure,
  localeBlocks,
  seo,
  siteSettings,
  homePage,
  contactPage,
  aboutPage,
  pricingPage,
  faqPage,
  comingSoonPage,
  solutionPage,
  legalPage,
  consentCopy,
  articleImage,
  localeArticle,
  blogPage,
  post,
];

/** Documents with exactly one instance, whose id is their type name. */
export const SINGLETONS = [
  "siteSettings",
  "homePage",
  "aboutPage",
  "contactPage",
  "pricingPage",
  "faqPage",
  "consentCopy",
  "blogPage",
] as const;

/**
 * Types whose documents editors create and delete. One, and it stays short: a
 * document here needs a route that is built from its content, not from code.
 */
export const COLLECTIONS = ["post"] as const;

/**
 * Types with a fixed set of documents, one per route, by id. A hyphen, never a
 * dot: Sanity keeps documents whose id has a dot private, and the site reads
 * the dataset without a token.
 */
export const FIXED_DOCUMENTS = {
  legalPage: {
    "legal-privacy": "Privacy Policy",
    "legal-terms": "Terms and Conditions",
    "legal-accessibility": "Accessibility statement",
  },
  comingSoonPage: {
    "comingSoon-solutions": "Solutions",
    "comingSoon-designers": "For Designers",
    "comingSoon-developers": "For Developers",
  },
  // One per solution with a page, solution-<its id in the Solutions menu>, in
  // the menu's order. An item with no page here goes to /solutions.
  solutionPage: {
    "solution-cameras": "Cameras",
    "solution-lighting": "Lighting",
    "solution-audio": "Audio",
    "solution-ac": "AC",
    "solution-garage": "Garage",
    "solution-smart-lock": "Smart lock",
    "solution-wall-controller": "Wall controller",
    "solution-curtains": "Curtains",
  },
} as const;
