"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { HardwareItem } from "../../content/hardware";
import styles from "./Hardware.module.scss";
import { latestEntry } from "@/lib/observer";

type Props = { items: readonly HardwareItem[] };

/**
 * How far a finger has to travel sideways before a swipe counts. Below this,
 * and on any gesture more vertical than horizontal, it was a tap or a scroll.
 */
export const SWIPE_MIN_PX = 40;

/**
 * A vertical carousel: the icon bar is an ARIA tablist, the slides stack in
 * one grid cell, and a switch pushes one slide out while the next comes in:
 * next rises from below as the outgoing one leaves upward, previous is the
 * reverse. Both move on one curve, so the travel reads as one deliberate
 * vertical motion rather than a cover.
 *
 * ## Navigation is horizontal, motion is vertical
 *
 * The arrow buttons at either end of the bar and a sideways swipe on the
 * stage both step through the slides: left or a rightward swipe is previous,
 * right or a leftward swipe is next, the way a phone reader expects. What they
 * trigger is still the vertical push above. The swipe is read from pointer
 * events for touch and pen only (a mouse drag on the image would start the
 * browser's own image drag instead), and the stage's `touch-action: pan-y`
 * leaves vertical scrolling to the page.
 *
 * ## The timer is a CSS animation
 *
 * The bronze line along the bar's bottom edge is the timer. It animates from
 * empty to full over `--hardware-interval`, and its `animationend` advances
 * the carousel. No setInterval: pausing is `animation-play-state: paused`,
 * set by focus-within in the stylesheet and by the pause button or an
 * off-screen section here. The line is keyed on the active index so each
 * slide gets a fresh run.
 *
 * ## prefers-reduced-motion is gated in JS, not only in CSS
 *
 * _reset.scss collapses every animation to 0.01ms, which would make the
 * progress line end instantly and advance forever. So autoplay starts only
 * after mount, and only when the query is not set. The tabs still work under
 * reduced motion; the slides simply switch without travelling.
 *
 * ## Roving tabindex, automatic activation
 *
 * Same tablist handling as Hero/ServiceTabs.tsx, restated rather than
 * imported (that file lives in the Hero's chunk). Unlike the Hero, arrowing
 * switches the slide immediately: switching is cheap here.
 */
export function HardwareStage({ items }: Props) {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);

  // Keep the selected tab in view inside the strip, which scrolls sideways on
  // a phone once the arrows take their share of the bar. Only the strip's own
  // scrollLeft moves: scrollIntoView would also scroll the page, and would do
  // it while the timer advances with the section half off screen.
  useEffect(() => {
    const strip = tabs.current;
    const tab = strip?.querySelectorAll<HTMLElement>('[role="tab"]')[active];
    if (!strip || !tab) return;
    const s = strip.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const left = strip.scrollLeft + (t.left - s.left) - (s.width - t.width) / 2;
    // A JS smooth scroll ignores the reduced-motion reset, so gate it here.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left, behavior: still ? "auto" : "smooth" });
  }, [active]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!reduced.matches);
    sync();
    reduced.addEventListener("change", sync);

    const io = new IntersectionObserver(
      (entries) => setInView(latestEntry(entries)?.isIntersecting ?? false),
      {
        threshold: 0.4,
      },
    );
    if (root.current) io.observe(root.current);

    return () => {
      reduced.removeEventListener("change", sync);
      io.disconnect();
    };
  }, []);

  const select = (index: number, dir?: "next" | "prev") => {
    const next = (index + items.length) % items.length;
    if (next === active) return;
    setDirection(dir ?? (next > active ? "next" : "prev"));
    setLeaving(active);
    setActive(next);
  };

  // One step either way, wrapping. The direction is explicit so the last
  // slide's "next" still rises from below as it wraps to the first.
  const step = (delta: 1 | -1) => select(active + delta, delta > 0 ? "next" : "prev");

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
    // Finger moving left pulls the next slide in, as on any phone.
    step(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const focusTab = (i: number) => {
      const tabs = bar.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabs?.[i]?.focus();
    };
    let target: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        target = (index + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        target = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(target);
    select(target);
  };

  const running = autoplay && inView && !paused;

  return (
    <div ref={root} className={styles.stageRoot} data-direction={direction}>
      <div ref={bar} className={styles.bar}>
        {/* Outside the tablist: these are plain buttons that step, not tabs,
            so they sit in the tab order on their own rather than in the
            tablist's roving one. */}
        <button
          type="button"
          className={styles.arrow}
          data-edge="start"
          aria-label="Previous component"
          onClick={() => step(-1)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
            <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
          </svg>
        </button>

        <div ref={tabs} role="tablist" aria-label="Components" className={styles.tabs}>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`hardware-tab-${item.id}`}
              aria-controls={`hardware-panel-${item.id}`}
              aria-selected={i === active}
              aria-label={item.title}
              tabIndex={i === active ? 0 : -1}
              className={styles.tab}
              onClick={() => select(i)}
              onKeyDown={(event) => onKeyDown(event, i)}
            >
              {/* A 24px SVG: next/image would only wrap it in a loader it cannot use. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/hero/hardware/icons/${item.icon}`} alt="" width={24} height={24} />
            </button>
          ))}
        </div>

        {autoplay ? (
          <button
            type="button"
            className={styles.pause}
            aria-label="Pause automatic advance"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {/* Both glyphs ship; the stylesheet shows the one that names the
                current state, which includes a focus pause the component
                never hears about. aria-pressed stays the reader's own
                toggle. */}
            <svg
              className={styles.glyphPause}
              viewBox="0 0 24 24"
              width="24"
              height="24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            </svg>
            <svg
              className={styles.glyphPlay}
              viewBox="0 0 24 24"
              width="24"
              height="24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : null}

        <button
          type="button"
          className={styles.arrow}
          data-edge="end"
          aria-label="Next component"
          onClick={() => step(1)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
            <path d="M8.6 17.6 10 19l7-7-7-7-1.4 1.4 5.6 5.6z" />
          </svg>
        </button>

        {autoplay ? (
          <span
            key={active}
            className={styles.progress}
            data-running={running}
            aria-hidden="true"
            onAnimationEnd={() => select(active + 1, "next")}
          />
        ) : null}
      </div>

      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        // The browser took the gesture (a vertical scroll): not a swipe.
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            id={`hardware-panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`hardware-tab-${item.id}`}
            className={styles.slide}
            data-state={i === active ? "active" : i === leaving ? "leaving" : undefined}
            // The outgoing slide is still painted while it is covered, but it
            // is no longer any tab's panel.
            aria-hidden={i === leaving ? true : undefined}
            // Both slides animate now and end together; the incoming one's end
            // is the one that releases the outgoing slide.
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && i === active) setLeaving(null);
            }}
          >
            <div className={styles.copy}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.icon}
                src={`/hero/hardware/icons/${item.icon}`}
                alt=""
                width={40}
                height={40}
              />
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.description}</p>
            </div>
            <div className={styles.frame}>
              <Image
                src={`/hero/hardware/${item.image.src}`}
                alt={item.image.alt}
                width={item.image.width}
                height={item.image.height}
                sizes="(min-width: 1440px) 720px, (min-width: 1024px) 50vw, 100vw"
                className={styles.image}
                // The first slide is visible on arrival; the rest load when
                // the section is near. Never priority: the Hero owns LCP.
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
