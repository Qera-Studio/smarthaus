import { getHomePage } from "../../sanity/content";
import { Words } from "../Words";
import styles from "./Care.module.scss";

/**
 * The annual maintenance section, directly below the Process stack.
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
 * No prices, at the client's request (2026-11-04): the two packages and what
 * each promises, nothing more. The section emits no structured data.
 */

export async function Care() {
  const { care } = await getHomePage();
  return (
    <section className={styles.care} aria-labelledby="care">
      <div className={styles.lead}>
        <h2 className={styles.leadHeading} data-reveal="" data-reveal-words="">
          <Words text={care.heading} />
        </h2>
        <p className={styles.leadBody} data-reveal="">
          {care.lead}
        </p>
      </div>

      <div className={styles.row}>
        <h3 className={styles.title} id="care" data-reveal="" data-reveal-words="">
          <Words text={care.packagesHeading} />
        </h3>

        <ul className={styles.packages}>
          {care.packages.map((pkg) => (
            // data-ground on the dark card: it paints brown-950, where the
            // default brown-900 cursor dot is invisible. See globals.scss.
            <li
              key={pkg.name}
              className={styles.package}
              data-reveal=""
              data-tone={pkg.tone}
              {...(pkg.tone === "dark" ? { "data-ground": "dark" } : {})}
            >
              <h4 className={styles.packageName}>{pkg.name}</h4>
              <p className={styles.packageDescription}>{pkg.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
