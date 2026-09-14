import { Fragment } from "react";

import { Placeholder } from "../LegalPage";
import styles from "./Care.module.scss";

/**
 * The annual maintenance section, directly below the Process rail.
 *
 * Laid out as the contact page's Location block: a title on the left, two equal
 * panels on the right, the row sizing both so neither can outgrow the other.
 * There the panels are a photograph and a card; here they are two cards.
 *
 * A centred lead-in sits above the rule — the one scene on the homepage that
 * names the failure Premium Care is sold against.
 *
 * Heading is h2: sibling of the other homepage sections, not a subsection.
 *
 * ## Claims status
 *
 * The Premium Care response window is BRACED and carries a pending note, the
 * same convention faq.ts uses: it renders through <Placeholder> so a reader
 * sees it is provisional. faq.ts "support-response" holds the same {4} and the
 * same note, so the two must be cleared in one change or they will drift.
 *
 * The two PRICES are printed plainly and are NOT independently sourced in this
 * repo. They came from the design reference, not from a package sheet. If they
 * turn out to be provisional they need the same brace-and-note treatment, and
 * this section emits no structured data until every placeholder here is clear
 * — the reason /faq withholds its FAQPage schema.
 */

const PACKAGES = [
  {
    name: "Standard Care",
    description:
      "Two planned visits a year, remote monitoring between them, and software kept current. When something needs attention, we respond the next business day.",
    price: "AED 5,000/year",
    tone: "light",
  },
  {
    name: "Premium Care",
    // The response window is the one figure here that is not yet confirmed.
    // Braced and paired with a pending note, the same convention faq.ts uses,
    // and rendered through <Placeholder> so it is visibly provisional rather
    // than quietly wrong. faq.ts "support-response" carries the same {4} and
    // the same note: clear both in one change, not one at a time.
    description:
      "Everything in Standard Care, plus priority response within {4} hours, seven days a week, including evenings and weekends. One number, a named engineer who knows your installation, and no triage queue.",
    pending: "Premium Care response window to be confirmed with Sunil.",
    price: "AED 8,000/year",
    tone: "dark",
  },
] as const;

export function Care() {
  return (
    <section className={styles.care} aria-labelledby="care">
      <div className={styles.lead}>
        <h2 className={styles.leadHeading}>Friday, 9:14pm. The gate won&rsquo;t open.</h2>
        <p className={styles.leadBody}>
          This is the moment that decides whether a smart home was worth it. With Smarthaus Premium
          Care you call one number, day or night, and someone who knows your installation picks up.
        </p>
      </div>

      <div className={styles.row}>
        <h3 className={styles.title} id="care">
          Annual maintenance packages
        </h3>

        <ul className={styles.packages}>
          {PACKAGES.map((pkg) => (
            // data-ground on the dark card: it paints brown-950, where the
            // default brown-900 cursor dot is invisible. See globals.scss.
            <li
              key={pkg.name}
              className={styles.package}
              data-tone={pkg.tone}
              {...(pkg.tone === "dark" ? { "data-ground": "dark" } : {})}
            >
              <h4 className={styles.packageName}>{pkg.name}</h4>
              <p className={styles.packageDescription}>{renderPlaceholders(pkg.description)}</p>
              {"pending" in pkg ? <Placeholder>{pkg.pending}</Placeholder> : null}
              <p className={styles.packagePrice}>{pkg.price}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Splits `{braced}` spans out of a string and wraps each in <Placeholder>.
 *
 * Same shape as FaqAccordion's own renderPlaceholders, restated rather than
 * imported: that one is defined inside a client component, and pulling it in
 * would drag that chunk onto the homepage for a four-line function.
 *
 * The brace is a render-time marker, never content — it must not reach a
 * string that gets quoted, which is why this section emits no structured data
 * while any placeholder remains.
 */
function renderPlaceholders(text: string) {
  return text
    .split(/\{([^}]+)\}/g)
    .map((part, i) =>
      i % 2 === 1 ? <Placeholder key={i}>{part}</Placeholder> : <Fragment key={i}>{part}</Fragment>,
    );
}
