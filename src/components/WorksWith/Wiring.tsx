"use client";

import { ArrowRight } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import type { WorksWithPair } from "../../sanity/types";
import { Button } from "../Button";
import styles from "./WorksWith.module.scss";

export type WiringNode = {
  id: string;
  name: string;
  href: string;
  /** What this page's solution and this one do together. */
  pair: WorksWithPair;
};

type Props = {
  /**
   * This page's solution: its one-line description, and a sentence naming
   * what it pairs with, for the card when the middle is picked.
   */
  centre: { id: string; name: string; line: string; body: string };
  /** The solutions it pairs with, top to bottom: the order the panel cycles in. */
  nodes: WiringNode[];
};

/**
 * Where each tab sits in the column, by how many there are: the middle row,
 * the outer two, or all three, so the drawing is always symmetrical about
 * the middle (Shivanshu, 2026-11-16). The schema allows one to three pairs.
 */
const SLOTS = [["middle"], ["top", "bottom"], ["top", "middle", "bottom"]] as const;

/**
 * The diagram and the panel (WorksWith.tsx has the rest).
 *
 * The middle sits at the diagram's left, the solutions it pairs with as tabs
 * in a column to its right, each joined to it by a wire with one turn at
 * most: the middle tab's straight across, the outer two up or down out of
 * the middle and then across. The geometry is all CSS, from the sizes of the
 * middle, the tabs and the gap between them, so nothing is measured and the
 * server's HTML is already in place. No inline styles: the strict CSP twin
 * would report them.
 *
 * ## Motion, and the pause (WCAG 2.2.2)
 *
 * Once on screen the panel steps through the pairs, a CSS animation's end
 * being the timer, as the hardware carousel's is, and the picked tab's wire
 * fills with a glowing bar in the same time: the timer, drawn. It loops past
 * five seconds, so the pause button stops it. The cycle stops for good once
 * a tab is pointed at, focused or picked, and holds off screen; from then the
 * picked wire is simply lit. Under reduced motion none of it starts, and the
 * button is never shown.
 *
 * ## What a screen reader hears
 *
 * Every panel is in the HTML, stacked in one place, so the panel is as tall
 * as its longest and never jumps; the hidden ones are hidden from everyone.
 * A pick is announced in a polite live region of its own. The cycle is not
 * announced: a reader would hear the panel every few seconds.
 */
