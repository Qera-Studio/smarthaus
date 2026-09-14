/**
 * Cursor-to-camera mapping for the hero villa.
 *
 * Separate from villa.ts, which imports three.js: three is ESM-only and Jest
 * cannot load it without a transform, so the maths that actually wants testing
 * lives here where it has no dependencies at all.
 *
 * The arc matches the 45-frame grid this replaced (hero_grid/manifest.json):
 * azimuth -4deg to +4deg, elevation 0 to +5deg. One-sided vertically, so the
 * camera never looks up at the villa from below ground.
 */

export const DEG = Math.PI / 180;

/** Camera arc, in degrees. */
export const AZIMUTH = 4;
export const ELEVATION_MIN = 0;
export const ELEVATION_MAX = 5;

export type Angles = { azimuth: number; elevation: number };

/**
 * Cursor position (0..1 across the viewport, y = 0 at the top) to camera
 * angles in degrees. Clamped: a pointer event can report a pixel past the edge.
 *
 * x = 0.5, y = 1 is the resting view — dead centre, camera level — which is
 * what a touch device, a reduced-motion visitor and a cursor-less page show,
 * and the angle the static poster was rendered at.
 */
export function anglesFor(x: number, y: number): Angles {
  const u = (v: number) => Math.min(1, Math.max(0, v));
  return {
    azimuth: (u(x) - 0.5) * 2 * AZIMUTH,
    // y = 1 (bottom) is the resting, un-lifted camera; y = 0 lifts it fully.
    elevation: ELEVATION_MIN + (1 - u(y)) * (ELEVATION_MAX - ELEVATION_MIN),
  };
}

/** Rest state. Matches REST in frames.ts, which is the poster's angle. */
export const REST_ANGLES: Angles = anglesFor(0.5, 1);
