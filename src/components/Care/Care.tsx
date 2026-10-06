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
 * The Premium Care response window is six hours, confirmed by Shivanshu on
 * 2026-09-28 and printed plainly. faq.ts "support-response" states the same
 * figure; change both together or they will drift.
 *
 * The two PRICES are printed plainly and are NOT independently sourced in this
 * repo. They came from the design reference, not from a package sheet. If they
 * turn out to be provisional they need the brace-and-note treatment faq.ts
 * uses, and this section emits no structured data until every figure in it is
 * confirmed.
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
    description:
      "Everything in Standard Care, plus priority response within 6 hours, seven days a week, including evenings and weekends. One number, a named engineer who knows your installation, and no triage queue.",
    price: "AED 8,000/year",
    tone: "dark",
  },
] as const;

export function Care() {
  return (
    <section className={styles.care} aria-labelledby="care">
      <div className={styles.lead}>
        <h2 className={styles.leadHeading}>Looked after, long after installation.</h2>
        <p className={styles.leadBody}>
          With Smarthaus Premium Care you call one number, day or night, and someone who knows your
          installation picks up.
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
              <p className={styles.packageDescription}>{pkg.description}</p>
              <p className={styles.packagePrice}>{pkg.price}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
