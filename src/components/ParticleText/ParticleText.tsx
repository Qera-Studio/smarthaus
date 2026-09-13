"use client";

import { useEffect, useRef, useState } from "react";
import { sampleText, type Particle } from "./sampleText";
import styles from "./ParticleText.module.scss";

type ParticleTextProps = {
  /** The glyphs to render as particles. Short — this is sampled per frame cost. */
  text: string;
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
// Grouped so the feel can be adjusted without reading the loop.

/** Repulsion reach, in CSS px. Related to the 16px cursor dot: the field is a
 *  little wider than the dot so the dot appears to push, not to tow. */
const RADIUS = 96;
/** How hard particles are pushed off their origin, at the field's centre.
 *  Strong on purpose — the void has to be unmistakable. Runaway is prevented by
 *  MAX_OFFSET below rather than by weakening this, because a weak push reads as
 *  the effect not working at all. */
const PUSH = 62;
/** Share of the push that goes tangentially (around the dot) rather than
 *  radially (away from it). 1 = pure orbit, 0 = pure shove. High, because the
 *  brief is "warp around", not "scatter". */
const ORBIT = 0.88;
/** Hard ceiling on how far a particle may stray from its origin, in CSS px.
 *  This is what keeps the motion an orbit: without it, a fast pointer pass
 *  accumulates velocity and particles trail off the glyph as a plume and never
 *  rejoin. Clamping displacement instead of force means the swarm parts wide
 *  and still snaps home. */
const MAX_OFFSET = 46;
/** Pull back toward the resting position. Higher = snappier return. */
const SPRING = 0.07;
/** Velocity retained per frame. Lower = more damped, less wobble on return. */
const FRICTION = 0.82;
/** Sample spacing in device px. The single biggest cost/density lever.
 *  4 rather than 5: at 5 the glyphs read as sparse halftone rather than as
 *  solid numerals made of dots. */
const GAP = 4;

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
 * Each particle gets a displacement whose direction is mostly *tangential* to
 * the cursor — perpendicular to the line between particle and pointer — so the
 * field sweeps around the dot and closes again behind it, rather than simply
 * being shoved aside.
 *
 * Speed along that path is not linear. `easeInOutSine` is applied to the
 * proximity falloff, so a particle accelerates as the cursor arrives,
 * decelerates through the widest part of its detour, then accelerates back as
 * the cursor leaves — which is the "fast, slow at the apex, fast again" shape.
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
    // Coarse pointers have no hovering cursor to orbit, so the interaction is
    // meaningless on touch — and running a full-field rAF loop on a mid-range
    // phone spends battery for an effect nobody can trigger.
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const allowed = () => !motionQuery.matches && hoverQuery.matches;

    const sync = () => setAnimated(allowed());
    sync();
    motionQuery.addEventListener("change", sync);
    hoverQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      hoverQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!animated) return;
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
    let paintColor = "#14110e";

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Cap DPR at 2: beyond that the particle count grows quadratically for
      // no perceptible gain on the sizes drawn here.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.inlineSize = `${rect.width}px`;
      canvas.style.blockSize = `${rect.height}px`;

      // Read the paint colour from the element's own computed style, so the
      // particles follow the design tokens instead of hardcoding a hex that
      // would drift from the palette.
      paintColor = getComputedStyle(wrap).getPropertyValue("color").trim() || paintColor;

      // Fit the glyphs to the box with a little breathing room, and let the
      // real font do the shaping. Manrope is already loaded for the page.
      const size = Math.min(rect.height * 0.92, rect.width * 0.42) * dpr;
      particles = sampleText({
        text,
        width: canvas.width,
        height: canvas.height,
        gap: Math.max(3, Math.round(GAP * dpr)),
        font: `800 ${size}px Manrope, system-ui, sans-serif`,
      });
    };

    // easeInOutSine on the proximity falloff. This is what makes the particle
    // quick at the edges of its detour and slow through the widest part, rather
    // than moving at a speed proportional to distance.
    const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = paintColor;

      const px = pointer.x * dpr;
      const py = pointer.y * dpr;
      const radius = RADIUS * dpr;
      const push = PUSH * dpr;

      for (const p of particles) {
        const dx = p.x - px;
        const dy = p.y - py;
        const dist = Math.hypot(dx, dy) || 0.0001;

        if (dist < radius) {
          // 0 at the rim, 1 at the pointer, eased.
          const strength = easeInOutSine(1 - dist / radius);

          // Unit vector from pointer to particle: the radial direction.
          const rx = dx / dist;
          const ry = dy / dist;
          // Its perpendicular: the tangential direction. This is the component
          // that carries particles *around* the dot rather than away from it.
          // Sign is stable per particle side, so the field parts cleanly and
          // rejoins behind rather than shimmering.
          const tx = -ry;
          const ty = rx;

          const force = strength * push;
          p.vx += (rx * (1 - ORBIT) + tx * ORBIT) * force * 0.06;
          p.vy += (ry * (1 - ORBIT) + ty * ORBIT) * force * 0.06;
        }

        // Spring home. Always applied, so a particle left mid-orbit when the
        // pointer leaves eases back rather than stopping where it was.
        p.vx += (p.ox - p.x) * SPRING;
        p.vy += (p.oy - p.y) * SPRING;

        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Clamp displacement, not force. A particle at the ceiling keeps sliding
        // tangentially (it is pinned to the circle, not stopped), which is what
        // turns a hard shove into an orbit — and guarantees the swarm always
        // rejoins behind the cursor instead of drifting away as a plume.
        const offX = p.x - p.ox;
        const offY = p.y - p.oy;
        const off = Math.hypot(offX, offY);
        const maxOff = MAX_OFFSET * dpr;
        if (off > maxOff) {
          p.x = p.ox + (offX / off) * maxOff;
          p.y = p.oy + (offY / off) * maxOff;
          // Kill the outward component of velocity so it does not fight the
          // clamp every frame and buzz at the boundary.
          const nx = offX / off;
          const ny = offY / off;
          const outward = p.vx * nx + p.vy * ny;
          if (outward > 0) {
            p.vx -= nx * outward;
            p.vy -= ny * outward;
          }
        }

        // One path for the whole field would be cheaper, but per-particle arcs
        // are what allow the jittered radii that stop this reading as halftone.
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    // Park the pointer far away on leave so the field settles home instead of
    // freezing around a stale position.
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [animated, text]);

  return (
    <div ref={wrapRef} className={styles.stage}>
      {/*
        The accessible text, and the entire experience for reduced-motion, touch
        and no-JS visitors. Always in the DOM — never replaced — so the page
        always has real text for screen readers and crawlers, and the canvas is
        purely an enhancement layered over it.
      */}
      <Tag className={styles.fallback} data-hidden={animated || undefined}>
        {label}
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
