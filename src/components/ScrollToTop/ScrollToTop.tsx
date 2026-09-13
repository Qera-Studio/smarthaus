"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollToTop.module.scss";

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
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  // True while a dark section sits behind the button, which flips its colours.
  const [onDark, setOnDark] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setVisible(!entry?.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Invert over dark bands.
  //
  // [data-ground="dark"] is the codebase's existing marker for "this block
  // paints a dark ground" — globals.scss already inverts the custom cursor on
  // it, for the same reason this inverts. Reusing it means the footer, the
  // contact page's location card and the consent panel are all covered
  // already, and any future dark section is covered the moment it opts in.
  //
  // The test is "does a dark section overlap the button's own strip of the
  // viewport", which is a plain intersection once the observer's root is shrunk
  // to that strip. Same rootMargin technique NavShell uses, and for the same
  // reason: intersectionRatio is a fraction of the TARGET, and a full-height
  // footer's ratio never approaches anything useful.
  //
  // Margins are negative insets from each viewport edge, measured off the
  // button's real box so the band tracks it across breakpoints rather than
  // duplicating the CSS offsets here.
  useEffect(() => {
    const button = buttonRef.current;
    const targets = document.querySelectorAll('[data-ground="dark"]');
    if (!button || targets.length === 0) return;

    let io: IntersectionObserver | undefined;

    const observe = () => {
      io?.disconnect();
      const box = button.getBoundingClientRect();
      const top = Math.round(box.top);
      const bottom = Math.round(window.innerHeight - box.bottom);
      io = new IntersectionObserver(
        (entries) => {
          // Several dark sections could be observed, so this cannot read one
          // entry — it asks whether ANY of them currently overlaps the band.
          setOnDark(entries.some((entry) => entry.isIntersecting));
        },
        { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: 0 },
      );
      targets.forEach((target) => io?.observe(target));
    };

    observe();

    // The band is measured in pixels, so it goes stale when the viewport
    // changes size — a rotate, or the breakpoint that moves the button up off
    // the mobile nav. ResizeObserver on <body> rather than a resize listener,
    // which AGENTS.md rules out alongside scroll listeners.
    const ro = new ResizeObserver(observe);
    ro.observe(document.body);

    return () => {
      io?.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* Marks the top of the page. Once it scrolls out, the button shows. */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        data-visible={visible || undefined}
        data-on-dark={onDark || undefined}
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
