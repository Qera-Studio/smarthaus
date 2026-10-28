"use client";

import { useRef, useState } from "react";

/**
 * The image strip's pause button. The strip moves on its own for longer than
 * five seconds, so WCAG 2.2.2 needs a way to stop it that is not hover: a
 * keyboard or touch user has none.
 *
 * The state reaches CSS as data-paused on the strip, which the button sits
 * inside. The stylesheet hides the button under reduced motion, where the
 * strip never moves.
 */
export function CarouselPause({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  function toggle() {
    const next = !paused;
    setPaused(next);
    ref.current?.parentElement?.toggleAttribute("data-paused", next);
  }

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-label="Pause the images"
      aria-pressed={paused}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        {paused ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h3v14H7zM14 5h3v14h-3z" />}
      </svg>
    </button>
  );
}
