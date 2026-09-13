import Link from "next/link";
import { ParticleText } from "../ParticleText";
import styles from "./ComingSoon.module.scss";

type ComingSoonProps = {
  /**
   * The line under the lockup. One sentence, specific to the page — CLAUDE.md's
   * voice rule is "specific, not vague", so each route says what is actually
   * coming rather than sharing one generic placeholder.
   *
   * No em dashes: the legal-page suite asserts none appear in visible copy, and
   * the same house rule applies here.
   */
  blurb: string;
};

/**
 * The placeholder every unbuilt route renders.
 *
 * Deliberately the same composition as `not-found`: the particle lockup, one
 * line of copy, one CTA home. A visitor who lands on an unfinished page should
 * feel they are still inside a finished site, which is what the shared
 * treatment buys — and it is why this reuses `ParticleText` rather than
 * inventing a second hero.
 *
 * "COMING SOON" is passed as two lines. Ten characters on one line either sets
 * the glyphs tiny or overflows at phone width; stacked, the lockup keeps a
 * presence close to the 404's while staying legible at 390px.
 */
export function ComingSoon({ blurb }: ComingSoonProps) {
  return (
    <section className={styles.page}>
      {/*
        The <h1> lives inside ParticleText as real text — the canvas is
        decorative and aria-hidden, so the heading is the element underneath it.
        That keeps the document outline valid whether or not the effect runs,
        and gives crawlers and screen readers a real heading on every one of
        these routes.
      */}
      <div className={styles.stage}>
        <ParticleText text={["COMING", "SOON"]} label="Coming soon" as="h1" />
      </div>

      <p className={styles.body}>{blurb}</p>

      <Link href="/" className={styles.cta}>
        Back to home
      </Link>
    </section>
  );
}
