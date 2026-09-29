"use client";

import { useEffect, useRef, useState } from "react";
import {
  CLEAR_RADIUS,
  DRIFT_PULL,
  FRICTION,
  GRAVITY,
  MAX_OFFSET,
  RADIUS,
  SPRING,
  driftOffset,
  falloff,
  orbitShare,
  pushMagnitude,
  smoothSpeed,
  fixedSteps,
} from "./physics";
import { sampleText, type Particle } from "./sampleText";
import styles from "./ParticleText.module.scss";

type ParticleTextProps = {
  /**
   * The glyphs to render as particles. Short — this is sampled per frame cost.
   * Pass a single string for one line, or an array to stack centred lines
   * ("COMING SOON" reads far better as two).
   */
  text: string | readonly string[];
  /**
   * Accessible text. The canvas is decorative; this is what is announced and
   * what a crawler reads.
   */
  label: string;
  /**
   * Element for the visible text. Defaults to a span; pass "h1" where this is
   * the page's heading, so the outline stays valid without a second, hidden
   * heading duplicating it.
   */
  as?: "h1" | "span";
};

// --- Tuning -----------------------------------------------------------------
// The constants and the force model live in ./physics.ts, imported rather than
// duplicated here: two copies of the same tuning value is exactly the drift the
// repo's owned-facts discipline exists to prevent, and keeping them in a pure
// module is what lets the velocity behaviour be unit-tested deterministically
// (reading the canvas back is slower than the spring's recovery, so the
// observable properties cannot be asserted through pixels).

/** Sample spacing in device px. The single biggest cost/density lever.
 *  Lives here rather than in physics.ts because it governs sampling, not
 *  forces.
 *
 *  Tightened from 4 to 3 when the idle drift landed: a continuously wandering
 *  particle spends most of its time slightly off its origin, so the same sample
 *  spacing reads thinner in motion than it did frozen. 3 restores the weight of
 *  the numerals without touching the drift itself. */
const GAP = 3;

/**
 * How far the canvas extends beyond the stage box on every side, in CSS px.
 *
 * MAX_OFFSET is the hard cap on how far a particle may stray from its origin,
 * so a bleed of MAX_OFFSET guarantees there is bitmap to draw into wherever a
 * particle can legally reach, and nothing is ever clipped by the canvas edge.
 * Derived from MAX_OFFSET rather than typed as a literal: the two are the same
 * measurement, and a hardcoded 92 here would silently start clipping again the
 * first time the cage is retuned.
 *
 * A particle's drawn body extends its own radius past its centre, so a little
 * slack is added on top — `r` is a fraction of GAP and is under a pixel at
 * these sizes, but the whole point of this value is to not be exactly on the
 * boundary.
 *
 * The cost is real but small: the canvas grows by 2 * BLEED in each axis, which
 * is more pixels to clear each frame. It is not more PARTICLES — the glyphs are
 * still sized to the stage — so the per-frame force loop, which dominates, is
 * unchanged.
 */
const BLEED = MAX_OFFSET + 4;

