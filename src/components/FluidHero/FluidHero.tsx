import Link from "next/link";

import { whatsappLink } from "../../lib/contact";
import { FluidCanvas } from "./FluidCanvas";
import styles from "./FluidHero.module.scss";

/**
 * The Google rating in the pill above the title. Verified by Shivanshu on
 * 2026-09-28. It is a claim (AGENTS.md, claims and capability audit): if the
 * profile's rating moves, this moves with it.
 */
export const RATING = "4.8";

/** Pre-filled per AGENTS.md: the page topic and the project type. */
const WHATSAPP_MESSAGE = "Hi, I'm interested in home automation for my villa.";

/**
 * The homepage hero, fluid edition: a brown-100 field the pointer drags
 * brown-800 ink through, with the headline, one line of copy and two CTAs
 * over it. This stands in for the villa hero (src/components/Hero/, still in
 * the repo, unmounted) while the hero's content is being written.
 *
 * Server Component. The only client code is FluidCanvas. The h1 is the page's
 * only one and its LCP element, and process.spec.ts and forced-colors.spec.ts
 * find the primary CTA by its text.
 */
export function FluidHero() {
  return (
    // data-hero is where FluidCanvas hangs its listeners and its ready flag.
    // The canvas is a client component and this section is not, so the state
    // travels through the DOM rather than as a prop.
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <FluidCanvas />
      <div className={styles.inner}>
        {/* data-hero-quiet: the glyph layer under the liquid keeps clear of
            these boxes, so nothing sits under the text (FluidCanvas.tsx). */}
        <div className={styles.copy} data-hero-quiet>
          <p className={styles.rating}>
            <span aria-hidden="true">★</span> {RATING} on Google reviews
          </p>
          <h1 className={styles.title} id="hero-title">
            Home at your fingertips
          </h1>
          <p className={styles.lede}>
            Cameras, entry, audio and home automation for Dubai villas. Installed, connected and
            looked after by one licensed team.
          </p>
        </div>

        <div className={styles.ctas} data-hero-quiet>
          <Link href="/contact" className={styles.primary}>
            Book a site visit
          </Link>
          <a href={whatsappLink(WHATSAPP_MESSAGE)} className={styles.secondary}>
            Message on WhatsApp
          </a>
        </div>

        <p className={styles.note} data-hero-quiet>
          A good system is one you stop noticing. The lights are already right when you walk in, the
          gate is already open, the house is already cool. Nothing to set up, nothing to remember.
        </p>

        <p className={styles.byline}>SIRA licensed · Smarthaus by Maple Technologies.</p>
      </div>
    </section>
  );
}
