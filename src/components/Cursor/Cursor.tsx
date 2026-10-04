"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./Cursor.module.scss";

/** What the cursor turns square over: anything a click does something to. */
export const CLICKABLE = [
  "a[href]",
  "button:not(:disabled)",
  '[role="button"]',
  '[role="tab"]',
  "summary",
  "label",
  "select:not(:disabled)",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
].join(", ");

/** A mouse or trackpad, and colours the site is allowed to paint. */
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";
export const FORCED_COLORS = "(forced-colors: active)";

/**
 * The site's cursor: a painted dot that turns into a square over anything
 * clickable. The square is not painted, it is a window: it inverts whatever
 * sits behind it (`backdrop-filter`), text, buttons and all. The dot is the
 * native dot's colours, dark or light by the ground under it.
 *
 * ## The native dot stays the fallback
 *
 * globals.scss still draws the SVG dot. This takes over only on a fine
 * pointer, outside forced colours, and only once the mouse has moved: it sets
 * `data-cursor` on <html>, which is what hides the native cursor. Before
 * that, without JavaScript, on touch, or in high contrast, the dot is the
 * cursor, so there is never a moment with none.
 *
 * ## Motion
 *
 * Following the pointer is not an animation: each pointermove writes one
 * `translate`, no rAF loop. Dot and square are one size; the morph is a CSS
 * transition on `border-radius`, which the reduced-motion reset zeroes.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia(FINE_POINTER);
    const forced = window.matchMedia(FORCED_COLORS);
    const sync = () => setEnabled(fine.matches && !forced.matches);
    sync();
    fine.addEventListener("change", sync);
    forced.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      forced.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!enabled || !el) return;
    const html = document.documentElement;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      el.style.translate = `${event.clientX}px ${event.clientY}px`;
      el.dataset.visible = "true";
      html.dataset.cursor = "custom";
    };
    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      el.dataset.shape = target?.closest?.(CLICKABLE) ? "square" : "dot";
      // The painted dot needs the light ink on a dark section; the square
      // inverts, so it does not care.
      el.dataset.ground = target?.closest?.('[data-ground="dark"]') ? "dark" : "light";
    };
    // Off the window: relatedTarget is null when the pointer left the page.
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) el.dataset.visible = "false";
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      delete html.dataset.cursor;
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      ref={box}
      className={styles.cursor}
      data-shape="dot"
      data-ground="light"
      data-visible="false"
      aria-hidden="true"
    />
  );
}
