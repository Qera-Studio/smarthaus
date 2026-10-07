"use client";

import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";

/**
 * Opens a value while a mouse rests on it, on top of the native click.
 *
 * The rows are `<details name="values">`, so the browser already keeps one
 * open at a time: setting `open` here closes the last one. A row the hover
 * opened closes again when the mouse leaves it (Shivanshu, 2026-10-07, which
 * replaced the earlier "stays open" rule); the height transition in
 * Faq.module.scss keeps the rows below from jumping as it does.
 *
 * A mouse reaches a row before it clicks it, so the hover has always opened
 * the row by the time the click lands, and the click's native toggle would
 * shut it again. That first click is swallowed instead, and it pins the row:
 * a row opened on purpose stays open when the mouse moves on. The next click
 * closes it as usual.
 *
 * Mouse only, judged per event rather than by media query, so a touchscreen
 * laptop still hovers with its trackpad and never with a finger. Touch, pen
 * and keyboard keep plain `<details>`, and without JavaScript so does
 * everyone.
 */
export function ValuesHover({ className, children }: { className?: string; children: ReactNode }) {
  const hoverOpened = useRef<HTMLDetailsElement | null>(null);

  function onPointerOver(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const row = (event.target as Element).closest("details");
    if (!row || row.open) return;
    row.open = true;
    hoverOpened.current = row;
  }

  function onPointerOut(event: PointerEvent<HTMLDivElement>) {
    const row = hoverOpened.current;
    if (event.pointerType !== "mouse" || !row) return;
    // pointerout also fires moving between children of the same row.
    if (row.contains(event.relatedTarget as Node | null)) return;
    if (!row.contains(event.target as Node)) return;
    row.open = false;
    hoverOpened.current = null;
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const row = (event.target as Element).closest("summary")?.parentElement;
    if (!row || row !== hoverOpened.current) return;
    event.preventDefault();
    hoverOpened.current = null;
  }

  return (
    // Delegated listeners, not a control: the controls are the native
    // <summary> rows inside, which the keyboard already operates.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- delegation to native <summary>; see above
    <div
      className={className}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
