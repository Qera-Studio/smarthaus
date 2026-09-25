import { Button } from "../Button";
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
 * Each card carries a headline list only. The exhaustive feature tables, the
 * example scenes, the exclusions and the "ideal for" lines belong on /pricing,
 * which is the next thing to be built and is what the comparison button points
 * at.
 *
 * The section sits on the page's own light canvas. The dark ground is the
 * Process rail's alone: this shipped dark first and, directly under the rail,
 * the two read as one long tunnel rather than as two sections. Only the
 * Signature card is dark now.
 *
 * ## Claims status — read this before editing the numbers
 *
 * The four prices and every feature line here are PLACEHOLDER. They came from a
 * design reference, not from a package sheet, and none is sourced in this repo.
 * They are printed plainly rather than braced through <Placeholder> because
 * that was an explicit product decision, not an oversight.
 *
 * Two consequences, both load-bearing:
 *
 * 1. This section emits NO structured data. No Offer, no Product, no
 *    PriceSpecification. /faq withholds its FAQPage schema for exactly this
 *    reason (FAQ_IS_PUBLISHABLE), and an unconfirmed price quoted back by an
 *    answer engine as fact is the failure that rule exists to prevent. The unit
 *    suite asserts the absence, so re-adding schema means deliberately deleting
 *    a test.
 * 2. Several features named below sit outside the confirmed capability audit in
 *    AGENTS.md — CCTV, pool automation, solar and battery, KNX/BMS, home
 *    cinema. Saying a tier "includes" them is a claim about scope of work.
 *
 * Clearing this means confirming every price and every line with Sunil, at
 * which point the structured data can be reconsidered as one change.
 */

type PricingTier = {
  /** Stable key, and the anchor /pricing will use. */
  id: string;
  name: string;
  /** Rendered exactly as written, "+" included. */
  price: string;
  description: string;
  includes: readonly string[];
  /**
   * The card's ground. Separate from `ctaVariant` rather than derived: the
   * image card takes a solid button and the dark card a bone one, so the
   * mapping is not one-to-one and a lookup would say less than two fields do.
   */
  tone: "sand" | "image" | "dark";
  ctaVariant: "solid" | "inverse" | "outline";
};

const TIERS: readonly PricingTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: "AED 4,999+",
    description:
      "For apartments, single rooms, and a first step into automation that does not need rewiring.",
    includes: [
      "Smart lighting control",
      "Basic AC and climate control",
      "Smart plugs and switches",
      "Motion and occupancy sensors",
      "Mobile app control",
      "Voice assistant integration",
      "Scenes and routines",
      "Remote access",
      "Setup and commissioning",
      "User training",
      "Standard installation",
    ],
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    id: "smart",
    name: "Smart",
    price: "AED 14,999+",
    description:
      "For homes where several systems should work together rather than sit behind separate apps.",
    includes: [
      "Everything in Essential",
      "Whole-home lighting control",
      "Motorised curtain integration",
      "Smart door locks and video doorbell",
      "Security sensors",
      "Multi-room voice control",
      "Presence detection",
      "Wall panels alongside the app",
      "Energy monitoring",
      "Custom automation routines",
      "System documentation",
    ],
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    id: "connected",
    name: "Connected",
    price: "AED 39,999+",
    description:
      "Whole-home automation: lighting, climate, shading, security and audio on one platform.",
    includes: [
      "Everything in Smart",
      "Multi-zone climate control",
      "Motorised blinds and shading",
      "CCTV and video intercom",
      "Intrusion detection",
      "Multi-room audio",
      "Central control platform",
      "Touch panels throughout",
      "Structured networking",
      "Remote monitoring",
      "Device management",
    ],
    tone: "image",
    ctaVariant: "solid",
  },
  {
    id: "signature",
    name: "Signature",
    price: "AED 99,999+",
    description:
      "A fully engineered residence, from site survey and system design through to handover.",
    includes: [
      "Everything in Connected",
      "Architectural and circadian lighting",
      "HVAC and BMS integration",
      "Gate, garage and access control",
      "Dedicated home cinema",
      "Pool, garden and irrigation automation",
      "Solar, battery and EV charging",
      "Air quality monitoring",
      "Custom dashboards and user profiles",
      "Project management and commissioning",
      "As-built documentation and training",
    ],
    tone: "dark",
    ctaVariant: "inverse",
  },
];

export function Pricing() {
  return (
    // data-pricing is the stable hook for e2e: the module's class names are
    // hashed at build time. Same reason Process carries data-process.
    //
    // The section sits on the page's own light canvas. The dark ground belongs
    // to the Process rail alone, and a second dark block directly below it read
    // as one long tunnel rather than two sections.
    //
    // data-ground therefore appears on the Signature card only, which is the
    // one box here that paints dark. It inherits, so putting it on the section
    // would claim the light ground is dark and flip the cursor everywhere.
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

      <ul className={styles.tiers}>
        {TIERS.map((tier) => (
          // data-ground on the dark card only: it paints brown-900, where the
          // default brown-900 cursor dot is invisible. See globals.scss.
          <li
            key={tier.id}
            className={styles.tier}
            data-tone={tier.tone}
            {...(tier.tone === "dark" ? { "data-ground": "dark" } : {})}
          >
            <h3 className={styles.tierName}>{tier.name}</h3>
            <p className={styles.tierDescription}>{tier.description}</p>
            <p className={styles.tierPrice}>{tier.price}</p>

            <div className={styles.tierCta}>
              {/* Every tier goes to the same form: the enquiry is the only
                  conversion event on the site, and a tier is not a checkout. */}
              <Button href="/contact" variant={tier.ctaVariant}>
                Get started
              </Button>
            </div>

            <p className={styles.includesLabel}>{tier.name} includes</p>
            <ul className={styles.includes}>
              {tier.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className={styles.compare}>
        {/*
          /pricing does not exist yet, so this points at the contact form until
          it does. Swap the href in the same change that adds the page: a link
          to a 404 is worse than one extra step to the same enquiry, and the
          label already promises the page rather than the form.
        */}
        <Button href="/contact">View detailed pricing</Button>
      </div>
    </section>
  );
}
