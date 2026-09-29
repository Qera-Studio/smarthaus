import { Button } from "../Button";
import { PRICING_TIERS } from "../../content/pricing";
import styles from "./PricingTiers.module.scss";

/**
 * The four tier cards, as one row.
 *
 * Rendered in two places: under the homepage pricing section's h2, and under
 * the /pricing page's h1. The tier name's heading level is therefore a prop,
 * so that neither surface skips a level in its outline. Two values only; a
 * free string would let a caller do exactly that.
 *
 * Content and the claims status live in src/content/pricing.ts.
 */
export function PricingTiers({ headingLevel }: { headingLevel: "h2" | "h3" }) {
  const Heading = headingLevel;

  return (
    <ul className={styles.tiers}>
      {PRICING_TIERS.map((tier) => (
        // data-ground on the dark card only: it paints brown-950, where the
        // default brown-900 cursor dot is invisible. See globals.scss. It
        // inherits, so it cannot go on the list.
        <li
          key={tier.id}
          className={styles.tier}
          data-tone={tier.tone}
          {...(tier.tone === "dark" ? { "data-ground": "dark" } : {})}
        >
          <Heading className={styles.tierName}>{tier.name}</Heading>
          <p className={styles.tierDescription}>{tier.description}</p>
          <p className={styles.tierPrice}>{tier.price}</p>

          <div className={styles.tierCta}>
            {/* Every tier goes to the same form: the enquiry is the only
                conversion event on the site, and a tier is not a checkout. */}
            <Button href="/contact" variant={tier.ctaVariant}>
              Get started
            </Button>
          </div>

          <p className={styles.includesLabel}>{tier.name} includes:</p>
          <ul className={styles.includes}>
            {tier.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
