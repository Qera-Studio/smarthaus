import { PROCESS_PAGES } from "../../content/process";
import { ProcessFallback } from "./ProcessFallback";
import { ProcessHandoff } from "./ProcessHandoff";
import { ProcessPage } from "./ProcessPage";
import styles from "./Process.module.scss";

/**
 * The "Our Process" rail. A full-viewport dark stage that grows out of the page
 * and then scrolls sideways.
 *
 * Server Component. The only client code is ProcessFallback, which renders
 * nothing and exists solely for browsers without scroll-driven animations.
 *
 * ## How it moves
 *
 * The section is a TALL SPACER carrying a `view-timeline`. Inside it a sticky
 * child holds still while the track translates horizontally, so the page's own
 * vertical scroll is what drives the sideways motion. That is the whole trick,
 * and it is pure CSS: no scroll listener, no wheel interception, nothing off
 * the documented motion stack. See Process.module.scss for the mechanism.
 *
 * The spacer's height is the travel scaled by `--process-scroll-ratio`, which
 * is the single number that sets the pacing.
 *
 * ## The portal
 *
 * The section opens with a zoom reveal: the pinned stage starts as a small
 * square near the bottom of the viewport and grows to fill it, rising as it
 * grows, and only then does the track start sliding. Both phases run on the
 * SAME timeline, split at `--process-portal-end`. The rise is not animated
 * separately — it falls out of scaling about a low `transform-origin`.
 *
 * Scroll drives only the first half of the zoom. Past that point ProcessHandoff
 * flips an attribute and a transition finishes the grow on its own, and runs it
 * back down if the reader scrolls above the point again.
 *
 * The dark ground belongs to the PORTAL, not to this section, which paints
 * nothing of its own. The brown-950 slab is the thing that grows, so it has to
 * be the element that scales; on the spacer it would be full-bleed and
 * stationary before the zoom began. Process.module.scss has the long version,
 * including why the full-bleed escape sits on the pin above it.
 *
 * ## Accessibility
 *
 * The track is a real `<ol>` of `<li>`s with `<h3>` headings, all present in
 * the accessibility tree at all times, so a screen-reader user reads the six
 * steps linearly and never scrolls sideways at all.
 *
 * The scroll container is focusable with `role="group"` — axe's
 * `scrollable-region-focusable` requires it, and the same treatment is already
 * documented on LegalTable.tsx where it first failed on the Pixel 7 profile.
 *
 * KNOWN AND ACCEPTED: a pinned horizontal rail is two-dimensional scrolling for
 * reading content, which WCAG 1.4.10 Reflow marks `[Floor]` in the
 * Accessibility System. Keyboard operability, a linear accessible-tree order
 * and the reduced-motion escape hatch narrow it; they do not remove it. This is
 * a signed-off design decision, not an oversight.
 */
export function Process() {
  return (
    <section
      className={styles.process}
      // How ProcessFallback finds this element. An attribute rather than the
      // module class, because that class name is hashed at build time and the
      // client island has no way to know it.
      data-process=""
      aria-labelledby="our-process"
      // The page count is the one number the stylesheet cannot know, and the
      // track width and spacer height are both derived from it.
      style={{ "--process-pages": PROCESS_PAGES.length } as React.CSSProperties}
    >
      <div className={styles.pin}>
        {/* The timed second half of the zoom. See ProcessHandoff. */}
        <div className={styles.grow}>
          {/*
          The portal. Everything the pinned stage holds sits inside this box,
          and this box is what scales: the section opens as a small square near
          the bottom of the viewport and grows to fill it before the rail moves
          at all. Purely presentational, so it carries no role and no label.
        */}
          <div
            className={styles.portal}
            // Drives the cursor inversion in globals.scss and the ScrollToTop
            // button's colour flip. Any dark ground opts in this way.
            //
            // ON THE PORTAL, not on the <section>. The section is a 4.6-viewport
            // spacer that now paints nothing: only this box is brown-950. With
            // the attribute up there, the light-dot cursor meant for a dark
            // ground would also apply to the pale page showing around the square
            // for the whole of the zoom, where it is nearly invisible. Here it
            // covers exactly the dark pixels and grows with them.
            data-ground="dark"
          >
            <header className={styles.titleBar}>
              <h2 className={styles.sectionTitle} id="our-process">
                Our Process
              </h2>
              {/*
              Decorative, deliberately. A `role="progressbar"` needs a truthful
              aria-valuenow, and the value here lives in CSS where React cannot
              see it — a progressbar that reports a stale number is worse than a
              bar that reports nothing. The <ol> below already tells assistive
              tech there are six steps.
            */}
              <div className={styles.progress} aria-hidden="true">
                <span className={styles.progressFill} />
              </div>
            </header>

            <div
              className={styles.viewport}
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- required by axe scrollable-region-focusable; same treatment as LegalTable.tsx
              tabIndex={0}
              role="group"
              aria-label="Our process, six panels. Scroll or use the arrow keys."
            >
              <ol className={styles.track}>
                {PROCESS_PAGES.map((page) => (
                  <ProcessPage key={page.id} page={page} />
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <ProcessHandoff />
      <ProcessFallback />
    </section>
  );
}
