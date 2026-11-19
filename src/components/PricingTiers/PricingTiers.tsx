import { Button } from "../Button";
import { getPricingPage } from "../../sanity/content";
import styles from "./PricingTiers.module.scss";

/** "AED 16,000": whole dirhams, the form the package deck prints. */
export const formatPrice = (aed: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(aed);

/**
 * The four package cards, as one row.
 *
 * Rendered in two places: under the homepage pricing section's h2, and under
 * the /pricing page's h1. The package name's heading level is therefore a prop,
 * so that neither surface skips a level in its outline. Two values only; a
 * free string would let a caller do exactly that.
 *
 * Content is the pricing document in Sanity, from the package deck that is
 * the source for every package, device count and price (Shivanshu,
 * 2026-11-19). Prices are shown from that date; until then the site disclosed
 * none (2026-11-04).
 */
export async function PricingTiers({ headingLevel }: { headingLevel: "h2" | "h3" }) {
  const { tiers, tierCta, includes, priceLabel } = await getPricingPage();
  const Heading = headingLevel;

  return (
    <ul className={styles.tiers}>
      {tiers.map((tier) => (
        // data-ground on the dark card only: it paints brown-950, where the
        // default brown-900 cursor dot is invisible. See globals.scss. It
        // inherits, so it cannot go on the list.
        <li
          key={tier.id}
          className={styles.tier}
          // Does nothing on /pricing: only the homepage mounts ScrollReveal.
          data-reveal=""
          data-tone={tier.tone}
          {...(tier.tone === "dark" ? { "data-ground": "dark" } : {})}
        >
          <Heading className={styles.tierName}>{tier.name}</Heading>
          <p className={styles.tierTagline}>{tier.tagline}</p>
          <p className={styles.tierDescription}>{tier.description}</p>
          <p className={styles.price}>
            <span className={styles.priceLabel}>{priceLabel}</span>{" "}
            <span className={styles.priceAmount}>{formatPrice(tier.price)}</span>
          </p>

          <div className={styles.tierCta}>
            {/* Every package goes to the same form: the enquiry is the only
                conversion event on the site, and a package is not a checkout. */}
            <Button href="/contact" variant={tier.ctaVariant}>
              {tierCta}
            </Button>
          </div>

          <p className={styles.includesLabel}>
            {tier.name} {includes}
          </p>
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
