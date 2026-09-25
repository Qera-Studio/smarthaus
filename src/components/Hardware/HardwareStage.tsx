"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { HardwareItem } from "../../content/hardware";
import styles from "./Hardware.module.scss";

type Props = { items: readonly HardwareItem[] };

/**
 * A vertical carousel: the icon bar is an ARIA tablist, the slides stack in
 * one grid cell, and the incoming slide animates over the outgoing one from
 * below (next) or above (previous). The outgoing slide never moves; it is
 * covered.
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

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!reduced.matches);
    sync();
    reduced.addEventListener("change", sync);

    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
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
        <div role="tablist" aria-label="Components" className={styles.tabs}>
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

      <div className={styles.stage}>
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
