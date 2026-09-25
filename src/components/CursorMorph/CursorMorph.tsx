"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorMorph.module.scss";

/**
 * The cursor dot morphs into a frame around a control while the pointer is on
 * it, and shrinks back into the dot the moment it leaves.
 *
 * Deliberately NOT magnetic. Nothing happens until the pointer is actually
 * over the control, and nothing holds on once it is off — the hit area is the
 * control's own box, both ways, so detaching costs no extra travel. The frame
 * leans a few pixels toward the pointer inside the box, which is what reads as
 * the warp.
 *
 * Only the frame moves, never the control. Buttons already use `translate` and
 * `transform` for their own states (ScrollToTop's show/hide, the nav capsule),
 * and an inline value written here would silently override them.
 *
 * Pointer events and CSS transitions only; the rAF is a throttle on pointermove,
 * not a loop — same as the hero. Off on touch, coarse pointers and reduced
 * motion, where the native cursor is left entirely alone.
 */

// Buttons, and links styled as buttons. Inline text links keep the dot: a frame
// around a word mid-sentence is noise. Anything else opts in with the attribute.
const TARGETS = 'button, [role="button"], a[data-variant], [data-cursor-morph]';
// px the frame sits outside the control.
const PAD = 6;
// Max px the frame leans toward the pointer, at the control's edge.
const LEAN = 4;
// The native dot's diameter — globals.scss draws it at r=8.
const DOT = 16;

export function CursorMorph() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ref.current;
    if (
      !ring ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let target: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;

    const place = (left: number, top: number, w: number, h: number, radius: string) => {
      ring.style.translate = `${left}px ${top}px`;
      ring.style.inlineSize = `${w}px`;
      ring.style.blockSize = `${h}px`;
      ring.style.borderRadius = radius;
    };
    const toDot = () => place(x - DOT / 2, y - DOT / 2, DOT, DOT, "50%");

    const release = () => {
      if (!target) return;
      delete target.dataset["cursorMorphed"];
      target = null;
      ring.removeAttribute("data-active");
      toDot();
    };

    const draw = () => {
      frame = 0;
      if (!target) return;
      // A client-side navigation can unmount the control under a still pointer.
      if (!target.isConnected) return release();
      const r = target.getBoundingClientRect();
      const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
      const dx = clamp((x - r.left) / r.width - 0.5) * 2 * LEAN;
      const dy = clamp((y - r.top) / r.height - 0.5) * 2 * LEAN;
      place(
        r.left - PAD + dx,
        r.top - PAD + dy,
        r.width + 2 * PAD,
        r.height + 2 * PAD,
        getComputedStyle(target).borderRadius,
      );
    };

    const enter = (next: HTMLElement) => {
      if (target) {
        delete target.dataset["cursorMorphed"];
      } else {
        // Start from the dot under the pointer, not from wherever the frame was
        // last released, so it grows out of the cursor.
        ring.setAttribute("data-instant", "");
        toDot();
        void ring.offsetWidth;
        ring.removeAttribute("data-instant");
      }
      target = next;
      next.dataset["cursorMorphed"] = "";
      ring.dataset["ground"] = next.closest('[data-ground="dark"]') ? "dark" : "light";
      ring.setAttribute("data-active", "");
      draw();
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      const next = (e.target as Element).closest<HTMLElement>(TARGETS);
      if (next === target) return;
      if (!next || next.matches(":disabled")) release();
      else enter(next);
    };
    // Leaving the window fires no pointerover anywhere to release it.
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) release();
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (target && !frame) frame = requestAnimationFrame(draw);
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      release();
    };
  }, []);

  return <div ref={ref} className={styles.ring} aria-hidden="true" />;
}
