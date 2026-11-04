import Image from "next/image";

import {
  HERO_CAROUSEL_HREF,
  HERO_CAROUSEL_ITEMS,
  type HeroCarouselItem,
} from "../../content/hero-carousel";
import { whatsappLink } from "../../lib/contact";
import { Button } from "../Button";
import { Words } from "../Words";
import { StripControls } from "./StripControls";
import styles from "./HomeHero.module.scss";

/**
 * The Google rating in the pill above the title. Verified by Shivanshu on
 * 2026-09-28. It is a claim (AGENTS.md, claims and capability audit): if the
 * profile's rating moves, this moves with it.
 */
export const RATING = "4.8";

/** Verified and approved by Shivanshu, 2026-10-28; this wording 2026-11-04. */
export const PROJECTS = "180+ Dubai projects";

/** The hero's four proofs, each with its mark, in the order they are read. */
const PROOF = [
  { icon: styles.star, text: `${RATING} on Google reviews` },
  { icon: styles.projects, text: PROJECTS },
  { icon: styles.sira, text: "SIRA Licence" },
  { icon: styles.maple, text: "by Maple Technologies" },
];

/** The cards the strip runs past on its way in, ahead of the first. */
export const LEAD_CARDS = 2;

/** Pre-filled per AGENTS.md: the page topic and the project type. */
const WHATSAPP_MESSAGE = "Hi, I'm interested in home automation for my villa.";

/**
 * How the card loads. "first" is the page's largest paint: fetched at high
 * priority. "eager" is on screen at load. "late" is everything after: fetched
 * at once but behind the rest, at low priority.
 *
 * Not lazy (2026-10-28). A lazy image loads when it nears the screen, and the
 * strip brings its cards there by a transform the GPU runs: in Chrome on a
 * Mac the cards from the fifth on, and all of the second copy, stayed blank,
 * so the strip seemed to run once and stop. The second copy shares the
 * first's URLs, so loading it costs nothing more.
 * Next 16 deprecated `priority`; these are the attributes it now points to.
 */
type Load = "first" | "eager" | "late";

function Card({ item, load }: { item: HeroCarouselItem; load: Load }) {
  return (
    <li className={styles.card}>
      <Image
        className={styles.image}
        src={`/hero/hero_carousel/${item.image.src}`}
        width={item.image.width}
        height={item.image.height}
        alt={item.image.alt}
        // From lg a card is at most 30vw wide; below it a card is as tall as the
        // space under the copy, at 4:3, about 300px wide on a phone.
        sizes="(min-width: 64rem) 30vw, 20rem"
        loading="eager"
        fetchPriority={load === "first" ? "high" : load === "late" ? "low" : undefined}
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

/** The hero's two lines: exported so a test holds them to the opening's counts. */
export const TITLE = "Home at your fingertips";
export const LEDE =
  "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.";

/**
 * The homepage hero: the title, one line and two CTAs at the start of the row
 * and the four proofs at its end (below lg, under them), then the strip's pause
 * button and a strip of images drifting right to left, pinned to the bottom of
 * the screen.
 *
 * Server Component. The strip moves on a CSS animation over two copies of the
 * list; the second copy is inert and hidden from AT, so each card is read and
 * focused once, and so are the lead cards off the start of the track, which
 * only the opening ever brings on screen. Hover or focus inside the strip stops it (the stylesheet), and
 * StripControls holds the pause button WCAG 2.2.2 asks for, and lets a mouse
 * drag or a trackpad swipe move the strip.
 * Under reduced motion the strip does not move and scrolls sideways instead.
 *
 * Replaced FluidHero on 2026-10-28; src/components/FluidHero stays, unmounted.
 * The h1 is the page's only one. The LCP element is the first card's image
 * (measured 2026-10-28 in Chromium, desktop and phone; on an iPhone 17 in
 * WebKit it is the subtitle, measured 2026-11-02), which is why it alone is
 * fetched at high priority, the next three at the default, and the rest at
 * low (see Load).
 */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <div className={styles.copy}>
        <div>
          <h1 className={styles.title} id="hero-title">
            <Words text={TITLE} className={styles.word} />
          </h1>
          <p className={styles.lede}>
            <Words text={LEDE} className={styles.word} />
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
        <ul className={styles.proof}>
          {PROOF.map(({ icon, text }) => (
            <li key={text}>
              <span className={`${styles.icon} ${icon}`} aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <StripControls className={styles.controls} buttonClassName={styles.control} />

      <div className={styles.strip} data-hero-strip>
        <div className={styles.track}>
          <ul className={styles.list} aria-label="What we install">
            {HERO_CAROUSEL_ITEMS.map((item, index) => (
              <Card
                key={item.id}
                item={item}
                load={index === 0 ? "first" : index < 4 ? "eager" : "late"}
              />
            ))}
          </ul>
          <ul className={styles.list} aria-hidden="true" inert data-copy>
            {HERO_CAROUSEL_ITEMS.map((item) => (
              <Card key={item.id} item={item} load="late" />
            ))}
          </ul>
          <ul
            className={`${styles.list} ${styles.lead}`}
            aria-hidden="true"
            inert
            data-copy
            data-lead
          >
            {HERO_CAROUSEL_ITEMS.slice(-LEAD_CARDS).map((item) => (
              <Card key={item.id} item={item} load="late" />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
