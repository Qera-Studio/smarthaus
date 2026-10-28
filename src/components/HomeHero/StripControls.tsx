"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How far a press has to travel before it is a drag rather than a click on a
 * card's link. Below this the link still opens.
 */
export const DRAG_MIN_PX = 6;

/**
 * The strip's pause button, above it, and the hand on the strip itself.
 *
 * Pause sets data-paused on the strip, which the stylesheet stops it on: the
 * WCAG 2.2.2 stop that hover is not.
 *
 * Drag and swipe (2026-10-28): a mouse or finger dragged sideways, or a
 * trackpad swiped sideways, moves the strip with it. While the strip drifts
 * this is its own CSS animation, moved through the Web Animations API, so
 * there is still one source of motion: the drag sets the animation's
 * currentTime by the distance moved, wrapped into one pass (the two copies
 * are identical, so a whole pass either way is the same picture), and
 * data-dragging holds it still under the hand. Under reduced motion there is
 * no animation and the strip is a plain scroller, so the drag scrolls it. A
 * vertical trackpad swipe is left to the page.
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

  const strip = () =>
    root.current?.closest("[data-hero]")?.querySelector<HTMLElement>("[data-hero-strip]") ?? null;

  function togglePause() {
    const next = !paused;
    setPaused(next);
    strip()?.toggleAttribute("data-paused", next);
  }

  useEffect(() => {
    const el = strip();
    if (!el) return;

    /** Move the strip by dx pixels: right is positive, as the hand moves. */
    const move = (dx: number) => {
      const track = el.firstElementChild as HTMLElement | null;
      const [animation] = track?.getAnimations() ?? [];
      if (!animation || !track) {
        el.scrollLeft -= dx;
        return;
      }
      const duration = Number(animation.effect?.getComputedTiming().duration);
      // One pass carries the strip one copy's width, half the track.
      const msPerPx = duration / (track.getBoundingClientRect().width / 2);
      const next = Number(animation.currentTime ?? 0) - dx * msPerPx;
      animation.currentTime = ((next % duration) + duration) % duration;
    };

    let press: { id: number; x: number; last: number } | null = null;
    let dragged = false;

    // Moves and the release are followed on window for the length of a
    // press, not on the strip: before the drag threshold there is no pointer
    // capture, and a press that crossed anything over the strip (the consent
    // banner, found 2026-10-28) lost every move to it and never dragged.
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      press = { id: event.pointerId, x: event.clientX, last: event.clientX };
      dragged = false;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    const onMove = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      if (!dragged) {
        if (Math.abs(event.clientX - press.x) < DRAG_MIN_PX) return;
        dragged = true;
        el.setAttribute("data-dragging", "");
        el.setPointerCapture?.(event.pointerId);
      }
      move(event.clientX - press.last);
      press.last = event.clientX;
    };

    const onUp = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      press = null;
      el.removeAttribute("data-dragging");
      stopFollowing();
    };

    const stopFollowing = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    // A drag ends on a card's link; the click it produces is not a click.
    const onClick = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      move(-event.deltaX);
    };

    // The browser's own image drag would steal the gesture.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      stopFollowing();
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return (
    <div ref={root} className={className}>
      <button
        type="button"
        className={buttonClassName}
        aria-label="Pause the images"
        aria-pressed={paused}
        data-pause
        onClick={togglePause}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
          {paused ? <path d="M8 5v14l11-7z" /> : <path d="M6 5h4v14H6zm8 0h4v14h-4z" />}
        </svg>
      </button>
    </div>
  );
}
