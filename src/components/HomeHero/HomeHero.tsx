import Image from "next/image";
import { Fragment } from "react";

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

/**
 * Two short statements either side of a drawn rule, centred as one line
 * (HomeHero.module.scss .pair). The rule is drawn rather than typed, since a
 * screen reader would say "vertical bar"; a hidden comma keeps the two apart
 * when read aloud. The rating line and the SIRA line share it, so they match.
 */
function Pair({ start, end }: { start: React.ReactNode; end: React.ReactNode }) {
  return (
    <p className={styles.pair}>
      <span>
        {start}
        <span className="visually-hidden">,</span>
      </span>
      <span className={styles.divider} aria-hidden="true" />
      <span>{end}</span>
    </p>
  );
}

/**
 * A line of copy, one span to a word, for the opening's word-by-word reveal
 * (HomeHero.module.scss). The spaces stay plain text between inline spans, so
 * it is still one sentence to a screen reader and wraps as it always did.
 */
function Words({ text }: { text: string }) {
  return text.split(" ").map((word, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className={styles.word}>{word}</span>
    </Fragment>
  ));
}

/** The hero's two lines: exported so a test holds them to the opening's counts. */
export const TITLE = "Home at your fingertips";
export const LEDE =
  "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.";

/**
 * The homepage hero: the rating and the project count on one line, the
 * title, one line, two CTAs and the SIRA line, then the strip's pause button
 * and a strip of images drifting right to left, pinned to the bottom of the
 * screen.
 *
 * Server Component. The strip moves on a CSS animation over two copies of the
 * list; the second copy is inert and hidden from AT, so each card is read and
 * focused once. Hover or focus inside the strip stops it (the stylesheet), and
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
        <Pair
          start={
            <>
              <span aria-hidden="true">★</span> {RATING} on Google reviews
            </>
          }
          end={PROJECTS}
        />
        <h1 className={styles.title} id="hero-title">
          <Words text={TITLE} />
        </h1>
        <p className={styles.lede}>
          <Words text={LEDE} />
        </p>
        <div className={styles.ctas}>
          <Button href="/contact" size="sm">
            Book a site visit
          </Button>
          <Button href={whatsappLink(WHATSAPP_MESSAGE)} variant="outline" size="sm">
            WhatsApp
          </Button>
        </div>
        <Pair start="SIRA Licence" end="Smarthaus by Maple Technologies." />
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
        </div>
      </div>
    </section>
  );
}
