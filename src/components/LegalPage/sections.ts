/**
 * Section registries for the legal pages.
 *
 * One array per document, consumed twice: the table of contents renders from
 * it, and the page body's <h2>s render from it. That is the point — a heading
 * and its ToC entry cannot drift apart, and the id used as the scroll anchor is
 * declared once. Adding a section to the page means adding a row here.
 *
 * `short` is the ToC label. Some headings are too long to sit in a 220px rail
 * without wrapping to three lines, so the rail gets an abbreviated label while
 * the heading itself stays complete for screen readers and search engines.
 */

export type LegalSection = {
  /** Scroll anchor and ToC target. Stable — these appear in shared URLs. */
  id: string;
  /** The full heading, rendered as the <h2>. */
  title: string;
  /** Optional shorter label for the ToC rail. Falls back to `title`. */
  short?: string;
};

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: "responsible",
    title: "Who is responsible for your information",
    short: "Who is responsible",
  },
  { id: "coverage", title: "What this policy covers", short: "What this covers" },
  {
    id: "what-we-collect",
    title: "What we collect, why, and on what basis",
    short: "What we collect",
  },
  { id: "who-sees-it", title: "Who else sees your information", short: "Who else sees it" },
  { id: "where-it-goes", title: "Where your information goes" },
  { id: "retention", title: "How long we keep it" },
  { id: "your-rights", title: "Your rights" },
  { id: "protection", title: "How we protect your information", short: "How we protect it" },
  { id: "marketing", title: "Marketing" },
  { id: "automated-decisions", title: "Automated decision-making" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
] as const;

export const TERMS_SECTIONS: readonly LegalSection[] = [
  { id: "who-we-are", title: "Who we are" },
  { id: "accepting", title: "Accepting these terms" },
  { id: "changes", title: "Changes to these terms" },
  { id: "using-the-site", title: "Using this website" },
  {
    id: "not-an-offer",
    title: "Information on this site is not an offer or a quotation",
    short: "Not an offer or quotation",
  },
  { id: "enquiries", title: "Enquiries, and what happens when you submit one", short: "Enquiries" },
  { id: "content", title: "Our content, and yours" },
  { id: "as-is", title: "The site is provided as it is" },
  { id: "links", title: "Links to other sites" },
  { id: "liability", title: "Our liability" },
  { id: "indemnity", title: "Indemnity" },
  { id: "privacy", title: "Privacy" },
  { id: "general", title: "General" },
  { id: "governing-law", title: "Governing law and jurisdiction", short: "Governing law" },
  { id: "contact", title: "Contact" },
] as const;
