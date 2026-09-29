import { Button } from "../Button";
import { PricingTiers } from "../PricingTiers";
import styles from "./Pricing.module.scss";

/**
 * The four package tiers, between the Process rail and the care packages.
 *
 * The page now reads process, then what a system costs, then what keeping it
 * running costs, then the enquiry form. Ravi wants a fixed price and James &
 * Emma are comparing five vendors: both need a number before they will fill in
 * a form, and until this section existed the only money on the homepage was
 * Care's two maintenance figures.
 *
 * Each card carries a headline list only. The full feature comparison lives on
 * /pricing, which is where the button under the cards goes. The cards
 * themselves are PricingTiers, shared with that page, and their content and
 * claims status are in src/content/pricing.ts.
 *
 * The section sits on the page's own light canvas. The dark ground is the
 * Process rail's alone: this shipped dark first and, directly under the rail,
 * the two read as one long tunnel rather than as two sections. Only the
 * Signature card is dark now.
 *
 * Prices and features are placeholder; see the claims note in
 * src/content/pricing.ts. This section emits no structured data for that
 * reason, and the unit suite asserts the absence.
 */

export function Pricing() {
  return (
    // data-pricing is the stable hook for e2e: the module's class names are
    // hashed at build time. Same reason Process carries data-process.
    //
    // The section sits on the page's own light canvas. The dark ground belongs
    // to the Process rail alone, and a second dark block directly below it read
    // as one long tunnel rather than two sections.
    //
    // data-ground is not on the section: it inherits, so it would claim the
    // light ground is dark and flip the cursor everywhere. PricingTiers puts it
    // on the one card that paints dark.
    <section className={styles.pricing} aria-labelledby="pricing" data-pricing>
      <div className={styles.intro}>
        <h2 className={styles.heading} id="pricing">
          Choose your level of intelligence
        </h2>
        <p className={styles.standfirst}>
          Four levels, from a single room to a fully engineered residence. Every one is quoted
          against your own drawings after a site visit, so the figure below is where the
          conversation starts rather than where it lands.
        </p>
      </div>

      <PricingTiers headingLevel="h3" />

      <div className={styles.compare}>
        <Button href="/pricing">View detailed pricing</Button>
      </div>
    </section>
  );
}