export function Wiring({ centre, nodes }: Props) {
  const [selected, setSelected] = useState(nodes[0]?.id ?? centre.id);
  const [motion, setMotion] = useState(false);
  const [took, setTook] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [entrance, setEntrance] = useState<"waiting" | "in" | undefined>();
  const [said, setSaid] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMotion(true);
    // Hidden late, not early: only a diagram still below the screen waits to
    // be drawn in; one already in view stays as the server drew it.
    if (el.getBoundingClientRect().top >= window.innerHeight) setEntrance("waiting");
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]!;
        setInView(entry.isIntersecting);
        if (entry.intersectionRatio >= ENTRANCE_RATIO) {
          setEntrance((now) => (now === "waiting" ? "in" : now));
        }
      },
      { threshold: [0, ENTRANCE_RATIO] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const slots = SLOTS[nodes.length - 1] ?? [];
  const cycle = nodes.map((node) => node.id);
  const cycling = motion && !took && cycle.length > 1;
  const stop = () => setTook(true);

  const pick = (id: string) => {
    setTook(true);
    setSelected(id);
    setSaid(announce(id));
  };

  const announce = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return `${centre.name}: ${centre.line}`;
    return `${node.name}: ${node.pair.title}. ${WHEN} ${node.pair.trigger}. ${THEN} ${node.pair.action}.`;
  };

  // The arrows walk the middle and the tabs, in order; Enter and Space are
  // the buttons' own.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const all = Array.from(root.current!.querySelectorAll<HTMLButtonElement>("[data-node]"));
    const at = all.indexOf(event.currentTarget);
    all[(at + step + all.length) % all.length]!.focus();
  };

  const nodeEvents = {
    onKeyDown,
    onFocus: stop,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") stop();
    },
  };

  return (
    <div
      ref={root}
      className={styles.stage}
      data-entrance={entrance}
      data-paused={paused || !inView ? "" : undefined}
    >
      <div className={styles.diagram}>
        {/* Drawn first; each wire ends at an edge, so nothing paints over another. */}
        <div className={styles.wires} aria-hidden="true">
          {nodes.map((node, i) => {
            const picked = node.id === selected;
            return (
              <span
                key={node.id}
                className={styles.wire}
                data-slot={slots[i]}
                data-lit={picked && !cycling ? "" : undefined}
              >
                {picked && cycling ? (
                  <>
                    {slots[i] === "middle" ? null : <span className={styles.rise} />}
                    <span className={styles.run} />
                  </>
                ) : null}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.centre}
          data-node=""
          aria-pressed={selected === centre.id}
          onClick={() => pick(centre.id)}
          {...nodeEvents}
        >
          <span className={styles.icon} data-icon={centre.id} aria-hidden="true" />
          <span className={styles.centreName}>{centre.name}</span>
        </button>

        <ul className={styles.tabs}>
          {nodes.map((node, i) => (
            <li key={node.id} className={styles.place} data-slot={slots[i]}>
              <button
                type="button"
                className={styles.tab}
                data-node=""
                aria-pressed={selected === node.id}
                aria-label={`${node.name}, works with ${centre.name}`}
                onClick={() => pick(node.id)}
                {...nodeEvents}
              >
                <span className={styles.icon} data-icon={node.id} aria-hidden="true" />
                <span className={styles.label}>{node.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {cycling ? (
          // The timer: keyed on the pick, so each pair gets a fresh run, as
          // the bar on its wire does.
          <span
            key={selected}
            className={styles.timer}
            data-running={inView && !paused ? "" : undefined}
            aria-hidden="true"
            onAnimationEnd={() =>
              setSelected((now) => cycle[(cycle.indexOf(now) + 1) % cycle.length]!)
            }
          />
        ) : null}
      </div>

      <div className={styles.panel}>
        <Variant id={centre.id} selected={selected} label={centre.name} title={centre.line}>
          <p className={styles.body}>{centre.body}</p>
        </Variant>
        {nodes.map((node) => (
          <Variant
            key={node.id}
            id={node.id}
            selected={selected}
            label={node.name}
            title={node.pair.title}
          >
            <p className={styles.chips}>
              <span className={styles.chip}>
                <strong>{WHEN}</strong> {node.pair.trigger}
              </span>
              <ArrowRight className={styles.arrow} size={16} aria-hidden="true" />
              <span className={styles.chip}>
                <strong>{THEN}</strong> {node.pair.action}
              </span>
            </p>
            <p className={styles.body}>{node.pair.body}</p>
            {/* Pinned to the card's foot, whatever is above it (Shivanshu, 2026-11-16). */}
            <div className={styles.cta}>
              <Button href={node.href} variant="inverse" size="sm">
                Explore {node.name}
              </Button>
            </div>
          </Variant>
        ))}

        {motion ? (
          <button
            type="button"
            className={styles.pause}
            aria-label="Pause the animation"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
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
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : null}

        <p className="visually-hidden" aria-live="polite">
          {said}
        </p>
      </div>
    </div>
  );
}

/** How much of the diagram must be on screen before it is drawn in. */
export const ENTRANCE_RATIO = 0.3;

const WHEN = "When";
const THEN = "Then";

function Variant({
  id,
  selected,
  label,
  title,
  children,
}: {
  id: string;
  selected: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.variant} data-panel={id} data-shown={id === selected ? "" : undefined}>
      <p className={styles.panelLabel}>{label}</p>
      <h3 className={styles.panelTitle}>{title}</h3>
      {children}
    </div>
  );
}
