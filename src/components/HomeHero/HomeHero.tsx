import Image from "next/image";
import { preload } from "react-dom";

import { getHomePage } from "../../sanity/content";
import type { HeroCard } from "../../sanity/types";
import { Button } from "../Button";
import { Words } from "../Words";
import { BRAND_RUNS, BRANDS, BRANDS_LABEL } from "./brands";
import { GlassCanvas } from "./GlassCanvas";
import { HeroLead } from "./HeroLead";
import { StripControls } from "./StripControls";
import styles from "./HomeHero.module.scss";

// The copy, the proof line and the cards are the homepage document in Sanity.
// The proof line states claims (the rating, "180+ Dubai projects"): each was
// confirmed before it was published, and a new one is asked first
// (AGENTS.md, claims audit). The title and lede word limits are the schema's,
// matched to the counts this stylesheet times.

/**
 * The ring picture behind the glass, already blurred as the design blurs it
 * (scripts/bake-glass-ground.mjs). About 3KB: the stylesheet paints it as the
 * hero's ground and GlassCanvas uploads the same file as its texture.
 */
export const GROUND = "/hero/glass/ground.webp";

/** The cards the strip runs past on its way in, ahead of the first. */
export const LEAD_CARDS = 2;

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

function Card({
  item,
  href,
  load,
  copy,
}: {
  item: HeroCard;
  href: string;
  load: Load;
  copy?: boolean;
}) {
  return (
    <li className={styles.card}>
      <Image
        className={styles.image}
        src={item.image.src}
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
        <Button href={href} variant="inverse" size="sm" tabIndex={copy ? -1 : undefined}>
          {item.cta}
        </Button>
      </div>
    </li>
  );
}

/** One mark: a small SVG or PNG, which next/image would only wrap in a loader it cannot use. */
function Mark({ brand, named }: { brand: (typeof BRANDS)[number]; named: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.brand}
      src={`/hero/brands/${brand.logo}`}
      alt={named ? brand.name : ""}
      width={brand.width}
      height={brand.height}
    />
  );
}

/**
 * The makers' marks: one named list, read once, then the loop's copies, bare
 * images hidden from AT.
 */
function Brands() {
  return (
    <>
      <ul className={styles.brandList} aria-label={BRANDS_LABEL}>
        {BRANDS.map((brand) => (
          <li key={brand.name}>
            <Mark brand={brand} named />
          </li>
        ))}
      </ul>
      {Array.from({ length: BRAND_RUNS - 1 }, (_, run) => (
        <div key={run} className={styles.brandList} aria-hidden="true" data-copy="">
          {BRANDS.map((brand) => (
            <Mark key={brand.name} brand={brand} named={false} />
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * The homepage hero (redesigned 2026-11-14, Figma 4886:1856): on a dark
 * ground of reeded glass over a blurred ring (the stylesheet first, then
 * GlassCanvas), the title, one line, the email field that sends a lead, the
 * four proofs, and a rail of the makers' marks. Under the glass, the strip's
 * pause button and the strip of images drifting right to left, its top a
 * tenth of the screen above the fold so the page asks to be scrolled.
 *
 * Server Component. The strip moves on a CSS animation over two copies of the
 * list; the second copy is hidden from AT and out of the tab order, so each
 * card is read and focused once, and takes the pointer as the first does. The
 * lead cards off the start of the track are inert, since only the opening ever
 * brings them on screen. Hover or focus inside the strip stops it (the stylesheet), and
 * StripControls holds the pause button WCAG 2.2.2 asks for, and lets a mouse
 * drag or a trackpad swipe move the strip. The rail of marks runs the same
 * way and stops with the same button.
 * Under reduced motion the strip does not move and scrolls sideways instead,
 * and the marks stand in a row.
 *
 * Replaced FluidHero on 2026-10-28; src/components/FluidHero stays, unmounted.
 * The h1 is the page's only one. The largest paint is usually the section
 * itself: the ground picture, painted as its background, which is 3KB and
 * preloaded at high priority so it lands with the first paint (measured
 * 2026-11-14, e2e/home-hero.spec.ts). The strip's first card is now mostly
 * below the fold; it is still fetched at high priority, the next three at the
 * default, and the rest at low (see Load).
 */
export async function HomeHero() {
  const { hero } = await getHomePage();
  const cards = hero.cards;
  // The stylesheet asks for it too, but only once it has loaded and parsed.
  preload(GROUND, { as: "image", fetchPriority: "high" });
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hero>
      <GlassCanvas src={GROUND} />
      <div className={styles.copy}>
        <h1 className={styles.title} id="hero-title">
          <Words text={hero.title} className={styles.word} />
        </h1>
        <p className={styles.lede}>
          <Words text={hero.lede} className={styles.word} />
        </p>
        <HeroLead cta={hero.visitCta} />
        <ul className={styles.proof}>
          {hero.proof.map((text, index) => (
            <li key={text}>
              {index === 0 && <span className={styles.star} aria-hidden="true" />}
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.brands} data-hero-brands>
        <div className={styles.brandTrack}>
          <Brands />
        </div>
      </div>

      <StripControls className={styles.controls} buttonClassName={styles.control} />

      <div className={styles.strip} data-hero-strip>
        <div className={styles.track}>
          <ul className={styles.list} aria-label={hero.stripLabel}>
            {cards.map((item, index) => (
              <Card
                key={item.id}
                item={item}
                href={hero.cardsHref}
                load={index === 0 ? "first" : index < 4 ? "eager" : "late"}
              />
            ))}
          </ul>
          {/* Not inert: an inert element takes no pointer, so every card in this
              copy lost its hover and its link once the loop brought it round
              (found 2026-11-04). Hidden from AT, and out of the tab order. */}
          <ul className={styles.list} aria-hidden="true" data-copy>
            {cards.map((item) => (
              <Card key={item.id} item={item} href={hero.cardsHref} load="late" copy />
            ))}
          </ul>
          <ul
            className={`${styles.list} ${styles.lead}`}
            aria-hidden="true"
            inert
            data-copy
            data-lead
          >
            {cards.slice(-LEAD_CARDS).map((item) => (
              <Card key={item.id} item={item} href={hero.cardsHref} load="late" />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
