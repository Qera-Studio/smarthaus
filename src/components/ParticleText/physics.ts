/**
 * The force model for the particle field, as pure functions.
 *
 * Extracted from the rAF loop so the behaviour can be asserted directly. The
 * observable properties — a fast cursor warps harder than a slow one, a
 * stationary cursor does not orbit — are cheap and deterministic to test here,
 * and effectively untestable through the canvas: reading pixels back takes
 * longer than the spring's recovery, so by the time a headless browser has the
 * bitmap the field is already home.
 */

/** Repulsion reach, in CSS px.
 *
 *  Wide on purpose. The disturbance should read as a broad swell of the field
 *  rather than a tight cavity with a hard edge — the cursor influences a large
 *  surface around it, not only the particles immediately adjacent. Paired with
 *  FALLOFF_POWER below, which softens the near-field so the reach is felt as
 *  gradual rather than as a bigger hole. */
export const RADIUS = 190;

/** Shapes the proximity falloff. 1 is the raw eased curve; above 1 pulls
 *  strength away from the rim and concentrates it nearer the cursor *while
 *  keeping the outer reach*, which is what makes a large RADIUS feel like a
 *  soft, wide bloom instead of one enormous void. */
export const FALLOFF_POWER = 1.7;

/** Radius of the visible cursor dot, in CSS px.
 *
 *  The dot is drawn in globals.scss as an SVG `<circle r="8">` in a 40×40 box
 *  with the hotspot at its centre — so the pointer's ink extends 8px in every
 *  direction from the coordinate the pointer events report. **Keep in step with
 *  that SVG**: if the dot is resized, this must change with it, or particles
 *  start overlapping the cursor again. */
const CURSOR_RADIUS = 8;

/** Clear space between the edge of the cursor dot and the nearest particle,
 *  in CSS px. */
const CURSOR_MARGIN = 4;

/** The bubble: a circular exclusion zone around the cursor centre, in CSS px.
 *  No particle may be inside it, and particles pack right up against its edge.
 *
 *  Sized from the CURSOR DOT, not from an arbitrary number. This is the fix for
 *  particles appearing to cover a stopped cursor: an earlier 4px bubble was
 *  *smaller than the dot's own 8px radius*, so particles legitimately sat 4px
 *  inside the visible cursor graphic and buried it. Measuring the gap confirmed
 *  the clamp was working perfectly — 4.01px, frame after frame — while the
 *  cursor was still covered, because the constraint was simply too small to
 *  reach the dot's edge.
 *
 *  Enforced positionally after integration rather than as a force, so it holds
 *  however fast the pointer arrives — a force can be outrun, a position clamp
 *  cannot.
 *
 *  This, and not the repulsion field, is what defines the clearance at rest:
 *  with STATIC_PUSH at 0 the field applies no force to a still cursor, so the
 *  particles a stationary cursor displaces come to rest against this boundary
 *  and nowhere further. */
export const CLEAR_RADIUS = CURSOR_RADIUS + CURSOR_MARGIN;

/** Shove applied while the cursor merely sits inside the field.
 *
 *  Zero on purpose. A stationary cursor is an obstacle, not a motor: it should
 *  displace only what it physically overlaps, which is the bubble's job, and
 *  push nothing at all beyond that. Any non-zero value here reintroduces a
 *  wide, soft cavity whose size is set by the force falloff rather than by
 *  CLEAR_RADIUS — which is the thing this is not supposed to do. */
export const STATIC_PUSH = 0;

/** Extra push per unit of pointer speed — the real energy source. */
export const SPEED_PUSH = 2.6;

/** Pointer speed, in CSS px/frame, at which the warp saturates. Lower than
 *  before, so an ordinary sweep reaches full bloom rather than needing a flick:
 *  the effect should feel generous, not like something to be earned. */
export const SPEED_MAX = 22;

/** Tangential share of the push at full speed.
 *
 *  Reduced from 0.85. A high tangential share reads as a whip curling around
 *  the cursor; the brief is *explosive*, which is mostly radial — particles
 *  thrown outward in a bloom, with just enough swirl to keep it from looking
 *  like a mechanical ring. */
export const ORBIT_MAX = 0.42;

/** Cap on how far a particle may stray from its origin, in CSS px. Raised so
 *  the bloom actually spreads: this, not the force, is what limits how far the
 *  explosion can carry. */
export const MAX_OFFSET = 92;

/** Pull back toward the resting position.
 *
 *  Weak, deliberately. A stiff spring snaps particles home and reads as elastic
 *  rather than airy; this lets them drift back over roughly a second. */
export const SPRING = 0.022;

/** Velocity retained per frame.
 *
 *  High — this is the single most important value for the "floaty" feel.
 *  Particles coast a long way on the energy they were given instead of being
 *  damped out of the air, so the bloom expands slowly and settles gently. */
