import Link from "next/link";

import { FluidCanvas } from "./FluidCanvas";
import styles from "./FluidHero.module.scss";

/**
 * The homepage hero, fluid edition: a brown-100 field the pointer drags
 * brown-800 ink through, with the headline, one line of copy and two CTAs
 * over it. This stands in for the villa hero (src/components/Hero/, still in
 * the repo, unmounted) while the hero's content is being written.
 *
 * Server Component. The only client code is FluidCanvas. The copy below is
 * the villa hero's, kept word for word as a placeholder: the h1 is the page's
 * only one and its LCP element, and process.spec.ts and forced-colors.spec.ts
 * find the CTAs by their text.
 */
export function FluidHero() {
  return (
    // data-hero is where FluidCanvas hangs its listeners and its ready flag.
    // The canvas is a client component and this section is not, so the state
    // travels through the DOM rather than as a prop.
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <FluidCanvas />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 className={styles.title} id="hero-title">
            Home at your fingertips
          </h1>
          <p className={styles.lede}>
            Cameras, entry, audio and home automation for Dubai villas. Installed, connected and
            looked after by one licensed team.
          </p>
        </div>

        <div className={styles.ctas}>
          <Link href="/contact" className={styles.primary} data-cursor="none">
            Book a site visit
          </Link>
          <Link href="/solutions" className={styles.secondary} data-cursor="none">
            Explore Villa
          </Link>
        </div>

        <p className={styles.byline}>Smarthaus by Maple Technologies.</p>
      </div>
    </section>
  );
}
