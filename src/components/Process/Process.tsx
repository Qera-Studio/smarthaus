import { PROCESS_PAGES } from "../../content/process";
import { ProcessPage } from "./ProcessPage";
import styles from "./Process.module.scss";

/**
 * The "Our Process" stack. Server Component, no client code.
 *
 * Six full-screen sheets, one per page of `PROCESS_PAGES`. Each one pins to
 * the top of the screen when it gets there, and the next rises from the
 * bottom edge and covers it, like a sheet of paper pushed up over the last.
 * The whole effect is `position: sticky` on each sheet inside one list, so it
 * is the browser's own scrolling: no timeline, no listener, no fallback.
 *
 * Replaced the horizontal rail and its portal zoom on 2026-10-04 at
 * Shivanshu's call. The rail is kept at the git tag `archive/process-rail`.
 *
 * The section's h2 is the first sheet's label, where each step's sheet
 * carries "Step 01": one slot, so every sheet reads the same way.
 */
export function Process() {
  return (
    <section
      className={styles.process}
      // A stable hook for tests and the home page's order check. The module
      // class is hashed at build time.
      data-process=""
      aria-labelledby="our-process"
    >
      <ol className={styles.sheets}>
        {PROCESS_PAGES.map((page, index) => (
          <ProcessPage
            key={page.id}
            page={page}
            label={
              index === 0 ? (
                <h2 className={styles.step} id="our-process">
                  Our Process
                </h2>
              ) : undefined
            }
          />
        ))}
      </ol>
    </section>
  );
}