/**
 * "404" rendered as a field of particles that orbit the cursor.
 *
 * ## Why canvas, and why this is an exception
 *
 * AGENTS.md fixes the motion stack at CSS transitions + IntersectionObserver +
 * Web Animations API, and CLAUDE.md lists four permitted client components.
 * This is a fifth, and a requestAnimationFrame loop is a new primitive. It is a
 * deliberate, documented exception (see AGENTS.md → Motion stack), justified by:
 *
 *   - the same effect in DOM needs 400+ nodes and animates layout, which is
 *     worse for both CLS and main-thread time than one canvas;
 *   - it is zero-dependency — no GSAP, no three.js, nothing added to the bundle
 *     beyond this file;
 *   - it is confined to /404, a page outside the conversion path, so it cannot
 *     regress the homepage's JS budget or LCP.
 *
 * ## The motion
 *
 * **Pointer velocity is the energy source.** This is the governing idea, and
 * everything else follows from it: a fast sweep warps the field hard, a slow
 * drift barely disturbs it, and a stationary cursor injects no energy at all.
 * An earlier version drove intensity from distance alone, which meant a parked
 * cursor pushed exactly as hard as a moving one — so particles rolled around it
 * forever, with nothing actually driving them.
 *
 * The character aimed for is **explosive but airy** — a slow, wide bloom rather
 * than a fast whip. That comes from four choices working together: a large
 * `RADIUS` with a shaped `falloff` so the disturbance is a broad swell instead
 * of a tight cavity; a mostly *radial* push (`ORBIT_MAX` is low) so particles
 * are thrown outward rather than curled around; high `FRICTION` so they coast;
 * and a weak `SPRING` so they drift home over about a second.
 *
 * Forces on each particle, in order:
 *
 * 1. **Repulsion**, magnitude `speed * SPEED_PUSH`, direction mostly radial with
 *    a little tangential swirl that grows with pointer speed. Zero at rest.
 * 2. **Gravity**, scaled by displacement, so a particle thrown out of the glyph
 *    sags as it returns. The scaling matters: unscaled gravity fights the spring
 *    indefinitely and the "404" droops under a hovering cursor.
 * 3. **Spring** toward a *drifting* home — each particle's origin plus a slow
 *    per-particle wander, which is what keeps the field breathing when nothing
 *    is touching it.
 * 4. **Friction**, so a particle caught mid-flight when the pointer halts
 *    coasts to a stop rather than braking.
 *
 * Then two positional constraints are applied *after* integration, so they hold
 * no matter what the forces did that frame: `MAX_OFFSET` caps how far a particle
 * may stray from home, and `CLEAR_RADIUS` guarantees nothing is ever inside the
 * bubble around the cursor.
 *
 * **When the cursor stops**, speed decays to zero and the repulsion vanishes
 * entirely. Momentum bleeds off through friction, and the field returns to its
 * idle wander — nothing keeps circling, because nothing is driving it.
 *
 * ## Touch
 *
 * A finger drag is the cursor. Pointer events already unify the two, so the
 * force model is shared verbatim — a swipe injects energy exactly as a mouse
 * sweep does, and a fast flick blooms the field harder than a slow drag.
 *
 * Two things differ, and both come from touch having no hover state:
 *
 *   - The field is only driven **while a finger is down**. A lifted finger is
 *     not hovering anywhere, so its last position is parked rather than held;
 *     otherwise the glyphs keep a permanent dent wherever the last tap landed.
 *   - Nothing is ever `preventDefault`ed. The glyphs cover most of a phone
 *     viewport, so swallowing the gesture would trap the user on the page. The
 *     bloom happens *along with* the scroll, not instead of it.
 *
 * ## Reduced motion
 *
 * The `_reset.scss` reduced-motion block zeroes CSS animation and transition
 * durations. **It has no effect on a canvas rAF loop.** So the preference is
 * checked here in JS: when set, no loop starts and the static fallback renders
 * instead. Missing this is how a canvas effect ignores the one motion
 * preference that is a hard floor.
 */