export const FRICTION = 0.955;

/** Downward acceleration on displaced particles, in CSS px/frame². Scaled by
 *  displacement at the call site, so it vanishes at rest. Light: this is dust
 *  in air, not falling sand. */
export const GRAVITY = 0.055;

/** Pointer speeds below this count as stopped, guarding against sub-pixel
 *  jitter keeping the field alive. */
export const SPEED_DEADZONE = 0.35;

// --- Idle drift --------------------------------------------------------------
// The field is never completely static. Each particle wanders continuously
// around its origin on a slow sine, which keeps the "404" alive when untouched
// and is why there is no longer a snap-to-rest: an earlier REST_EPSILON clamp
// froze every particle exactly on its origin, which measured beautifully (zero
// drift across four samples) and looked dead.

/** Peak wander from origin, in CSS px. Small — legibility of the glyphs comes
 *  first; this is a breath, not a shuffle. */
export const DRIFT_AMPLITUDE = 1.5;

/** Radians per frame of the drift oscillation. ~0.011 gives a full cycle a bit
 *  under ten seconds, so no visible pulse or rhythm across the field. */
export const DRIFT_SPEED = 0.011;

/** How strongly a particle is drawn to its drifting target rather than to its
 *  fixed origin. Low, so the drift is a suggestion the spring follows loosely
 *  instead of a path it tracks exactly. */
export const DRIFT_PULL = 0.014;

/** easeInOutSine — fast at the edges of the detour, slow through its widest
 *  part, which is the "fast, slow at the apex, fast again" shape. */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Proximity falloff: how much of the push a particle receives, from 0 at the
 * rim of RADIUS to 1 at the cursor.
 *
 * The eased curve raised to FALLOFF_POWER. Raising the power keeps the wide
 * outer reach — distant particles still feel *something*, which is what makes
 * the disturbance a broad swell rather than a hole — while pulling the bulk of
 * the strength inward, so a large RADIUS does not simply scale up the cavity.
 */
export function falloff(dist: number): number {
  if (dist >= RADIUS) return 0;
  return easeInOutSine(1 - dist / RADIUS) ** FALLOFF_POWER;
}

/**
 * A particle's drifting target, offset from its origin.
 *
 * Two sines at different rates per axis, seeded by `phase` so every particle
 * has its own path — a shared phase would make the whole field pulse in unison,
 * which reads as a wobble rather than as air. Returns an offset, so callers add
 * it to the origin.
 */
export function driftOffset(phase: number, t: number): { dx: number; dy: number } {
  return {
    dx: Math.sin(t * DRIFT_SPEED + phase) * DRIFT_AMPLITUDE,
    // 0.73 detunes the vertical rate against the horizontal, so the path is an
    // open Lissajous wander rather than a closed diagonal line.
    dy: Math.cos(t * DRIFT_SPEED * 0.73 + phase * 1.31) * DRIFT_AMPLITUDE,
  };
}

/**
 * Smooth a raw per-frame pointer delta into the speed used by the force model.
 *
 * Asymmetric on purpose: rises fast so a flick registers on the frame it
 * happens, falls slower so the warp eases out instead of snapping off. Values
 * under the deadzone return exactly 0, which is what makes "the cursor stopped"
 * a real state rather than an asymptote.
 */
export function smoothSpeed(previous: number, raw: number): number {
  const next = previous + (raw - previous) * (raw > previous ? 0.55 : 0.12);
  return next < SPEED_DEADZONE ? 0 : next;
}

/** Magnitude of the repulsion at a given pointer speed, before falloff. */
export function pushMagnitude(speed: number): number {
  return STATIC_PUSH + SPEED_PUSH * speed;
}

/**
 * Tangential share of the push at a given pointer speed: 0 when still, rising
 * to ORBIT_MAX at SPEED_MAX. This is the term that stops particles rolling
 * around a parked cursor — at rest the push is purely radial.
 */
export function orbitShare(speed: number): number {
  return ORBIT_MAX * Math.min(speed / SPEED_MAX, 1);
}

/**
 * The repulsion force on one particle.
 *
 * @param dist  distance from pointer to particle
 * @param rx,ry unit vector pointing from pointer to particle
 * @param speed smoothed pointer speed
 * @returns the force to add to the particle's velocity this frame
 */
export function repulsion(
  dist: number,
  rx: number,
  ry: number,
  speed: number,
): { fx: number; fy: number } {
  if (dist >= RADIUS) return { fx: 0, fy: 0 };

  const orbit = orbitShare(speed);
  const force = falloff(dist) * pushMagnitude(speed) * 0.06;

  // Perpendicular to the radial direction: carries particles around the cursor.
  const tx = -ry;
  const ty = rx;

  return {
    fx: (rx * (1 - orbit) + tx * orbit) * force,
    fy: (ry * (1 - orbit) + ty * orbit) * force,
  };
}
