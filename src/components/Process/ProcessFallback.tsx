"use client";

import { useEffect } from "react";
import { latestEntry } from "@/lib/observer";

/**
 * Drives the process rail in browsers without scroll-driven animations.
 *
 * Renders nothing. It exists to write ONE custom property, `--process-progress`
 * (0 to 1), on the section, which Process.module.scss consumes inside a
 * `@supports not (animation-timeline: view())` block. Where the CSS path works
 * — Chrome, Edge, Safari 26 — this never starts and the property is never set.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE SECOND rAF EXCEPTION. It is documented in CLAUDE.md alongside
 * ParticleText's, and the four guarantees below are what the exception is
 * conditional on. If you change this file, re-read that section first.
 * ---------------------------------------------------------------------------
 */
export function ProcessFallback() {
  useEffect(() => {
    // 1. If the CSS path works, do nothing, ever. Two drivers writing the same
    //    property is a bug, not redundancy.
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;

    // 2. prefers-reduced-motion, gated HERE rather than in CSS. The
    //    _reset.scss reduced-motion block zeroes animation durations and has no
    //    effect whatsoever on a rAF loop. Same trap as ParticleText.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    // The section is this component's parent: it renders null, so there is no
    // node of its own to hang a ref on, and the property has to land on the
    // element that scopes the stylesheet's custom properties.
    const section = document.querySelector<HTMLElement>("[data-process]");
    if (!section) return;

    let frame = 0;
    let last = -1;

    const tick = () => {
      const rect = section.getBoundingClientRect();
      // Travel is the section's height minus the viewport: the distance its top
      // moves between pinning and releasing. Guard the divide — a section
      // shorter than the viewport has no travel and would produce Infinity.
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(Math.max(-rect.top / travel, 0), 1) : 0;

      // 4. One property, and only when it actually changed. A stationary page
      //    costs a rect read and nothing else.
      if (progress !== last) {
        last = progress;
        section.style.setProperty("--process-progress", String(progress));
      }
      frame = requestAnimationFrame(tick);
    };

    // 3. Start and stop from an IntersectionObserver, the codebase's own
    //    primitive, so the loop never runs while the rail is off screen.
    const io = new IntersectionObserver((entries) => {
      if (latestEntry(entries)?.isIntersecting) {
        if (!frame) frame = requestAnimationFrame(tick);
        return;
      }
      cancelAnimationFrame(frame);
      frame = 0;
    });
    io.observe(section);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
