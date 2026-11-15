// The render shape of each document: what src/sanity/localize.ts hands the
// pages, and what the seed in sanity/seed/ is written as. The Studio schema in
// src/sanity/schema/ describes the stored shape; seed.test.ts holds them equal.
import type { Picture } from "./localize";

export type { Picture };

export type Link = { label: string; href: string };

export type SocialPlatform = "whatsapp" | "instagram" | "facebook" | "x" | "linkedin";

export type SiteSettings = {
  contact: {
    phoneE164: string;
    phoneDisplay: string;
    whatsapp: string;
    email: string;
    addressLines: string[];
    mapsUrl: string;
    locality: string;
  };
  identity: {
    legalName: string;
    tradingAs: string;
    tradeLicence: string;
    siraLicence: string;
    licensingAuthority: string;
  };
  announcement: { call: string; mail: string; whatsapp: string };
  footer: {
    tagline: string;
    parent: string;
    parentHref: string;
    newsletterTitle: string;
    newsletterSubtitle: string;
    newsletterPlaceholder: string;
    newsletterSubmit: string;
    newsletterNote: string;
    contactTitle: string;
    pagesTitle: string;
    installTitle: string;
    copyright: string;
    credit: string;
    creditHref: string;
  };
  pageLinks: Link[];
  installLinks: (Link & { section: string })[];
  legalLinks: Link[];
  socials: { id: SocialPlatform; label: string; href: string; pending?: boolean }[];
  seo: { defaultTitle: string; defaultDescription: string; llmsSummary: string };
  solutionsMenu: SolutionsMenu;
};

/** A page's search and sharing metadata; the path is the route's own. */
export type Seo = { title: string; absolute?: boolean; description: string; index?: boolean };

export type FormField = { label: string; placeholder: string };

/** The enquiry form's labels, shared by /contact and the homepage. */
export type ContactFormCopy = {
  name: FormField;
  email: FormField;
  phone: FormField;
  community: FormField;
  interest: { label: string };
  message: FormField;
  submit: string;
  sending: string;
  /** WhatsApp messages the form pre-fills, after a failure and after a send. */
  failedMessage: string;
  sentMessage: string;
};

export type ContactPage = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  title: string;
  standfirst: string;
  formHeading: string;
  channelsHeading: string;
  channels: { phone: string; email: string; whatsapp: string; whatsappMessage: string };
  locationHeading: string;
  locationPhoto: Picture;
  directions: string;
  faqHeading: string;
  faqs: { question: string; answer: string }[];
  form: ContactFormCopy;
};

export type HeroCard = { id: string; title: string; line: string; cta: string; image: Picture };

export type Partner = {
  /** Stable key, and the tab's id. */
  id: string;
  /** The tab's label and the logo's accessible name. */
  name: string;
  title: string;
  body: string;
  /** The maker's own site. */
  href: string;
  logo: Picture;
};

export type HardwareItem = {
  id: string;
  title: string;
  description: string;
  cta: string;
  /** A file in public/hero/hardware/icons/, picked from a list in the Studio. */
  icon: string;
  image: Picture;
};

/**
 * The six grids a Process sheet can take. Each is a set of CSS grid areas in
 * Process.module.scss, so editors pick one rather than drawing their own.
 */
export type ProcessLayout =
  "intro" | "portraitLead" | "wideRight" | "bannerSplit" | "stacked" | "offsetPair";

export type ProcessPage = {
  /** Stable key and scroll anchor. */
  id: string;
  /** "01" to "05". Absent on the intro, which is not a step. */
  step?: string;
  title: string;
  /** One entry per paragraph. */
  body: string[];
  /** Rendered as written, brackets included. */
  duration: string;
  layout: ProcessLayout;
  images: Picture[];
};

export type Stat = { value: string; label: string };

export type CarePackage = { name: string; description: string; tone: "light" | "dark" };

export type HomePage = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  hero: {
    title: string;
    lede: string;
    visitCta: string;
    whatsappCta: string;
    whatsappMessage: string;
    /** The proof line under the copy. The first carries the star. */
    proof: string[];
    stripLabel: string;
    cardsHref: string;
    cards: HeroCard[];
  };
  partners: { heading: string; visit: string; items: Partner[] };
  hardware: { heading: string; lead: string; href: string; items: HardwareItem[] };
  stats: { heading: string; items: Stat[] };
  process: { heading: string; stepLabel: string; pages: ProcessPage[] };
  care: { heading: string; lead: string; packagesHeading: string; packages: CarePackage[] };
  pricing: { heading: string; standfirst: string; compareCta: string };
  enquiry: { title: string; standfirst: string };
};

export type SolutionsMenu = {
  href: string;
  items: { id: string; label: string; image: Picture }[];
};

export type FaqEntry = {
  /** Scroll anchor. Stable: these appear in shared URLs. */
  id: string;
  question: string;
  /** One entry per paragraph. A {BRACED} value is an unconfirmed fact. */
  answer: string[];
  /**
   * Set while the answer holds a fact still to be confirmed: the note shows
   * under the answer as a placeholder marker and the page stays out of search.
   */
  pending?: string;
};

export type FaqCategory = {
  /** Scroll anchor and ToC target. */
  id: string;
  title: string;
  /** Optional shorter label for the ToC rail. Falls back to `title`. */
  short?: string;
  entries: FaqEntry[];
};

export type ClosingCta = { heading: string; body: string; cta: string; secondary?: string };

export type FaqPage = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  title: string;
  standfirst: string;
  /** "If your question isn't here, [ask it directly]. We'd rather..." */
  intro: { before: string; link: string; after: string };
  categories: FaqCategory[];
  closing: ClosingCta;
};

