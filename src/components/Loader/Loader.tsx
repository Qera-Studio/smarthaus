import { useId } from "react";
import {
  MARK_BASE,
  MARK_ORIGIN_X,
  MARK_ORIGIN_Y,
  MARK_TOP,
  MARK_TRANSFORM,
  MARK_VIEW_BOX,
  STRANDS,
} from "../Logo/strands";
import styles from "./Loader.module.scss";

/**
 * Animation order, centre outward. Each entry is one step of the sequence, and
 * the strands within a step animate together.
 *
 * Derived from the real tip positions rather than asserted: the centre strand's
 * tip sits at x 75.73, the inner pair straddle it at 67.37 and 82.62, and the
 * outer pair at 59.66 and 89.81. See STRANDS in ../Logo/strands.
 */
const STEPS = [["centre"], ["innerLeft", "innerRight"], ["outerLeft", "outerRight"]] as const;

/** Flat strand id -> step index, so each path can find its own delay slot. */
const STEP_OF = new Map(STEPS.flatMap((ids, step) => ids.map((id) => [id, step] as const)));

type LoaderProps = {
  /**
   * Rendered height of the mark in px. Width follows the mark's own ratio.
   */
  size?: number;
  /**
   * Seconds for ONE full cycle — all five strands drawn on, then all five
   * swallowed. Omit for the production duration set in the stylesheet.
   *
   * This exists so the sequence can be slowed right down while it is being
   * tuned. It is not a production knob: a loader that outlasts the page it is
   * covering is a worse experience than no loader, and on the homepage it would
   * also sit on top of the LCP element.
   */
  cycleSeconds?: number;
  /**
   * Accessible status text, announced once when the loader appears.
   *
   * The animation itself is decorative — the mark conveys nothing a screen
   * reader user needs — but the fact that something is loading does.
   */
  label?: string;
};

/**
 * The dome mark assembling itself, as a loading indicator.
 *
 * ## The sequence
 *
 * One cycle is two phases, and every strand runs both:
 *
 * 1. **Draw on.** Each strand grows from its base up to its tip. The centre
 *    strand goes first, then the inner pair together, then the outer pair
 *    together — so the dome builds outward from the middle.
 * 2. **Swallow.** Each strand travels up into its own tip and vanishes: the
 *    base end chases the tip until there is nothing left. Same centre-outward
 *    order, so the mark empties the way it filled.
 *
 * Then it repeats.
 *
 * ## Why clip rectangles rather than a stroke draw-on
 *
 * The obvious implementation is `stroke-dasharray` + `stroke-dashoffset`, and
 * it cannot work on this artwork. Each strand in the mark is a CLOSED FILLED
 * OUTLINE, not a centreline — the path starts at the tip, runs down one edge to
 * the base, and returns up the other (verified by walking getPointAtLength: the
 * centre strand goes tip 421,158 -> 428,283 -> base 420,306 -> back up
 * 412,283). Dashing that traces the strand's perimeter, so the visible result
 * is an outline snaking down and back up, not a strand growing upward.
 *
 * Drawing five new centreline paths to stroke instead was the alternative, and
 * was rejected: that is new artwork approximating the brand mark, and it would
 * drift the moment the logo changes. Clipping the real fill keeps the loader
 * and the logo on one set of coordinates.
 *
 * Each strand therefore gets its own `<clipPath>` holding one `<rect>`, and the
 * animation moves that rect's edges. Growing the rect upward from the base
 * reveals the strand bottom-to-top; then sliding its top edge down to the tip
 * hides it from the bottom up, which is the "swallow" phase. The trade-off is
 * that the reveal front is a flat horizontal edge rather than one following
 * each strand's curve — at loader size, on a 148-unit-tall strand, that reads
 * as a clean wipe.
 *
 * ## Motion
 *
 * The whole thing is CSS keyframes on SVG geometry attributes, which the motion
 * stack in AGENTS.md allows (CSS transitions and animations, no library). Under
 * `prefers-reduced-motion` the animation is dropped and the finished mark is
 * shown instead — a loading indicator that cannot animate should still say
 * "loading", so the static dome plus the live region does that job.
 */
export function Loader({ size = 64, cycleSeconds, label = "Loading" }: LoaderProps) {
  // clipPath references are resolved against the whole document, so two loaders
  // on one page with hardcoded ids would both clip against whichever pair of
  // rects rendered last. useId is stable across server and client, so this does
  // not trip hydration.
  const clipId = useId();

  return (
    <div
      className={styles.loader}
      // Not aria-busy on this element: the loader does not CONTAIN the thing
      // being loaded, it stands in for it.
      style={
        {
          "--loader-size": `${size}px`,
          ...(cycleSeconds ? { "--loader-cycle": `${cycleSeconds}s` } : {}),
        } as React.CSSProperties
      }
    >
      <svg
        className={styles.mark}
        viewBox={MARK_VIEW_BOX}
        fill="none"
        // Decorative: the status is announced by the live region below, so the
        // artwork itself must not also be in the accessibility tree.
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {STRANDS.map((strand) => (
            <clipPath key={strand.id} id={`${clipId}-${strand.id}`}>
              {/*
                The animated window onto this strand.

                Its geometry is STATIC and covers the whole mark; the animation
                is a `scale`/`translate` transform in the stylesheet, which is
                the only mechanism both engines actually deliver (WebKit
                reports support for animating a rect's own `y`/`height` and
                then does not do it — see the note on .window).

                Width is the whole viewBox rather than the strand's own bbox:
                the clip only ever needs to constrain the VERTICAL extent, and
                a tight horizontal box would clip the strand's curve at its
                widest point.
              */}
              {/*
                Coordinates are in the PATHS' space, not the viewBox's.

                A clipPath with no clipPathUnits resolves in the user space of
                the element that references it, and these clip paths that sit
                inside `<g transform={MARK_TRANSFORM}>` — so a rect written in
                viewBox coordinates (x 0, y -0.21) landed 345 units to the left
                of the strands and clipped everything away. Nothing rendered at
                any point in the cycle, while every diagnostic looked correct:
                fills resolved, clip refs matched, transforms applied.

                MARK_ORIGIN_X/Y undo the group transform so the window covers
                the strands where they actually are.
              */}
              <rect
                className={styles.window}
                x={MARK_ORIGIN_X}
                width={149.5}
                y={MARK_ORIGIN_Y + MARK_TOP}
                height={MARK_BASE - MARK_TOP}
                style={{ "--step": STEP_OF.get(strand.id) ?? 0 } as React.CSSProperties}
              />
            </clipPath>
          ))}
        </defs>

        <g transform={MARK_TRANSFORM}>
          {STRANDS.map((strand) => (
            <path
              key={strand.id}
              d={strand.d}
              fill="currentColor"
              clipPath={`url(#${clipId}-${strand.id})`}
            />
          ))}
        </g>
      </svg>

      {/*
        The only thing announced. `role="status"` is an implicit polite live
        region, so this is read once when the loader mounts without interrupting
        whatever the user is already hearing.
      */}
      <span role="status" className="visually-hidden">
        {label}
      </span>
    </div>
  );
}
