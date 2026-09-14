import Image from "next/image";

import type { ProcessPage as ProcessPageData } from "../../content/process";
import styles from "./Process.module.scss";

/**
 * One page of the process rail. Server Component.
 *
 * The six layouts differ only in their grid, so the markup is one shape and
 * `page.layout` picks the class that arranges it. Images are consumed
 * positionally, which the content module's unit suite guards: a layout with the
 * wrong image count renders a hole rather than failing a build.
 *
 * Heading level is h3. The section's own title is the h2 and the page's h1 is
 * the document title, so h3 is what keeps the outline valid. Not configurable.
 */
export function ProcessPage({ page }: { page: ProcessPageData }) {
  return (
    <li className={`${styles.page} ${styles[page.layout]}`}>
      <div className={styles.content}>
        {/* "Step 01", drawn as well as read. A bare number is ambiguous to
            everyone, not only to a screen reader. */}
        {page.step && <p className={styles.step}>Step {page.step}</p>}
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
            src={`/hero/process/${image.src}`}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={image.sizes}
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
