import Image from "next/image";
import type { ReactNode } from "react";

import type { ProcessLayout, ProcessPage as ProcessPageData } from "../../sanity/types";
import styles from "./Process.module.scss";

/**
 * One sheet of the process stack. Server Component.
 *
 * The six layouts differ only in their grid, so the markup is one shape and
 * `page.layout` picks the class that arranges it. Images are consumed
 * positionally, which the content module's unit suite guards: a layout with the
 * wrong image count renders a hole rather than failing a build.
 *
 * Heading level is h3. The section's own title is the h2 and the page's h1 is
 * the document title, so h3 is what keeps the outline valid. Not configurable.
 *
 * `label` replaces the "Step 01" line; Process passes the section's h2 for
 * the intro, which has no step number.
 */
/** Slot widths, named so the same string cannot drift between two layouts. */
const HALF = "(min-width: 1440px) 720px, 50vw";
const THREE_QUARTERS = "(min-width: 1440px) 1080px, 75vw";
const FULL = "(min-width: 1440px) 1440px, 100vw";

/**
 * The `sizes` of each slot in each layout. A property of the slot, not the
 * picture: the grid decides how wide it is drawn. Without it the browser picks
 * the largest candidate at every viewport.
 */
export const SLOT_SIZES: Readonly<Record<ProcessLayout, readonly string[]>> = {
  intro: [],
  portraitLead: [HALF, HALF],
  wideRight: [THREE_QUARTERS],
  bannerSplit: [FULL, THREE_QUARTERS],
  stacked: [FULL],
  offsetPair: [THREE_QUARTERS, THREE_QUARTERS],
};

export function ProcessPage({
  page,
  label,
  stepLabel,
}: {
  page: ProcessPageData;
  label?: ReactNode;
  /** The word before the step number: "Step". */
  stepLabel: string;
}) {
  return (
    <li
      className={`${styles.sheet} ${styles[page.layout]}`}
      // Every sheet is brown-950: the light cursor dot applies over it.
      data-ground="dark"
    >
      <div className={styles.content}>
        {/* "Step 01", drawn as well as read. A bare number is ambiguous to
            everyone, not only to a screen reader. */}
        {label ??
          (page.step && (
            <p className={styles.step}>
              {stepLabel} {page.step}
            </p>
          ))}
        <h3 className={styles.title}>{page.title}</h3>
        {page.body.map((paragraph) => (
          <p key={paragraph} className={styles.body}>
            {paragraph}
          </p>
        ))}
        <p className={styles.duration}>{page.duration}</p>
      </div>

      {page.images.map((image, index) => (
        <div
          key={image.src}
          // The slot classes are `.slot1`, `.slot2`: which grid area this image
          // lands in is the layout's business, so the index names the slot and
          // the stylesheet places it.
          className={`${styles.frame} ${styles[`slot${index + 1}`]}`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={SLOT_SIZES[page.layout][index]}
            className={styles.image}
            // Never priority. This section sits low on the page and none of
            // these should be allowed to become the LCP element.
            loading="lazy"
          />
        </div>
      ))}
    </li>
  );
}
