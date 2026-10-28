import Image from "next/image";

import {
  HERO_CAROUSEL_HREF,
  HERO_CAROUSEL_ITEMS,
  type HeroCarouselItem,
} from "../../content/hero-carousel";
import { whatsappLink } from "../../lib/contact";
import { Button } from "../Button";
import { StripControls } from "./StripControls";
import styles from "./HomeHero.module.scss";

/**
 * The Google rating in the pill above the title. Verified by Shivanshu on
 * 2026-09-28. It is a claim (AGENTS.md, claims and capability audit): if the
 * profile's rating moves, this moves with it.
 */
export const RATING = "4.8";

/** Verified and approved by Shivanshu, 2026-10-28. */
export const PROJECTS = "180+ projects completed across Dubai";

/** Pre-filled per AGENTS.md: the page topic and the project type. */
const WHATSAPP_MESSAGE = "Hi, I'm interested in home automation for my villa.";

/**
 * How the card loads. "first" is the page's largest paint: fetched at high
 * priority. "eager" is on screen at load. "lazy" is everything after.
 * Next 16 deprecated `priority`; these are the attributes it now points to.
 */
type Load = "first" | "eager" | "lazy";

function Card({ item, load }: { item: HeroCarouselItem; load: Load }) {
  return (
    <li className={styles.card}>
      <Image
        className={styles.image}
        src={`/hero/hero_carousel/${item.image.src}`}
        width={item.image.width}
        height={item.image.height}
        alt={item.image.alt}
        // A card is as tall as the space under the copy, at 4:3: about 500px
        // wide on a laptop, 300 on a phone.
        sizes="(min-width: 64rem) 32rem, 20rem"
        loading={load === "lazy" ? "lazy" : "eager"}
        fetchPriority={load === "first" ? "high" : undefined}
      />
      <div className={styles.overlay}>
        <p className={styles.cardTitle}>{item.title}</p>
        <p className={styles.cardLine}>{item.line}</p>
        <Button href={HERO_CAROUSEL_HREF} variant="inverse" size="sm">
          {item.cta}
        </Button>
      </div>
    </li>
  );
}

/**
 * The homepage hero: the rating and the project count on one line, the
 * title, one line, two CTAs and the SIRA byline, then the strip's controls
 * and a strip of images drifting right to left that runs to the bottom of
 * the screen.
 *
 * Server Component. The strip moves on a CSS animation over two copies of the
 * list; the second copy is inert and hidden from AT, so each card is read and
 * focused once. Hover or focus inside the strip stops it (the stylesheet), and
 * StripControls holds the pause button WCAG 2.2.2 asks for and the arrows.
 * Under reduced motion the strip does not move and scrolls sideways instead.
 *
 * Replaced FluidHero on 2026-10-28; src/components/FluidHero stays, unmounted.
 * The h1 is the page's only one. The LCP element is the first card's image
 * (measured 2026-10-28, desktop and phone), which is why it alone is fetched
 * at high priority, the next three eagerly, and the rest lazily.
 */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <div className={styles.copy}>
        <p className={styles.proof}>
          <span>
            <span aria-hidden="true">★</span> {RATING} on Google reviews
          </span>
          {/* The rule is drawn, not read: a screen reader would say "vertical
              bar". The two claims are separate spans either way. */}
          <span className={styles.divider} aria-hidden="true" />
          <span>{PROJECTS}</span>
        </p>
        <h1 className={styles.title} id="hero-title">
          Home at your fingertips
        </h1>
        <p className={styles.lede}>
          Cameras, entry, audio and home automation for Dubai villas. Installed, connected and
          looked after by one licensed team.
        </p>
        <div className={styles.ctas}>
          <Button href="/contact" size="sm">
            Book a site visit
          </Button>
          <Button href={whatsappLink(WHATSAPP_MESSAGE)} variant="outline" size="sm">
            WhatsApp
          </Button>
        </div>
        <p className={styles.byline}>SIRA Licence | Smarthaus by Maple Technologies.</p>
      </div>

      <StripControls className={styles.controls} buttonClassName={styles.control} />

      <div className={styles.strip} data-hero-strip>
        <div className={styles.track}>
          <ul className={styles.list} aria-label="What we install">
            {HERO_CAROUSEL_ITEMS.map((item, index) => (
              <Card
                key={item.id}
                item={item}
                load={index === 0 ? "first" : index < 4 ? "eager" : "lazy"}
              />
            ))}
          </ul>
          <ul className={styles.list} aria-hidden="true" inert data-copy>
            {HERO_CAROUSEL_ITEMS.map((item) => (
              <Card key={item.id} item={item} load="lazy" />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
