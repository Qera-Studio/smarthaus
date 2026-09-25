"use client";

import { useEffect, useRef } from "react";
import styles from "./Process.module.scss";

/**
 * Finishes the portal's zoom on its own once scroll has driven the first half.
 *
 * Renders a marker whose bottom edge is the scroll position where the
 * scroll-driven half ends, and sets `data-portal-open` on the section while
 * that marker is entirely above the viewport. The stylesheet does the rest with
 * a transition on `.grow`; this writes one attribute and animates nothing.
 *
 * A plain viewport observer. An earlier version made the root "everything
 * above the fold" with a huge rootMargin on a 1px marker, and Chrome delivered
 * its callbacks late or not at all: measured, the section stayed open with the
 * marker 65px below the fold. The marker is a viewport tall instead, so see
 * .handoff for why that also survives jump scrolls.
 */
export function ProcessHandoff() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = ref.current;
    const section = marker?.closest<HTMLElement>("[data-process]");
    if (!marker || !section) return;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      section.toggleAttribute("data-portal-open", past);
    });
    io.observe(marker);
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className={styles.handoff} aria-hidden="true" />;
}
