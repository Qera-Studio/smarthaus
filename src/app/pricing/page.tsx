import type { Metadata } from "next";

import { ClosingCta } from "../../components/ClosingCta";
import { FaqAccordion } from "../../components/Faq";
import { PricingComparison } from "../../components/PricingComparison";
import { PricingTiers } from "../../components/PricingTiers";
import { PRICING_FAQS } from "../../content/pricing";
import styles from "./page.module.scss";

/**
 * LAUNCH GATE. Same mechanism as /faq.
 *
 * Every price and feature on this page is placeholder (see the claims note in
 * src/content/pricing.ts), so the page ships noindex, stays out of the sitemap
 * and emits no structured data. Visitors reach it from the nav; only crawlers
 * are told to wait. To publish: confirm the numbers with Sunil, flip this to
 * true, add /pricing to src/app/sitemap.ts, and reconsider Offer markup, all
 * in one change.
 */
const PRICING_IS_PUBLISHABLE = false;

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Four levels of Smarthaus automation, from a single room to a fully engineered residence, with every feature compared side by side.",
  alternates: { canonical: "/pricing" },
  robots: PRICING_IS_PUBLISHABLE ? undefined : { index: false, follow: true },
};

/**
 * The pricing page: the four tier cards, then the full comparison.
 *
 * Not LegalPage. That shell brings a table-of-contents rail and a prose column
 * built for legal text, neither of which a row of cards wants. The header is
 * the contact page's pattern, restated because a CSS Module's classes are
 * local to its file.
 *
 * The cards are h2 here, under the page's h1; on the homepage the same cards
 * are h3 under the section's h2. PricingTiers takes the level as a prop for
 * exactly that.
 */
export default function PricingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pricing</h1>
        <p className={styles.standfirst}>
          Four levels, from a single room to a fully engineered residence. Every one is quoted
          against your own drawings after a site visit, so the figure is where the conversation
          starts rather than where it lands.
        </p>
      </header>

      <PricingTiers headingLevel="h2" />

      <PricingComparison />

      {/* The questions a number raises. Six, not the full FAQ: that page is
          linked from the closing prompt for everything else. FaqAccordion is
          the FAQ page's own component, so the two cannot drift in behaviour. */}
      <section className={styles.faqs} aria-labelledby="pricing-faqs">
        <h2 className={styles.faqsHeading} id="pricing-faqs">
          Questions about pricing
        </h2>
        <div className={styles.faqsList}>
          {PRICING_FAQS.map((entry) => (
            <FaqAccordion key={entry.id} entry={entry} />
          ))}
        </div>
      </section>

      <ClosingCta
        heading="Not sure which level?"
        body="Most people are between two. Tell us about the property and we will say which one fits, and why."
        href="/contact"
        label="Book a site visit"
        secondary={{ href: "/faq", label: "Read the full FAQ" }}
      />
    </div>
  );
}
