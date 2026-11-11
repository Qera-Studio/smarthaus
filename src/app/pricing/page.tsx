import type { Metadata } from "next";

import { ClosingCta } from "../../components/ClosingCta";
import { PricingComparison } from "../../components/PricingComparison";
import { PricingTiers } from "../../components/PricingTiers";
import styles from "./page.module.scss";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getPricingPage } from "../../sanity/content";

const PATH = "/pricing";

/**
 * LAUNCH GATE, now a switch in the Studio: "Show in search" on the pricing
 * document. It is off because every feature on this page is still to be
 * confirmed with Sunil; while it is, the page ships noindex, stays out of the
 * sitemap and emits no structured data. Turn it on only once they are.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPricingPage();
  return pageMetadata(seoInput(PATH, seo));
}

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
export default async function PricingPage() {
  const page = await getPricingPage();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.standfirst}>{page.standfirst}</p>
      </header>

      <PricingTiers headingLevel="h2" />

      <PricingComparison />

      {/* The questions a number raises. Six, not the full FAQ: that page is
          linked from the closing prompt for everything else. The block is the
          contact page's FAQ section, markup and styles copied, with only the
          content swapped. */}
      <section className={styles.section} aria-labelledby="pricing-faqs">
        <h2 className={styles.sectionTitle} id="pricing-faqs">
          {page.faqHeading}
        </h2>
        <div className={styles.faqs}>
          {page.faqs.map(({ id, question, answer }) => (
            // Native details/summary: keyboard operable and open without JS for
            // free, and it costs no client component. `name` makes them an
            // exclusive accordion, which browsers implement natively.
            <details key={id} className={styles.faq} name="pricing-faq">
              <summary className={styles.faqQuestion}>
                <span>{question}</span>
                <Chevron />
              </summary>
              {answer.map((paragraph) => (
                <p key={paragraph} className={styles.faqAnswer}>
                  {paragraph}
                </p>
              ))}
            </details>
          ))}
        </div>
      </section>

      <ClosingCta
        heading={page.closing.heading}
        body={page.closing.body}
        href="/contact"
        label={page.closing.cta}
        secondary={{ href: "/faq", label: page.closing.secondary ?? "" }}
      />
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className={styles.faqChevron}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
