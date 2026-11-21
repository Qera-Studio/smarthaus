"use client";

import { useEffect } from "react";

/** How far above the screen's foot something has to come before it reveals. */
export const REVEAL_MARGIN = "0px 0px -10% 0px";

/**
 * The homepage's scroll reveal (Shivanshu, 2026-11-04): anything marked
 * data-reveal rises or fades in once as it comes on screen, and then stays. The
 * animation is all in globals.scss; this only moves the attribute.
 *
 * Everything is visible in the server HTML, and only what is still below the
 * screen once this runs gets hidden. So nothing on screen waits for JavaScript,
 * the largest paint included; if this never runs, the page simply stands; and
 * what /pricing shares with the homepage does nothing there, since this is
 * mounted here alone. Never under reduced motion.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const below = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top >= window.innerHeight,
    );
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: REVEAL_MARGIN },
    );
    for (const el of below) {
      el.setAttribute("data-reveal", "waiting");
      seen.observe(el);
    }

    return () => {
      seen.disconnect();
      for (const el of below) el.setAttribute("data-reveal", "");
    };
  }, []);

  return null;
}
