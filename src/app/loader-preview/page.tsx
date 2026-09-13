import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Loader } from "../../components/Loader";
import styles from "./page.module.scss";

/**
 * A harness for watching the loader animation while it is being tuned.
 *
 * ## Why this route exists at all
 *
 * The loader's production cycle is 2s, which is too quick to judge the
 * sequencing by eye — whether the inner pair really starts after the centre,
 * whether the swallow reads as travelling into the tip. This renders it at
 * several speeds and sizes at once so the timing can be checked without
 * shipping a slow loader to real users.
 *
 * ## Why it 404s in production
 *
 * A preview harness is not a page: it has no place in the site's information
 * architecture, would dilute crawl budget, and a stray link to it would look
 * like a broken deploy. `notFound()` in production means the route is
 * unreachable there even though the file ships — which is cheaper and harder to
 * get wrong than excluding it from the build, and means `next build` still
 * typechecks it.
 *
 * noindex is set as well rather than relying on the 404 alone: preview
 * deployments run with NODE_ENV=production, so on a Vercel preview this returns
 * 404 and the robots directive is what covers the development case.
 */

export const metadata: Metadata = {
  title: "Loader preview",
  robots: { index: false, follow: false },
};

/**
 * Cycle durations to show side by side, in seconds.
 *
 * The slow two are diagnostic — at 2s each of the six chained events lasts only
 * ~370ms, which is too quick to judge the sequencing by eye. The last entry
 * passes no duration at all, so it renders at whatever the stylesheet's
 * --loader-cycle is; that way this page cannot drift from production by
 * restating the number.
 */
const SPEEDS = [
  { label: "10s — slow enough to inspect each step", seconds: 10 },
  { label: "4s — sequencing still readable", seconds: 4 },
  { label: "Production default (2s)", seconds: undefined },
] as const;

export default function LoaderPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Loader preview</h1>
      <p className={styles.blurb}>
        The dome mark drawing itself on, then being swallowed into its own tips. Centre strand
        first, then the inner pair together, then the outer pair. Development only — this route
        returns 404 in production.
      </p>

      <section className={styles.row}>
        {SPEEDS.map(({ label, seconds }) => (
          <figure key={label} className={styles.cell}>
            <div className={styles.stage}>
              <Loader size={140} {...(seconds ? { cycleSeconds: seconds } : {})} />
            </div>
            <figcaption className={styles.caption}>{label}</figcaption>
          </figure>
        ))}
      </section>

      {/*
        Size sweep, deliberately slowed to 4s rather than run at the production
        pace: the question here is whether the strands stay legible as the mark
        shrinks, and a small loader at 2s is too quick to see whether the
        thinnest outer strands read at all.
      */}
      <section className={styles.row}>
        {[32, 48, 64, 96].map((size) => (
          <figure key={size} className={styles.cell}>
            <div className={styles.stage}>
              <Loader size={size} cycleSeconds={4} />
            </div>
            <figcaption className={styles.caption}>{size}px at 4s</figcaption>
          </figure>
        ))}
      </section>

      <section className={styles.row}>
        <figure className={styles.cell}>
          <div className={`${styles.stage} ${styles.inverse}`}>
            <Loader size={140} cycleSeconds={10} />
          </div>
          <figcaption className={styles.caption}>On ink, 10s — checks currentColor</figcaption>
        </figure>
      </section>
    </main>
  );
}
