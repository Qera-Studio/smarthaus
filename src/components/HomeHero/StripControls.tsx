"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How far a press has to travel before it is a drag rather than a click on a
 * card's link. Below this the link still opens.
 */
export const DRAG_MIN_PX = 6;

/** How far from the screen's edge a keyboard-focused card is brought to. */
export const REVEAL_GUTTER_PX = 16;

/**
 * How far the strip runs for each pixel the page scrolls: on along its drift
 * going down, back going up. Tuned by eye (Shivanshu, 2026-11-02).
 */
export const SCROLL_SPEED = 2;

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
 *
 * Scroll (Shivanshu, 2026-11-02): while any of the strip is on screen,
 * every pixel the page scrolls down runs it SCROLL_SPEED pixels on, and every
 * pixel up runs it back, with no limit either way: the pass wraps, as a drag
 * does. Hover and the pause button stop only the drift, not this, since the
 * scroll is the visitor's own hand. Not under keyboard focus in the strip,
 * where the browser's scroll to a focused card would carry it away, and not
 * under reduced motion.
 *
 * The opening: the splash boot script sets data-intro on <html> on every full
 * load, and the hero's opening plays only while it is there. It is taken off
 * once the strip has arrived, the opening's last step, so a soft navigation
 * back finds the hero at rest. Not on unmount: in development React mounts,
 * unmounts and mounts again at once, and that took it off before anything
 * but the title had started (found 2026-11-02).
 *
 * Hover (2026-10-28): the browser works out :hover only when the pointer
 * moves, so a swipe or a drag that carried the cards under a still pointer
 * left the overlay on the card the gesture began on, and none on the card
 * now under it. This marks that card data-hover after every move instead,
 * and the stylesheet shows the overlay by it once data-hand is set.
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
    el.setAttribute("data-hand", "");

    // The card under the pointer, by hit test rather than :hover.
    let pointer: { x: number; y: number } | null = null;
    let hovered: Element | null = null;
    const mark = () => {
      const card = pointer ? document.elementFromPoint(pointer.x, pointer.y)?.closest("li") : null;
      const next = card && el.contains(card) ? card : null;
      if (next === hovered) return;
      hovered?.removeAttribute("data-hover");
      next?.setAttribute("data-hover", "");
      hovered = next;
    };
    const point = (event: MouseEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      mark();
    };
    const onHover = (event: PointerEvent) => {
      if (event.pointerType !== "touch") point(event);
    };
    const onLeave = () => {
      pointer = null;
      mark();
    };

    /**
     * Move the strip by dx pixels: right is positive, as the hand moves.
     *
     * A drag wraps round the pass, since the two copies make it the same
     * picture. A reveal of a focused card clamps instead: the focused link
     * is in the first copy, and a wrap would hand its place to the inert
     * second copy and throw it a whole copy's width off screen.
     */
    const move = (dx: number, wrap = true) => {
      const track = el.firstElementChild as HTMLElement | null;
      const [animation] = track?.getAnimations() ?? [];
      if (!animation || !track) {
        el.scrollLeft -= dx;
        mark();
        return;
      }
      const duration = Number(animation.effect?.getComputedTiming().duration);
      // One pass carries the strip one copy's width, half the track.
      const msPerPx = duration / (track.getBoundingClientRect().width / 2);
      const next = Number(animation.currentTime ?? 0) - dx * msPerPx;
      animation.currentTime = wrap
        ? ((next % duration) + duration) % duration
        : Math.min(Math.max(next, 0), duration - 1);
      mark();
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
      if (event.pointerType !== "touch") pointer = { x: event.clientX, y: event.clientY };
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

    // The page's scroll, listened to only while the strip is on screen, and
    // passive, so it never holds the scroll up.
    let lastY = window.scrollY;
    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      const track = el.firstElementChild;
      if (!dy || !track?.getAnimations().length || track.matches(":focus-within")) return;
      move(-dy * SCROLL_SPEED);
    };
    const visible = new IntersectionObserver((entries) => {
      lastY = window.scrollY;
      if (entries.some((entry) => entry.isIntersecting))
        window.addEventListener("scroll", onScroll, { passive: true });
      else window.removeEventListener("scroll", onScroll);
    });
    visible.observe(el);

    // The opening is over once the strip has arrived (the class names are
    // hashed, so by the end of the name).
    const onArrived = (event: AnimationEvent) => {
      if (event.target === el && event.animationName.endsWith("hero-arrive"))
        document.documentElement.removeAttribute("data-intro");
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
      pointer = { x: event.clientX, y: event.clientY };
      move(-event.deltaX);
    };

    // The browser's own image drag would steal the gesture.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    // Keyboard focus on a card the strip has carried off screen. The browser
    // reveals it by scrolling the strip's clipped box, which it did only part
    // of the way (3px of a card showing, measured 2026-10-28) and never undid,
    // so the offset sat on top of the drift and opened a blank gap past the
    // second copy when the loop wrapped. While the strip animates, the offset
    // is handed to the animation instead (the same picture, scrollLeft back to
    // 0), and the focused card is brought fully into view, a gutter from the
    // edge. Under reduced motion the strip is a real scroller and the
    // browser's own reveal is right.
    const settle = () => {
      const track = el.firstElementChild as HTMLElement | null;
      if (!track?.getAnimations().length) return;
      if (el.scrollLeft !== 0) {
        move(-el.scrollLeft, false);
        el.scrollLeft = 0;
      }
      const card = document.activeElement?.closest("li");
      if (!card || !track.contains(card)) return;
      const view = el.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      const start = view.left + REVEAL_GUTTER_PX;
      const end = view.right - REVEAL_GUTTER_PX;
      // Too wide for the gap between the gutters: its start edge wins.
      if (box.left < start || box.width > end - start) move(start - box.left, false);
      else if (box.right > end) move(end - box.right, false);
    };
    // In the focus event itself: the browser scrolls a focused element into
    // view only after the event's handlers have run, so a card already put on
    // screen here gives it nothing to scroll, and nothing is left to settle.
    // The scroll listener catches whatever it scrolls anyway.
    const onFocusIn = settle;

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onHover);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("scroll", settle);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("animationend", onArrived);
    return () => {
      visible.disconnect();
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("animationend", onArrived);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onHover);
      el.removeEventListener("pointerleave", onLeave);
      el.removeAttribute("data-hand");
      hovered?.removeAttribute("data-hover");
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("scroll", settle);
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
