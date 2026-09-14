/**
 * The hero's static poster.
 *
 * This file used to hold a 45-frame cursor grid — 9 azimuths by 5 elevations,
 * cross-faded on pointer move. That approach is gone: cross-fading between two
 * different viewpoints is a double exposure, and at the ~8px the camera moved
 * per step every vertical edge visibly doubled. VillaCanvas renders the real
 * model instead, which cannot ghost because there is only ever one villa.
 *
 * What survives is the one frame the grid rested on. It is still the right
 * image for the job: rendered in Cycles at the exact angle the canvas rests at,
 * so the hand-off from poster to canvas is invisible. It is the LCP element,
 * the no-JS view, and the fallback for touch, reduced motion, Save-Data, slow
 * connections and any device without WebGL.
 *
 * The other 44 frames were deleted with the cross-fade. scripts/hero-grid.sh
 * regenerates the set from the Blender PNGs if one is ever needed again.
 */

/** The resting frame: camera level, dead centre. Matches REST_ANGLES. */
export const POSTER = "/hero/grid/r4_c4.webp";

/** Intrinsic size of the poster, so the box is reserved before it loads. */
export const POSTER_SIZE = { width: 2112, height: 544 } as const;
