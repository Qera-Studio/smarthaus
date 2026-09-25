"use client";

import { useEffect, useRef } from "react";
import styles from "./Process.module.scss";

/**
 * Finishes the portal's zoom on its own once scroll has driven the first half.
 *
 * Renders a marker whose bottom edge is the scroll position where the
 * scroll-driven half ends, and sets `data-portal-open` on the section while
 * that marker is entirely above the viewport. The stylesheet does the rest with
 * a transition on `.grow`; this writes one attribute and one custom property,
 * and animates nothing.
 *
 * The property is the transition's duration, and it is what keeps the handoff
 * from reading as a snap. A fixed duration ran the second half at its own
 * speed, which was faster than a wheel had been moving the slab, and the slab
 * visibly lurched at the join. So the observer watches the marker leave at
 * several thresholds, takes the scroll speed from the last two, and sets the
 * duration so the transition STARTS at the rate scroll was driving the zoom
 * and eases out from there. A jump scroll has no usable speed and gets the
 * floor; a very slow scroll gets the ceiling, or the rail would start moving
 * under a slab still growing.
 *
 * A plain viewport observer. An earlier version made the root "everything
 * above the fold" with a huge rootMargin on a 1px marker, and Chrome delivered
 * its callbacks late or not at all: measured, the section stayed open with the
 * marker 65px below the fold. The marker is a viewport tall instead, so see
 * .handoff for why that also survives jump scrolls.
 */

// Callbacks every tenth of the marker's height, so the last two give a speed.
const THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);
// The .grow easing's initial slope, so the transition opens at scroll speed:
// cubic-bezier(0.5, 1, 0.89, 1) starts at 1 / 0.5 = twice its average rate.
const EASE_START = 2;
// Clamp, ms. The floor is a jump scroll or a flick; the ceiling stops a creep
// from outlasting the scroll that follows it.
const MIN = 200;
const MAX = 800;

export function ProcessHandoff() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = ref.current;
    const section = marker?.closest<HTMLElement>("[data-process]");
    if (!marker || !section) return;

    // The scroll-driven half, in scale per px. Read from the stylesheet's own
    // tokens rather than restated: the handoff and the start scale are plain
    // numbers, and the scroll it takes is the marker's bottom edge measured
    // from the section's top.
    const style = getComputedStyle(section);
    const grown = parseFloat(style.getPropertyValue("--process-portal-handoff"));
    const from = parseFloat(style.getPropertyValue("--process-portal-scale"));
    const remaining = 1 - grown;

    let last: { top: number; time: number } | null = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const top = entry.boundingClientRect.top;

        if (last && entry.time > last.time) {
          const pxPerMs = Math.abs(top - last.top) / (entry.time - last.time);
          const portalPx =
            marker.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
          const scalePerMs = (pxPerMs * (grown - from)) / portalPx;
          if (scalePerMs > 0) {
            const ms = Math.min(MAX, Math.max(MIN, (EASE_START * remaining) / scalePerMs));
            section.style.setProperty("--process-grow-duration", `${Math.round(ms)}ms`);
          }
        }
        last = { top, time: entry.time };

        const past = !entry.isIntersecting && top < 0;
        section.toggleAttribute("data-portal-open", past);
      },
      { threshold: THRESHOLDS },
    );
    io.observe(marker);
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className={styles.handoff} aria-hidden="true" />;
}