export type PricingTier = {
  /** Stable key, and the anchor the comparison uses. */
  id: string;
  name: string;
  description: string;
  includes: string[];
  /** The card's ground; the button's style is chosen separately. */
  tone: "sand" | "image" | "dark";
  ctaVariant: "solid" | "inverse" | "outline";
};

/** A tick, a rule, or the level at which the tier has the feature. */
export type Cell = { included: boolean; note?: string };

export type ComparisonSection = {
  id: string;
  title: string;
  rows: { id: string; feature: string; description: string; values: Cell[] }[];
};

export type PricingPage = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  title: string;
  standfirst: string;
  tierCta: string;
  /** After the tier's name: "Essential includes:". */
  includes: string;
  tiers: PricingTier[];
  compareHeading: string;
  comparison: ComparisonSection[];
  faqHeading: string;
  faqs: FaqEntry[];
  closing: ClosingCta;
};

export type Statement = { lead: string; body: string };

export type AboutPage = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  title: string;
  heroImage: Picture;
  approachHeading: string;
  approach: { title: string; body: string; icon: string }[];
  missionImage: Picture;
  missionHeading: string;
  mission: Statement;
  visionHeading: string;
  vision: Statement;
  valuesHeading: string;
  values: { title: string; body: string }[];
  faqHeading: string;
  faqs: FaqEntry[];
};

export type ComingSoonPage = { seo: Seo; blurb: string; updatedAt?: string };

/** Rich text, as Sanity stores it: Portable Text, keys and all. */
export type ContactField = "email" | "phone" | "whatsapp" | "address";

export type PtSpan = { _type: "span"; _key: string; text: string; marks?: string[] };

export type PtInline =
  | { _type: "contactValue"; _key: string; field: ContactField; label?: string; message?: string }
  | { _type: "updatedDate"; _key: string; show?: boolean }
  | { _type: "anchor"; _key: string; id: string };

export type PtBlock = {
  _type: "block";
  _key: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  markDefs?: { _type: "link"; _key: string; href: string }[];
  children: (PtSpan | PtInline)[];
};

export type PtTable = {
  _type: "legalTable";
  _key: string;
  caption: string;
  /** Which processors table the build checks this against, if any. */
  role?: "processorsActive" | "processorsPlanned";
  columns: string[];
  rows: { _key: string; cells: string[] }[];
};

export type PtDefTable = {
  _type: "defTable";
  _key: string;
  caption: string;
  rows: { _key: string; label: string; value?: string; contact?: ContactField }[];
};

export type PtNode = PtBlock | PtTable | PtDefTable;

export type LegalDocument = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  seo: Seo;
  title: string;
  standfirst: string;
  status: "draft" | "effective";
  version?: string;
  /** "Draft, not yet effective", or the word before the date: "Assessed". */
  updatedLabel: string;
  /** ISO date. */
  updated?: string;
  intro?: PtNode[];
  sections: { id: string; title: string; short?: string; body: PtNode[] }[];
  changelog: { version: string; date: string; note: string }[];
};

export type ConsentCopy = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  /** The /cookie-preferences page's metadata. */
  seo: Seo;
  pageTitle: string;
  banner: {
    heading: string;
    body: string;
    accept: string;
    decline: string;
    customise: string;
    link: string;
    linkHref: string;
  };
  prefs: {
    heading: string;
    intro: string;
    essential: { label: string; state: string; body: string };
    analytics: { label: string; body: string; clarity: string; retention: string };
    save: string;
    back: string;
    withdraw: string;
  };
  state: { on: string; off: string; expired: string; changed: string };
  form: {
    required: {
      label: string;
      marker: string;
      helperLead: string;
      helperLinkText: string;
      helperHref: string;
    };
    marketing: { label: string };
  };
};

/** An article's text: Portable Text blocks, and pictures between them. */
export type ArticleBlock = {
  _type: "block";
  _key: string;
  style?: "normal" | "h2" | "h3" | "blockquote" | "callout";
  listItem?: "bullet" | "number";
  level?: number;
  markDefs?: { _type: "link"; _key: string; href: string }[];
  children: PtSpan[];
};

export type ArticleImage = {
  _type: "articleImage";
  _key: string;
  image: Picture;
  caption?: string;
};

export type ArticleNode = ArticleBlock | ArticleImage;

export type Post = {
  /** When the document was last published, from Sanity. */
  updatedAt?: string;
  title: string;
  /** The article's address under /blog/. */
  slug: string;
  author: string;
  /** The publication date, ISO: 2026-11-12. */
  date: string;
  /** From BLOG_TAGS (schema/blog.ts). The first shows on the card. */
  tags: string[];
  excerpt: string;
  image: Picture;
  body: ArticleNode[];
  seo: Seo;
};

export type BlogPage = { updatedAt?: string; seo: Seo; heading: string };

/** One solution's page (schema/solution.ts). Its picture is its menu item's. */
export type SolutionPage = {
  updatedAt?: string;
  seo: Seo;
  title: string;
  lede: string;
  features: {
    heading: string;
    standfirst: string;
    /** Names from SOLUTION_ICONS. Exactly FEATURE_COUNT of them. */
    items: { icon: string; title: string; text: string }[];
    image: Picture;
    ctaText: string;
    ctaLabel: string;
  };
  faqHeading: string;
  faqs: FaqEntry[];
  enquiry: { title: string; standfirst: string };
  articlesHeading: string;
  /** From BLOG_TAGS: the articles carrying it come first. */
  articlesTag: string;
};
