"use client";

import { useRef } from "react";

import { SERVICE_SHOTS } from "./scenes";
import styles from "./Hero.module.scss";

type ServiceTabsProps = {
  /** The shot currently framed, or "landing" when the tour is at rest. */
  active: string;
  onSelect: (id: string) => void;
  /** Back to the landing shot. */
  onExit: () => void;
};

/**
 * The vertical service rail, as a real ARIA tablist.
 *
 * AGENTS.md specifies `role="tablist"` with arrow-key navigation and
 * Enter/Space to activate, and that the info panel carries indexable text. The
 * panel content is server-rendered by Hero.tsx and passed through, so the copy
 * ships in the HTML and is crawlable whether or not WebGL ever runs.
 *
 * ## Roving tabindex, not tabindex on every tab
 *
 * A tablist is ONE tab stop. Tab moves into the rail and straight out again;
 * the arrow keys move between tabs inside it. Putting every button in the tab
 * order is the common mistake and makes a reader press Tab six times to get
 * past the rail.
 *
 * ## Manual activation
 *
 * Arrow keys move focus but do NOT fly the camera; Enter or Space does. With
 * automatic activation, arrowing from Garage to Lighting would launch four
 * separate two-second flights that each cancel the last. The WAI-ARIA pattern
 * recommends manual activation exactly when switching a tab is expensive.
 */
export function ServiceTabs({ active, onSelect, onExit }: ServiceTabsProps) {
  const rail = useRef<HTMLDivElement>(null);

  const move = (delta: number, from: number) => {
    const next = (from + delta + SERVICE_SHOTS.length) % SERVICE_SHOTS.length;
    const buttons = rail.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      // Both axes: the rail is vertical, but a reader who tries the horizontal
      // arrows should not find nothing happens.
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        move(1, index);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        move(-1, index);
        break;
      case "Home":
        event.preventDefault();
        move(-index, index);
        break;
      case "End":
        event.preventDefault();
        move(SERVICE_SHOTS.length - 1 - index, index);
        break;
      case "Escape":
        // Leaves the tour the same way the Back control does, so a keyboard
        // reader is never stranded inside the explorer.
        event.preventDefault();
        onExit();
        break;
      default:
        break;
    }
  };

  const activeIndex = SERVICE_SHOTS.findIndex((s) => s.id === active);

  return (
    <div
      ref={rail}
      className={styles.tabs}
      role="tablist"
      aria-orientation="vertical"
      aria-label="Explore the villa's automation"
    >
      {SERVICE_SHOTS.map((shot, index) => {
        const selected = shot.id === active;
        return (
          <button
            key={shot.id}
            type="button"
            role="tab"
            id={`shot-tab-${shot.id}`}
            aria-selected={selected}
            aria-controls={`shot-panel-${shot.id}`}
            // Roving: exactly one tab is reachable by Tab. When nothing is
            // selected yet the first tab takes it, which is what the pattern
            // expects on a rail the reader has not entered.
            tabIndex={selected || (activeIndex === -1 && index === 0) ? 0 : -1}
            className={styles.tab}
            onClick={() => onSelect(shot.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {shot.label}
          </button>
        );
      })}
    </div>
  );
}
