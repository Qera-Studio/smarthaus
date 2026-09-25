import Link from "next/link";
import { preload } from "react-dom";

import { POSTER } from "./frames";
import { HeroStage } from "./HeroStage";
import styles from "./Hero.module.scss";

/**
 * The homepage hero: headline, one line of copy, the villa, two CTAs.
 *
 * Server Component. The only client code is HeroStage, which owns the villa's
 * cursor-tracking. Everything with words in it is rendered here so the copy
 * ships in the HTML and never enters the client bundle.
 *
 * The villa is the page's LCP element. It is in the first HTML with
 * fetchpriority="high", and preloaded from the document head below so the
 * fetch starts before the parser reaches the <img>. No entrance animation:
 * anything that delays its first paint delays LCP.
 *
 * The h1 lives here. page.tsx used to carry a visually-hidden one to keep the
 * outline valid before the hero existed; this replaces it.
 */
export function Hero() {
  preload(POSTER, { as: "image", fetchPriority: "high" });

  return (
    // data-hero is the hook VillaCanvas uses to publish the tour state up
    // here: the canvas is a client component and this section is not, so the
    // flag travels through the DOM rather than as a prop.
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
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

        <div className={styles.stageClip}>
          <HeroStage />
        </div>

        <div className={styles.ctas}>
          <Link href="/contact" className={styles.primary} data-cursor-morph>
            Book a site visit
          </Link>
          {/*
            Phase 2 of the hero (the approach clip and the explorer) is not
            built. Until it is, this goes to the solutions page, which is the
            nearest thing to "explore" the site has. Replace the href with the
            explorer trigger when that lands; do not remove the button — the
            landing composition is designed around two.
          */}
          <Link href="/solutions" className={styles.secondary} data-cursor-morph>
            Explore Villa
          </Link>
        </div>

        <p className={styles.byline}>Smarthaus by Maple Technologies.</p>
      </div>
    </section>
  );
}
