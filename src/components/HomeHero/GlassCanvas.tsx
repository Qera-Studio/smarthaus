"use client";

import { useEffect, useRef } from "react";

import type { Glass } from "./glass";
import styles from "./HomeHero.module.scss";

/**
 * The client island of the hero's ground: the reeded glass over the ring
 * picture, drawn on WebGL, and the glow that follows a mouse behind it.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE THIRD CANVAS EXCEPTION, taken over from the fluid hero. CLAUDE.md
 * records why, and the guarantees below are what it is conditional on. Re-read
 * that section before changing this file.
 * ---------------------------------------------------------------------------
 *
 * 1. There is no loop. One frame is drawn when the picture and the shader have
 *    loaded, one on a resize, and one per frame while a mouse is moving over
 *    the glass or the glow is fading in or out (GLOW_FADE_MS). A still pointer
 *    costs nothing, and a touch screen only ever draws the first frame.
 * 2. prefers-reduced-motion is gated HERE: the glass is drawn, still, and the
 *    glow never is. _reset.scss cannot stop a requestAnimationFrame.
 * 3. Save-Data loads nothing: the shader is its own chunk, fetched only past
 *    that gate.
 * 4. Any failure keeps the CSS ground (the same picture under drawn lines).
 *    The section never depends on this, and the canvas shows only once its
 *    first frame is drawn (data-ready).
 */

interface Connection {
  saveData?: boolean;
}

/** Above this the pixel cost doubles for no visible gain on a soft field. */
const MAX_DPR = 2;
/** How long the glow takes to come and go, so it never snaps. */
export const GLOW_FADE_MS = 200;

export function GlassCanvas({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.closest<HTMLElement>("[data-hero]");
    if (!canvas || !section) return;

    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData) return;

    const glows =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const picture = new Image();
      picture.src = src;
      const [{ createGlass, reedWidth }] = await Promise.all([import("./glass"), picture.decode()]);
      if (disposed) return;

      const gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
      });
      if (!gl) return;

      const glass = createGlass(gl, picture, picture.naturalWidth / picture.naturalHeight);
      cleanup = attach(canvas, section, glass, reedWidth, glows);
    };

    start().catch((error: unknown) => {
      // Outside React's error boundary, so an unlogged failure is a silent
      // CSS ground with no clue why.
      console.error("[hero] glass failed", error);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [src]);

  return <canvas ref={ref} className={styles.glass} aria-hidden="true" />;
}

/** Listeners, the observer and the frames. Returns what undoes all of it. */
function attach(
  canvas: HTMLCanvasElement,
  section: HTMLElement,
  glass: Glass,
  reedWidth: (width: number) => number,
  glows: boolean,
) {
  let frame = 0;
  let previous = 0;
  // The glow's strength now, and where it is heading.
  let level = 0;
  let target = 0;
  // The pointer, in CSS pixels from the canvas's top left.
  let x = 0;
  let y = 0;

  const draw = () => {
    // Device pixels per CSS pixel, as the backing store came out.
    const scale = canvas.width / Math.max(1, canvas.clientWidth);
    glass.draw({
      width: canvas.width,
      height: canvas.height,
      reed: reedWidth(canvas.clientWidth) * scale,
      pointerX: x * scale,
      pointerY: y * scale,
      glow: level,
    });
  };

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
    }
    draw();
  };

  const tick = (now: number) => {
    const step = (now - previous) / GLOW_FADE_MS;
    previous = now;
    level = target > level ? Math.min(target, level + step) : Math.max(target, level - step);
    draw();
    frame = level === target ? 0 : requestAnimationFrame(tick);
  };

  const wake = () => {
    if (frame) return;
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  };

  // Where the pointer is, not where it was: no easing on the position. Heard
  // on the window, since the glass runs the screen's full width and the
  // section is only the page's column: on a wide screen the glow stopped at
  // the column's edge (found 2026-11-14). Lit while the pointer is over the
  // glass, out once it is anywhere else.
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    const over =
      event.clientX >= rect.left &&
      event.clientX < rect.right &&
      event.clientY >= rect.top &&
      event.clientY < rect.bottom;
    if (over) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }
    const next = over ? 1 : 0;
    if (!over && next === target) return;
    target = next;
    wake();
  };
  // The pointer has left the window.
  const onLeave = () => {
    target = 0;
    wake();
  };
  // ponytail: a lost context falls back to the CSS ground until the next full
  // load; restore it here if that ever shows up in the field.
  const onLost = () => {
    delete section.dataset["ready"];
  };

  fit();
  section.dataset["ready"] = "";

  if (glows) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  canvas.addEventListener("webglcontextlost", onLost);

  // Deferred a frame: resizing the backing store inside the callback is a
  // layout change in the same pass, which WebKit reports as "ResizeObserver
  // loop completed with undelivered notifications" (FluidCanvas has the
  // history).
  let refit = 0;
  const observer = new ResizeObserver(() => {
    if (refit) return;
    refit = requestAnimationFrame(() => {
      refit = 0;
      fit();
    });
  });
  observer.observe(canvas);

  return () => {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(refit);
    observer.disconnect();
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("webglcontextlost", onLost);
    delete section.dataset["ready"];
    glass.dispose();
  };
}
