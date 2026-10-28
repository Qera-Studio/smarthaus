import Image from "next/image";

import {
  HERO_CAROUSEL_HREF,
  HERO_CAROUSEL_ITEMS,
  type HeroCarouselItem,
} from "../../content/hero-carousel";
import { whatsappLink } from "../../lib/contact";
import { Button } from "../Button";
import { CarouselPause } from "./CarouselPause";
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

/** The five portraits in the projects pill, public/hero/s1.png to s5.png. */
const FACES = ["s1", "s2", "s3", "s4", "s5"] as const;

function Card({ item, priority }: { item: HeroCarouselItem; priority: boolean }) {
  return (
    <li className={styles.card}>
      <Image
        className={styles.image}
        src={`/hero/hero_carousel/${item.image.src}`}
        width={item.image.width}
        height={item.image.height}
        alt={item.image.alt}
        sizes="(min-width: 64rem) 25rem, 18rem"
        priority={priority}
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
 * The homepage hero: rating, title, one line, two CTAs, then a strip of
 * images drifting right to left, and the projects pill under it.
 *
 * Server Component. The strip moves on a CSS animation over two copies of the
 * list; the second copy is inert and hidden from AT, so each card is read and
 * focused once. Hover or focus inside the strip stops it (the stylesheet), and
 * CarouselPause is the button WCAG 2.2.2 asks for. Under reduced motion the
 * strip does not move and scrolls sideways instead.
 *
 * Replaced FluidHero on 2026-10-28; src/components/FluidHero stays, unmounted.
 * The h1 is the page's only one and its LCP element.
 */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <div className={styles.copy}>
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
        <div className={styles.ctas}>
          <Button href="/contact" size="sm">
            Book a site visit
          </Button>
          <Button href={whatsappLink(WHATSAPP_MESSAGE)} variant="outline" size="sm">
            WhatsApp
          </Button>
        </div>
      </div>

      <div className={styles.strip} data-hero-strip>
        <div className={styles.track}>
          <ul className={styles.list} aria-label="What we install">
            {HERO_CAROUSEL_ITEMS.map((item, index) => (
              <Card key={item.id} item={item} priority={index < 4} />
            ))}
          </ul>
          <ul className={styles.list} aria-hidden="true" inert data-copy>
            {HERO_CAROUSEL_ITEMS.map((item) => (
              <Card key={item.id} item={item} priority={false} />
            ))}
          </ul>
        </div>
        <CarouselPause className={styles.pause} />
      </div>

      <div className={styles.proof}>
        <p className={styles.pill}>
          <span className={styles.faces} aria-hidden="true">
            {FACES.map((face) => (
              <Image
                key={face}
                className={styles.face}
                src={`/hero/${face}.png`}
                width={38}
                height={38}
                alt=""
              />
            ))}
          </span>
          {PROJECTS}
        </p>
        <p className={styles.byline}>SIRA Licence | Smarthaus by Maple Technologies.</p>
      </div>
    </section>
  );
}
