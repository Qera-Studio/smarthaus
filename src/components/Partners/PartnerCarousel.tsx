"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Partner } from "../../content/partners";
import { latestEntry } from "../../lib/observer";
import { Button } from "../Button";
import styles from "./Partners.module.scss";

/**
 * One card per partner, a tab toggle between them, and a timer that advances
 * on its own. The hardware carousel's patterns (HardwareStage.tsx), in the
 * horizontal: an ARIA tablist with one tab stop and the arrow keys, cards that
 * slide sideways as one strip, and a CSS animation as the timer whose
 * `animationend` advances the card.
 *
 * The timer runs only while the cards are on screen, never under reduced
 * motion, and pauses while keyboard focus is in the carousel (in the
 * stylesheet, so it needs no render). It has a pause button: content that
 * moves on its own for more than five seconds must be stoppable (WCAG 2.2.2).
 *
 * Every card is in the HTML, stacked in one grid cell, so the stage is as tall
 * as the tallest card and switching never moves the page below. A card that is
 * neither showing nor leaving is `visibility: hidden`, which keeps its copy
 * crawlable while taking it out of the tab order and the accessibility tree.
 */
export function PartnerCarousel({ partners }: { partners: readonly Partner[] }) {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  // Empty until the first switch, so the first card does not slide in on
  // page load: the keyframes are picked by direction.
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!reduced.matches);
    sync();
    reduced.addEventListener("change", sync);
    const io = new IntersectionObserver(
      (entries) => setInView(latestEntry(entries)?.isIntersecting ?? false),
      { threshold: 0.4 },
    );
    if (root.current) io.observe(root.current);
    return () => {
      reduced.removeEventListener("change", sync);
      io.disconnect();
    };
  }, []);

  const select = (index: number, dir?: "next" | "prev") => {
    const next = (index + partners.length) % partners.length;
    if (next === active) return;
    setDirection(dir ?? (next > active ? "next" : "prev"));
    setLeaving(active);
    setActive(next);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, [number, "next" | "prev"]> = {
      ArrowRight: [index + 1, "next"],
      ArrowDown: [index + 1, "next"],
      ArrowLeft: [index - 1, "prev"],
      ArrowUp: [index - 1, "prev"],
      Home: [0, "prev"],
      End: [partners.length - 1, "next"],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const to = (move[0] + partners.length) % partners.length;
    tabs.current[to]?.focus();
    select(to, move[1]);
  };

  const running = autoplay && inView && !paused;

  return (
    <div ref={root} className={styles.carousel} data-direction={direction ?? undefined}>
      <div className={styles.controls}>
        <div className={styles.tabs} role="tablist" aria-label="Partners">
          {partners.map((partner, index) => (
            <button
              key={partner.id}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`partner-tab-${partner.id}`}
              aria-controls={`partner-panel-${partner.id}`}
              aria-selected={index === active}
              tabIndex={index === active ? 0 : -1}
              className={styles.tab}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {partner.name}
            </button>
          ))}
        </div>

        {autoplay ? (
          <button
            type="button"
            className={styles.pause}
            aria-label="Pause the partner cards"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {/* Both glyphs ship; the stylesheet shows the one that names the
                current state, the keyboard-focus pause included. */}
            <svg
              className={styles.glyphPause}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            </svg>
            <svg
              className={styles.glyphPlay}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M7 4.5v15l12-7.5z" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* The timer: a rule under the controls, keyed on the card so each
          card's run starts from empty. Decorative: the pause button and the
          selected tab carry the state.

          Always rendered, never added at hydration. It sits in the grid, and
          appearing after first paint pushed everything below it down 18px: a
          layout shift for the visitor, and the CI failure that found it. At
          rest it is a zero-width line, so under reduced motion it holds its
          space and shows nothing. */}
      <span
        key={active}
        className={styles.progress}
        data-running={running}
        aria-hidden="true"
        onAnimationEnd={() => select(active + 1, "next")}
      />

      <div className={styles.stage}>
        {partners.map((partner, index) => (
          <div
            key={partner.id}
            role="tabpanel"
            id={`partner-panel-${partner.id}`}
            aria-labelledby={`partner-tab-${partner.id}`}
            className={styles.card}
            data-state={index === active ? "active" : index === leaving ? "leaving" : undefined}
            // The outgoing card is still painted while it slides away, but it
            // is no longer any tab's panel. Inert as well as hidden: aria-hidden
            // alone left its button in the tab order for the length of the
            // slide, focusable and unannounced.
            aria-hidden={index === leaving ? true : undefined}
            inert={index === leaving}
            // Both cards slide on one duration; the incoming card's end is the
            // one that releases the outgoing card.
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && index === active) setLeaving(null);
            }}
          >
            <div className={styles.copy}>
              <h3 className={styles.title}>{partner.title}</h3>
              <p className={styles.description}>{partner.body}</p>
              <div className={styles.action}>
                <Button
                  href={partner.href}
                  variant="soft"
                  size="sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit {partner.name}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </Button>
              </div>
            </div>

            <div className={styles.logoPanel}>
              <Image
                src={partner.logo.src}
                alt={partner.name}
                width={partner.logo.width}
                height={partner.logo.height}
                sizes="384px"
                className={styles.logo}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
