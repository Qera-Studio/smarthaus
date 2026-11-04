"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { REVEAL_MARGIN } from "../ScrollReveal/ScrollReveal";

/**
 * How long a figure takes to roll up from nothing, and how often it changes.
 * The stylesheet's motion blur (.value[data-rolling]) runs the same length.
 */
export const ROLL_MS = 1600;
export const ROLL_STEP_MS = 33;

/**
 * The list of figures, rolling each up from 0 the first time it comes on screen
 * (Shivanshu, 2026-11-04), fast at first and settling on the number.
 *
 * The figure's real text is never touched. The roll is one attribute,
 * data-roll, which the stylesheet draws over the text while it is there and
 * this takes off at the end; data-rolling blurs it while it runs. A timer, not requestAnimationFrame, which CLAUDE.md
 * keeps to its listed exceptions; the rest of the motion stack cannot count.
 * Never under reduced motion, and without JavaScript the numbers simply stand.
 */
export function RollingFigures({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = list.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const figures = Array.from(el.querySelectorAll<HTMLElement>("[data-stat-value]")).map(
      (figure) => {
        const [, count = "0", suffix = ""] = figure.textContent?.match(/^(\d+)(.*)$/) ?? [];
        figure.setAttribute("data-roll", `0${suffix}`);
        return { figure, target: Number(count), suffix };
      },
    );
    const finish = () =>
      figures.forEach(({ figure }) => {
        figure.removeAttribute("data-roll");
        figure.removeAttribute("data-rolling");
      });

    let timer = 0;
    // On the scroll reveal's line, so the cards and the figures arrive together.
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        seen.disconnect();
        figures.forEach(({ figure }) => figure.setAttribute("data-rolling", ""));
        const start = performance.now();
        timer = window.setInterval(() => {
          const progress = Math.min((performance.now() - start) / ROLL_MS, 1);
          if (progress === 1) {
            window.clearInterval(timer);
            finish();
            return;
          }
          const eased = 1 - (1 - progress) ** 3;
          for (const { figure, target, suffix } of figures) {
            figure.setAttribute("data-roll", `${Math.round(target * eased)}${suffix}`);
          }
        }, ROLL_STEP_MS);
      },
      { rootMargin: REVEAL_MARGIN },
    );
    seen.observe(el);

    return () => {
      seen.disconnect();
      window.clearInterval(timer);
      finish();
    };
  }, []);

  return (
    <ul ref={list} className={className}>
      {children}
    </ul>
  );
}
