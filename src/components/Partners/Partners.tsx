import { PARTNERS } from "../../content/partners";
import { PartnerCarousel } from "./PartnerCarousel";
import styles from "./Partners.module.scss";

/**
 * The partner cards, directly after the hero: the Maple banner's card, once
 * per manufacturer Smarthaus is a partner of, with a toggle between them.
 * Replaced the Maple banner there on 2026-10-06, at Shivanshu's call, as the
 * stronger trust signal; src/components/Maple stays intact and unmounted.
 *
 * The section's h2 is for the outline and assistive technology only: each
 * card carries its own visible title, and a second visible heading above the
 * card would read as a label on a label.
 */
export function Partners() {
  return (
    <section className={styles.partners} aria-labelledby="partners" data-partners="">
      <h2 id="partners" className="visually-hidden">
        Our partners
      </h2>
      <PartnerCarousel partners={PARTNERS} />
    </section>
  );
}
