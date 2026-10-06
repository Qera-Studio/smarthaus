"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollToTop.module.scss";
import { latestEntry } from "@/lib/observer";

/**
 * A back-to-top button that appears once the page top has scrolled away.
 *
 * A sentinel plus IntersectionObserver rather than a scroll listener, which
 * AGENTS.md rules out — this fires twice per crossing instead of on every
 * frame. Same pattern as NavShell's capsule trigger.
 *
 * The scroll itself is `scrollTo`, not a rAF loop: the browser already honours
 * prefers-reduced-motion for `behavior: "smooth"` and falls back to an instant
 * jump, so there is nothing to gate in JS.
 *
 * One colour on every ground: brown-600 holds 3:1 against both the light
 * canvas and the dark footer, so the observer that swapped its colours over
 * dark sections is gone (2026-10-04, at Shivanshu's request).
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setVisible(!latestEntry(entries)?.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Marks the top of the page. Once it scrolls out, the button shows. */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <button
        type="button"
        className={styles.button}
        data-visible={visible || undefined}
        // Hidden means hidden: a faded-out button is still focusable and still
        // in the accessibility tree, so Tab would stop on a control nobody can
        // see. This flips with the state, so it also covers the reduced-motion
        // path where there is no transition to wait for.
        inert={!visible || undefined}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <span className={styles.label}>Back to top</span>
      </button>
    </>
  );
}