export function ParticleText({ text, label, as: Tag = "span" }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Drives which of the two renderings is shown. Starts static so the server
  // HTML and the first client paint agree — flipping to canvas only once we
  // know motion is allowed avoids a hydration mismatch.
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Reduced motion is the only gate left.
    //
    // This used to also require `(hover: hover) and (pointer: fine)`, on the
    // reasoning that a coarse pointer has no hovering cursor to orbit. That is
    // true of *hover*, but a touch drag reports the same pointermove stream a
    // mouse does — so the field is drivable on a phone, just only while a
    // finger is down. The loop now idles (see `active` below) whenever no
    // pointer is engaged, which is the battery concern the old gate was really
    // protecting against: a backgrounded or untouched canvas costs nothing
    // because there is no rAF running at all.
    const sync = () => setAnimated(!motionQuery.matches);
    sync();
    motionQuery.addEventListener("change", sync);
    return () => motionQuery.removeEventListener("change", sync);
  }, []);

  // One string or many, normalised once. Joined for the dep array so the effect
  // re-runs when the content genuinely changes rather than on every render (a
  // fresh array literal from the caller is a new reference each time).
  // `Array.isArray` does not narrow a `readonly string[]`, so switch on the
  // type of the value itself.
  const lineKey = typeof text === "string" ? text : text.join("\u0000");

  useEffect(() => {
    if (!animated) return;
    const lines: readonly string[] = lineKey.split("\u0000");
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let frame = 0;
    let dpr = 1;
    // Pointer position in CSS px, relative to the canvas. Off-field until the
    // pointer actually enters, so nothing moves on load.
    const pointer = { x: -9999, y: -9999 };
    // Previous frame's pointer position, for the per-frame delta.
    let prevX = -9999;
    let prevY = -9999;
    // Smoothed pointer speed in CSS px/frame — the energy source for the whole
    // effect. Smoothed rather than raw because pointermove fires irregularly
    // (coalesced, and not once per frame), so the raw delta is spiky enough to
    // make the warp stutter. Decays to 0 on its own when the pointer stops,
    // which is exactly the behaviour wanted: no movement, no energy.
    let speed = 0;
    // Frame counter driving the idle drift. Frames rather than wall-clock ms so
    // the wander advances with the animation rather than jumping after a tab is
    // backgrounded and rAF resumes.
    let time = 0;
    let paintColor = "#14110e";

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Cap DPR at 2: beyond that the particle count grows quadratically for
      // no perceptible gain on the sizes drawn here.
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      // The canvas is larger than the stage and hangs outside it, so there is
      // always bitmap wherever a particle can travel.
      //
      // Without it, a particle thrown past the stage edge was clipped by the
      // bitmap boundary, and the straight cut made the canvas rectangle plainly
      // visible — worst on a phone, where one fast flick throws the whole field
      // at once. Widening MAX_OFFSET's cage was not an option (that is the
      // look), and neither was shrinking the type, so the drawing surface grows
      // instead of the motion shrinking.
      //
      // Everything below is split between two boxes, and the distinction is the
      // whole trick:
      //   - the CANVAS box is what gets drawn into, and
      //   - the STAGE box (rect) is what the glyphs are sized to fit.
      // Sampling against the canvas box instead would simply grow the type to
      // fill the bleed, putting the glyph edges right back on the boundary.
      //
      // The two axes get different bleeds, and they have to:
      //
      // BLOCK axis — the full BLEED. Vertical overflow costs nothing here: the
      // document already scrolls that way, the stage has copy above and below
      // it rather than a viewport edge, and an absolutely-positioned box does
      // not push the page taller.
      //
      // INLINE axis — capped at the stage's own side gutter. A full bleed made
      // the canvas wider than the viewport (measured: clientWidth 390 against
      // scrollWidth 438) and the PAGE became horizontally scrollable, which
      // the project forbids outright and the coming-soon spec asserts against.
      // `overflow: clip` + `overflow-clip-margin` on the stage is the textbook
      // answer and is unusable — WebKit ships the first without the second, so
      // iOS would clip flush at the stage edge and show the rectangle even more
      // plainly. Fitting the bleed into the gutter needs no clipping at all.
      //
      // The gutter is usually generous enough (48px each side at 390px wide,
      // and the glyphs only occupy 88% of the stage, so ink rarely reaches
      // even that far), and where it is not, the horizontal reach is what it
      // always was — no worse than before, and the block axis still gains.
      const gutter = Math.max(0, (document.documentElement.clientWidth - rect.width) / 2);
      const inlineBleed = Math.min(BLEED, Math.floor(gutter));

      const cssWidth = rect.width + inlineBleed * 2;
      const cssHeight = rect.height + BLEED * 2;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.inlineSize = `${cssWidth}px`;
      canvas.style.blockSize = `${cssHeight}px`;
      // The stylesheet cannot know the clamped inline value, so the inset it
      // uses is published from here. The block inset is the constant BLEED.
      canvas.style.setProperty("--particle-canvas-bleed-inline", `${inlineBleed}px`);

      // Read the paint colour from the element's own computed style, so the
      // particles follow the design tokens instead of hardcoding a hex that
      // would drift from the palette.
      paintColor = getComputedStyle(wrap).getPropertyValue("color").trim() || paintColor;

      // Fit the glyphs to the box, and let the real font do the shaping —
      // Manrope is already loaded for the page.
      //
      // The size is MEASURED rather than guessed from a character count. An
      // earlier version multiplied the width by a fixed 0.42, which was tuned
      // for the three glyphs of "404" and made any longer string overflow the
      // canvas. Here a trial size is measured with the actual font and scaled by
      // the ratio it needs, so "404" and a stacked "COMING / SOON" both land
      // inside the same box.
      // Both budgets come from `rect` — the STAGE box — not from the enlarged
      // canvas, so the bleed is pure headroom for the motion and changes the
      // rendered type size not at all.
      const lineCount = lines.length;
      // Vertical budget per line, leaving a little breathing room.
      const byHeight = ((rect.height * 0.92) / lineCount) * dpr;

      const probe = 100;
      ctx.font = `800 ${probe}px Manrope, system-ui, sans-serif`;
      const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
      // How big the font can be before the longest line hits the width budget.
      const byWidth = widest > 0 ? (rect.width * 0.88 * dpr * probe) / widest : byHeight;

      const size = Math.min(byHeight, byWidth);
      particles = sampleText({
        lines,
        // The full canvas, because sampleText centres the block in the box it
        // is given — and the bleed is symmetric, so centring in the canvas puts
        // the lockup exactly where centring in the stage did. The SIZE above is
        // what keeps it fitting the stage.
        width: canvas.width,
        height: canvas.height,
        gap: Math.max(3, Math.round(GAP * dpr)),
        font: `800 ${size}px Manrope, system-ui, sans-serif`,
        // Tight leading: these are display lockups, not prose, and a loose
        // stack reads as two unrelated words rather than one mark.
        lineHeight: size * 0.92,
      });
    };

    // One simulation step: 1/60 s of physics, whatever the display's refresh
    // rate. `raw` is the pointer's travel during this step, or null while the
    // pointer is parked (nothing to measure, so speed is left alone).
    const step = (raw: number | null) => {
      time += 1;

      // --- Pointer speed, once per step ------------------------------------
      // Measured here rather than in the event handler so it decays on its own
      // when pointermove stops firing. That decay IS the "cursor stopped"
      // signal — no timers, no stale-event bookkeeping.
      if (raw !== null) {
        // Asymmetric smoothing: rise fast so a flick registers on the frame it
        // happens, fall slower so the warp eases out instead of snapping off.
        speed = smoothSpeed(speed, raw);
      }

      // Only motion earns the orbit: orbitShare is 0 at rest, so the push is
      // purely radial and nothing circles a parked cursor.
      const orbit = orbitShare(speed);
      const pushMag = pushMagnitude(speed) * dpr;

      const px = pointer.x * dpr;
      const py = pointer.y * dpr;
      const radius = RADIUS * dpr;
      const clear = CLEAR_RADIUS * dpr;
      const maxOff = MAX_OFFSET * dpr;

      for (const p of particles) {
        const dx = p.x - px;
        const dy = p.y - py;
        const dist = Math.hypot(dx, dy) || 0.0001;

        if (dist < radius) {
          // 0 at the rim, 1 at the pointer. The shared falloff keeps the wide
          // outer reach while concentrating strength nearer the cursor, so a
          // large RADIUS reads as a soft bloom rather than a bigger hole.
          const strength = falloff(dist / dpr);

          // Unit vector from pointer to particle: the radial direction.
          const rx = dx / dist;
          const ry = dy / dist;
          // Its perpendicular: the tangential direction, which carries
          // particles *around* the cursor rather than away from it. Weighted by
          // `orbit`, so it only exists while the pointer is actually moving.
          const tx = -ry;
          const ty = rx;

          const force = strength * pushMag * 0.06;
          p.vx += (rx * (1 - orbit) + tx * orbit) * force;
          p.vy += (ry * (1 - orbit) + ty * orbit) * force;
        }

        const offX0 = p.x - p.ox;
        const offY0 = p.y - p.oy;
        const off0 = Math.hypot(offX0, offY0);

        // Gravity, scaled by how far the particle is from home. A fully
        // displaced particle falls; one at rest feels nothing. Unscaled gravity
        // would fight the spring forever and leave the glyph permanently sagged
        // under a hovering cursor.
        p.vy += GRAVITY * Math.min(off0 / maxOff, 1) * dpr;

        // The particle's home is a slowly wandering target rather than a fixed
        // point, so the field breathes when untouched instead of freezing. Each
        // particle has its own phase — a shared one would make the whole "404"
        // pulse in unison, which reads as a wobble rather than as air.
        const drift = driftOffset(p.phase, time);
        const homeX = p.ox + drift.dx * dpr;
        const homeY = p.oy + drift.dy * dpr;

        // Spring toward that drifting home. Always applied, so a particle left
        // mid-arc when the pointer stops eases back rather than stopping where
        // it was. DRIFT_PULL is added on top so an at-rest particle still
        // tracks its wander even though SPRING alone is very weak.
        p.vx += (homeX - p.x) * (SPRING + DRIFT_PULL);
        p.vy += (homeY - p.y) * (SPRING + DRIFT_PULL);

        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // --- Positional constraints, applied after integration --------------
        // Both are hard guarantees rather than forces, so they hold no matter
        // what the forces did this frame — including on a fast flick that would
        // otherwise tunnel a particle straight through the cursor.

        // 1. Never stray further than MAX_OFFSET from home.
        const offX = p.x - p.ox;
        const offY = p.y - p.oy;
        const off = Math.hypot(offX, offY);
        if (off > maxOff) {
          const nx = offX / off;
          const ny = offY / off;
          p.x = p.ox + nx * maxOff;
          p.y = p.oy + ny * maxOff;
          // Remove the outward component so it does not fight the clamp every
          // frame and buzz at the boundary.
          const outward = p.vx * nx + p.vy * ny;
          if (outward > 0) {
            p.vx -= nx * outward;
            p.vy -= ny * outward;
          }
        }

        // There is deliberately no snap-to-rest here any more.
        //
        // An earlier REST_EPSILON clamp teleported any slow particle exactly
        // onto its origin and zeroed its velocity. It measured perfectly — zero
        // drift across four samples half a second apart — and looked dead,
        // because that is what it was: a field of particles pinned to a grid.
        // The idle drift above replaces it, so the "404" is always breathing.

        // 3. Never inside the exclusion zone. Pushed out along the radius, and
        // the inward velocity component is removed so it does not immediately
        // re-enter — the particle slides along the boundary instead of
        // vibrating against it. Last of the three constraints, so nothing above
        // can leave a particle inside the bubble.
        const cdx = p.x - px;
        const cdy = p.y - py;
        const cd = Math.hypot(cdx, cdy);
        // The particle's drawn body must clear the bubble, not just its centre.
        // Clamping the centre to `clear` paints a disc of radius p.r inward from
        // there, so ink reached to clear - p.r — measured 2.4px inside a 4px
        // bubble. Adding the radius makes the bubble empty of ink, which is what
        // "no particle can enter" has to mean visually.
        const bodyClear = clear + p.r * dpr;
        if (cd < bodyClear) {
          // cd can be 0 if a particle lands exactly on the cursor; fall back to
          // a fixed direction rather than dividing by zero.
          const nx = cd > 0.0001 ? cdx / cd : 1;
          const ny = cd > 0.0001 ? cdy / cd : 0;
          p.x = px + nx * bodyClear;
          p.y = py + ny * bodyClear;
          const inward = p.vx * nx + p.vy * ny;
          if (inward < 0) {
            p.vx -= nx * inward;
            p.vy -= ny * inward;
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = paintColor;
      for (const p of particles) {
        // One path for the whole field would be cheaper, but per-particle arcs
        // are what allow the jittered radii that stop this reading as halftone.
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // The physics advances on its own 60 Hz clock, not once per frame. Every
    // constant in physics.ts was tuned at 60 frames a second, and stepping once
    // per frame made the effect a function of the display: twice as strong on
    // a 120 Hz phone, and barely moving on a slow one (the CI runner's drag
    // moved the field 15px where 66px was designed). fixedSteps turns elapsed
    // time into whole steps and carries the remainder to the next frame.
    let last = -1;
    let carry = 0;
    const tick = (now: number) => {
      const due = fixedSteps(last < 0 ? 0 : now - last, carry);
      last = now;
      carry = due.carry;
      // A frame that owes no step (common at 120 Hz) leaves prevX alone, so
      // the pointer's travel is measured across the frames until the next one.
      if (due.steps > 0) {
        const raw =
          prevX > -9000 ? Math.hypot(pointer.x - prevX, pointer.y - prevY) / due.steps : null;
        prevX = pointer.x;
        prevY = pointer.y;
        for (let i = 0; i < due.steps; i += 1) step(raw);
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    // Park the pointer far away so the field settles home instead of freezing
    // around a stale position. prevX is reset too, so the jump to -9999 is not
    // measured as an enormous pointer velocity on the next frame — that would
    // fling the entire field on every mouse-out or finger-up.
    const park = () => {
      pointer.x = -9999;
      pointer.y = -9999;
      prevX = -9999;
      prevY = -9999;
      speed = 0;
    };

    // A mouse drives the field whenever it moves. A finger only drives it while
    // it is down: there is no hover, so a touch's last position is not "where
    // the user is pointing" once they lift, and treating it that way leaves a
    // permanent dent in the glyphs wherever the last tap landed.
    //
    // `event.pointerType` rather than a media query, because a hybrid device
    // (an iPad with a trackpad, a touchscreen laptop) has both, and the right
    // behaviour is per-event, not per-device.
    let dragging = false;
    const isTouch = (event: PointerEvent) => event.pointerType !== "mouse";

    const onPointerMove = (event: PointerEvent) => {
      if (isTouch(event) && !dragging) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isTouch(event)) return;
      dragging = true;
      // Seed the position on touchdown so the first frame of a drag pushes from
      // where the finger actually landed. prevX stays parked for one frame, so
      // the initial jump is not read as velocity — the touch begins at rest and
      // builds speed as it moves, which is the same contract the mouse has.
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isTouch(event)) return;
      dragging = false;
      // The field keeps whatever momentum the drag gave it and coasts home
      // through friction, rather than stopping dead under the lifted finger.
      park();
    };

    build();
    frame = requestAnimationFrame(tick);

    // Re-sample on resize: the glyph size is derived from the box, so the
    // particle origins are only valid for the size they were built at.
    const observer = new ResizeObserver(build);
    observer.observe(wrap);
    // Listening on window rather than the canvas: the canvas is
    // pointer-events:none so it never steals the cursor from links beneath it,
    // which means it also never receives its own pointer events.
    //
    // All passive. The canvas never calls preventDefault — a drag across the
    // "404" must still scroll the page, because on a phone the glyphs cover
    // most of the viewport and swallowing the gesture would trap the user on
    // the page. The effect is something that happens *along with* the scroll,
    // not instead of it.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    // A touch interrupted by the browser (scroll takeover, gesture, a call
    // arriving) fires cancel and never up, so without this the field would stay
    // stuck to the abandoned finger position.
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("pointerleave", park);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerleave", park);
    };
  }, [animated, lineKey]);

  // Sentence case for display: the canvas is sampled from upper-case glyphs
  // because they read as a lockup, but the fallback is real page text and
  // shouting it is off-brand.
  const fallbackLines = lineKey
    .split("\u0000")
    .map((line) => (line.length > 1 ? line[0] + line.slice(1).toLowerCase() : line));
  const fallbackCh = Math.max(...fallbackLines.map((line) => line.length));

  return (
    <div
      ref={wrapRef}
      className={styles.stage}
      // --particle-fallback-* drive the static fallback's type scale. Set from
      // the longest line so a three-glyph "404" and a stacked "COMING / SOON"
      // are each sized to fit rather than sharing one ramp tuned for the
      // shorter of the two.
      //
      // --particle-canvas-bleed is how far the canvas hangs outside this box.
      // Published from BLEED so the stylesheet's negative insets and the
      // canvas dimensions set in `build` cannot disagree — they are the same
      // measurement, and this file owns it.
      style={
        {
          "--particle-fallback-ch": fallbackCh,
          "--particle-fallback-lines": fallbackLines.length,
          "--particle-canvas-bleed": `${BLEED}px`,
        } as React.CSSProperties
      }
    >
      {/*
        The accessible text, and the entire experience for reduced-motion, touch
        and no-JS visitors. Always in the DOM — never replaced — so the page
        always has real text for screen readers and crawlers, and the canvas is
        purely an enhancement layered over it.
      */}
      <Tag className={styles.fallback} data-hidden={animated || undefined}>
        {/*
          Rendered line by line so the fallback breaks where the canvas does.
          `label` stays the accessible name on the element, so a screen reader
          announces "Coming soon" as one phrase rather than two fragments.
        */}
        {fallbackLines.length > 1 ? (
          <span aria-hidden="true">
            {fallbackLines.map((line, index) => (
              <span key={line + index} className={styles.fallbackLine}>
                {line}
              </span>
            ))}
          </span>
        ) : (
          label
        )}
        {fallbackLines.length > 1 ? <span className="visually-hidden">{label}</span> : null}
      </Tag>

      {/*
        aria-hidden alone is enough: the canvas carries no information the
        heading above does not already state, and adding role="presentation" on
        top of aria-hidden only conflicts with it.
      */}
      {animated ? <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" /> : null}
    </div>
  );
}
