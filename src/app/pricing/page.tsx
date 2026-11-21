import type { Metadata } from "next";

import { ClosingCta } from "../../components/ClosingCta";
import { JsonLd, pageGraph } from "../../components/Schema";
import { PricingComparison } from "../../components/PricingComparison";
import { PricingTiers } from "../../components/PricingTiers";
import styles from "./page.module.scss";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getPricingPage } from "../../sanity/content";

const PATH = "/pricing";

/**
 * "Show in search" on the pricing document decides the robots line and the
 * sitemap entry. On since 2026-11-19, when the package deck confirmed every
 * package, device count and price on the page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPricingPage();
  return pageMetadata(seoInput(PATH, seo));
}

/**
 * The pricing page: the four package cards, the device table, the deck's
 * package notes, then the questions a price raises.
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
      {/* The page and its breadcrumb, as every page in search has. No Offer:
          a starting price is not the price (PricingTiers). */}
      {page.seo.index ? (
        <JsonLd data={pageGraph(seoInput(PATH, page.seo), page.updatedAt)} />
      ) : null}

      <header className={styles.header}>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.standfirst}>{page.standfirst}</p>
      </header>

      <PricingTiers headingLevel="h2" />

      <PricingComparison />

      {/* The deck's terms under its prices: what the survey can change and
          what is quoted separately. An ordered list, as the deck numbers them. */}
      <section className={styles.section} aria-labelledby="pricing-notes">
        <h2 className={styles.sectionTitle} id="pricing-notes">
          {page.notesHeading}
        </h2>
        <ol className={styles.notes}>
          {page.notes.map((note) => (
            <li key={note} className={styles.note}>
              {note}
            </li>
          ))}
        </ol>
      </section>

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
