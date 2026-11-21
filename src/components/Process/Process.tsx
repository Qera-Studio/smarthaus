import type { ReactNode } from "react";

import { getHomePage } from "../../sanity/content";
import { ProcessPage } from "./ProcessPage";
import { SheetSnap } from "./SheetSnap";
import styles from "./Process.module.scss";

/**
 * The "Our Process" stack. Server Component; its one client island is
 * SheetSnap, which renders nothing.
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
 *
 * `held` is the section before this one (the homepage passes the hardware).
 * It shares a box with the stack so it can hold still at the foot of the
 * screen while the first sheet rises over it, as every later sheet rises over
 * the one before (Shivanshu, 2026-11-14). That first sheet comes up at 80% of
 * its size and, once it covers four fifths of the screen, grows to fill it:
 * SheetSnap marks the moment and the stylesheet does the rest.
 */
export async function Process({ held }: { held?: ReactNode }) {
  const { process } = await getHomePage();
  return (
    <div className={styles.stack} data-process-stack="">
      {held ? (
        <div className={styles.held} data-process-held="">
          {held}
        </div>
      ) : null}
      <ProcessSection process={process} />
      <SheetSnap />
    </div>
  );
}

function ProcessSection({
  process,
}: {
  process: Awaited<ReturnType<typeof getHomePage>>["process"];
}) {
  return (
    <section
      className={styles.process}
      // A stable hook for tests and the home page's order check. The module
      // class is hashed at build time.
      data-process=""
      aria-labelledby="our-process"
    >
      <ol className={styles.sheets}>
        {process.pages.map((page, index) => (
          <ProcessPage
            key={page.id}
            page={page}
            stepLabel={process.stepLabel}
            label={
              index === 0 ? (
                <h2 className={styles.step} id="our-process">
                  {process.heading}
                </h2>
              ) : undefined
            }
          />
        ))}
      </ol>
    </section>
  );
}
