"use client";

import { useRef, useState } from "react";

/**
 * How long an arrow takes to carry the strip one card. Long enough to read as
 * a glide rather than a jump, short enough that a second press feels prompt.
 */
export const NUDGE_MS = 450;

/** The strip shows this many cards per copy; one card is this share of a pass. */
export const CARDS_PER_PASS = 8;

/** How close to a card's edge, as a share of a card, counts as on it. */
export const EDGE_SLACK = 0.05;

/**
 * The strip's three buttons, above it: previous, pause, next. Styled as the
 * hardware carousel's (Hardware.module.scss).
 *
 * Pause sets data-paused on the strip, which the stylesheet stops it on: the
 * WCAG 2.2.2 stop that hover is not.
 *
 * The arrows move the strip's own CSS animation through the Web Animations
 * API, so there is still one source of motion. A press speeds the animation
 * up (or runs it backwards) for NUDGE_MS until it lands on the next card's
 * edge, then pins it there and hands it back: drifting, or still if paused.
 * data-nudging lets it run while paused, for the length of the glide. Under
 * reduced motion there is no animation, and the arrows scroll the strip by a
 * card instead.
 */
export function StripControls({
  className,
  buttonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Where the current glide will land, so rapid presses add up card by card.
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const strip = () =>
    root.current?.closest("[data-hero]")?.querySelector<HTMLElement>("[data-hero-strip]") ?? null;

  function togglePause() {
    const next = !paused;
    setPaused(next);
    strip()?.toggleAttribute("data-paused", next);
  }

  function step(direction: 1 | -1) {
    const el = strip();
    if (!el) return;
    const track = el.firstElementChild as HTMLElement | null;
    const [animation] = track?.getAnimations() ?? [];

    if (!animation) {
      // Reduced motion: no animation, the strip scrolls by hand.
      const card = el.querySelector("li");
      const width = card ? card.getBoundingClientRect().width : el.clientWidth;
      el.scrollBy({ left: direction * width, behavior: "auto" });
      return;
    }

    const duration = Number(animation.effect?.getComputedTiming().duration);
    const card = duration / CARDS_PER_PASS;
    let now = Number(animation.currentTime ?? 0);
    // In cards, from wherever a glide in progress was already heading. Within
    // 5% of an edge counts as on it: a landing can overshoot by a frame, and
    // "previous" from 17ms past an edge must not step back just those 17ms.
    const position = (pending.current ?? now) / card;
    const edge = Math.round(position);
    const from = Math.abs(position - edge) < EDGE_SLACK ? edge : position;
    let target = (direction === 1 ? Math.floor(from) + 1 : Math.ceil(from) - 1) * card;
    // Below zero the animation has not started and shows its resting frame,
    // so a backward glide from the first card would freeze. One pass later is
    // the same picture.
    if (target < 0) {
      now += duration;
      target += duration;
      animation.currentTime = now;
    }
    pending.current = target;

    el.setAttribute("data-nudging", "");
    animation.playbackRate = (target - now) / NUDGE_MS;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Pinned on the edge, wrapped into one pass: the copies are identical,
      // so a whole pass either way is the same picture.
      animation.currentTime = ((target % duration) + duration) % duration;
      animation.playbackRate = 1;
      // The stylesheet re-pauses a paused strip only on its next style
      // pass, a frame later; pausing here keeps it exactly on the edge. The
      // stylesheet's own play-state changes still drive it from then on.
      if (el.hasAttribute("data-paused")) animation.pause();
      el.removeAttribute("data-nudging");
      pending.current = null;
      timer.current = null;
    }, NUDGE_MS);
  }

  return (
    <div ref={root} className={className}>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Previous image"
        onClick={() => step(-1)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
          <path d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z" />
        </svg>
      </button>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Pause the images"
        aria-pressed={paused}
        data-pause
        onClick={togglePause}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
          {paused ? <path d="M8 5v14l11-7z" /> : <path d="M6 5h4v14H6zm8 0h4v14h-4z" />}
        </svg>
      </button>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Next image"
        onClick={() => step(1)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
          <path d="M8.6 17.6 10 19l7-7-7-7-1.4 1.4 5.6 5.6z" />
        </svg>
      </button>
    </div>
  );
}
