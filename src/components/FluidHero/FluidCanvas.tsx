"use client";

import { useEffect, useRef } from "react";
import { latestEntry } from "@/lib/observer";

import type { Fluid, Vec3 } from "./fluid";
import styles from "./FluidHero.module.scss";

/**
 * The client island of the fluid hero: gates, the dynamic import of the
 * simulation, sizing, pointer input and the frame loop. Everything with words
 * in it is in FluidHero.tsx, so this is the only code the section ships to the
 * browser.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE THIRD rAF EXCEPTION. CLAUDE.md records why alongside the other
 * two, and the guarantees below are what it is conditional on. Re-read that
 * section before changing this file.
 * ---------------------------------------------------------------------------
 *
 * 1. prefers-reduced-motion is gated HERE. The _reset.scss reduced-motion
 *    block zeroes CSS durations and does nothing to a rAF loop.
 * 2. Save-Data and slow connections keep the static gradient and load nothing:
 *    the simulation is its own chunk, fetched only past every gate.
 * 3. The loop runs only while the section is on screen and the tab visible,
 *    and stops by itself once the ink has faded.
 * 4. Any failure keeps the CSS gradient. The section never depends on this.
 */

interface Connection {
  saveData?: boolean;
  effectiveType?: string;
}

/** Above this the pixel cost doubles for no visible gain on a soft field. */
const MAX_DPR = 2;
/** Longest frame the simulation is asked to integrate, in seconds. */
const MAX_DT = 1 / 30;

export function FluidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.closest<HTMLElement>("[data-hero]");
    if (!canvas || !section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData || /(^|[^4-9])[23]g$/.test(connection?.effectiveType ?? "")) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const { createFluid } = await import("./fluid");
      if (disposed) return;

      const gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      });
      if (!gl) return;

      // The two brand tokens, read from CSS so this file holds no colours.
      const computed = getComputedStyle(section);
      const fluid = createFluid(gl, {
        ground: parseHex(computed.getPropertyValue("--brown-100")),
        ink: parseHex(computed.getPropertyValue("--brown-800")),
      });
      if (!fluid) return;

      cleanup = attach(canvas, section, fluid);
    };

    start().catch((error: unknown) => {
      // Outside React's error boundary, so an unlogged failure is a silent
      // static gradient with no clue why. Same treatment as the villa.
      console.error("[hero] fluid failed", error);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}

/** Listeners, observers and the loop. Returns the function that undoes all of it. */
function attach(canvas: HTMLCanvasElement, section: HTMLElement, fluid: Fluid) {
  let frame = 0;
  let previous = 0;
  let visible = false;
  let last: { x: number; y: number } | undefined;

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    // A resize rebuilds every target and so wipes the field: only for a real
    // change, never for the notification ResizeObserver sends on observe().
    if (width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    fluid.resize(width, height);
    fluid.draw();
  };

  const tick = (now: number) => {
    const dt = Math.min((now - previous) / 1000, MAX_DT);
    previous = now;
    fluid.step(dt);
    fluid.draw();
    frame = fluid.active && visible && !document.hidden ? requestAnimationFrame(tick) : 0;
  };

  const wake = () => {
    if (frame || !visible || document.hidden) return;
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const sleep = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (event.clientX - rect.left) / rect.width;
    // GL's y runs upward; the pointer's runs downward.
    const y = 1 - (event.clientY - rect.top) / rect.height;
    fluid.splat(x, y, last ? x - last.x : 0, last ? y - last.y : 0);
    last = { x, y };
    wake();
  };
  const onLeave = () => {
    last = undefined;
  };
  // A finger arriving is a fresh contact, not a continuation of the last one.
  const onDown = (event: PointerEvent) => {
    last = undefined;
    onMove(event);
  };
  const onVisibility = () => (document.hidden ? sleep() : wake());

  fit();
  section.dataset["ready"] = "";

  section.addEventListener("pointermove", onMove, { passive: true });
  section.addEventListener("pointerdown", onDown, { passive: true });
  section.addEventListener("pointerleave", onLeave);
  section.addEventListener("pointercancel", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  // Deferred a frame: resizing the backing store inside the callback is a
  // layout change in the same pass, which WebKit reports as "ResizeObserver
  // loop completed with undelivered notifications" (seen on iPhone in e2e).
  let refit = 0;
  const ro = new ResizeObserver(() => {
    if (refit) return;
    refit = requestAnimationFrame(() => {
      refit = 0;
      fit();
    });
  });
  ro.observe(canvas);

  const io = new IntersectionObserver((entries) => {
    visible = latestEntry(entries)?.isIntersecting ?? false;
    if (visible) wake();
    else sleep();
  });
  io.observe(section);

  return () => {
    sleep();
    cancelAnimationFrame(refit);
    io.disconnect();
    ro.disconnect();
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerdown", onDown);
    section.removeEventListener("pointerleave", onLeave);
    section.removeEventListener("pointercancel", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    delete section.dataset["ready"];
    fluid.dispose();
  };
}

/** "#rrggbb" (with any surrounding whitespace) to 0..1 channels. */
export function parseHex(value: string): Vec3 {
  const hex = value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`[hero] expected a #rrggbb colour, got "${hex}"`);
  }
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
