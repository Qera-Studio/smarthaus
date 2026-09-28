import { HARDWARE_ITEMS } from "@/content/hardware";

/**
 * The layer the liquid reveals: the whole field as a grid of the hardware
 * icons, scrambled, with a few cells reassigned every so often so the field
 * shuffles under the pool. Drawn on an offscreen 2D canvas that fluid.ts
 * uploads as a texture; the display shader reads its alpha and shows it only
 * where the liquid is dark, so the pool acts as a lamp.
 *
 * The grid keeps clear of the copy: small icons under the headline would
 * cost it its contrast, so cells that touch a quiet rect stay empty.
 *
 * Nothing here touches WebGL. The scramble, the quiet mask and the shuffle
 * are plain functions so `__tests__/glyphs.test.ts` can pin them without a
 * GPU or an image decoder.
 *
 * Loaded with fluid.ts, by dynamic import, and by nothing else.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GlyphLayer {
  readonly canvas: HTMLCanvasElement;
  /** Lay the grid out for a canvas of this size (device pixels). */
  resize(width: number, height: number, quiet: readonly Rect[]): void;
  /** Shuffle a few cells if a tick has passed. True when the canvas changed. */
  update(now: number): boolean;
  dispose(): void;
}

// --- Calibration -------------------------------------------------------------
// ponytail: fixed constants, tuned by eye on 2026-09-28.

/** Grid pitch in CSS px; the layer scales it by the device pixel ratio. Tight. */
export const CELL = 30;
/** Icon size in CSS px, centred in its cell. */
export const ICON = 18;
/** How often cells are reassigned, in ms. Slow: a shuffle, not a flicker. */
export const SHUFFLE_MS = 700;
/** The share of cells reassigned per tick. */
export const SHUFFLE_SHARE = 0.04;

export const ICON_URLS = HARDWARE_ITEMS.map((item) => `/hero/hardware/icons/${item.icon}`);

/** A small deterministic generator, so a layout is stable for a given size. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    // Park-Miller minimal standard. Plenty for scrambling a grid.
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

/**
 * An icon index for each of `count` cells: every icon appears equally often,
 * in a random order (Fisher-Yates).
 */
export function scramble(count: number, iconCount: number, random: () => number): Uint8Array {
  const cells = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) cells[i] = i % iconCount;
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = cells[i] ?? 0;
    cells[i] = cells[j] ?? 0;
    cells[j] = a;
  }
  return cells;
}

/** 1 for every cell whose box touches a quiet rect, 0 for the rest. */
export function quietCells(
  cols: number,
  rows: number,
  cell: number,
  quiet: readonly Rect[],
): Uint8Array {
  const mask = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * cell;
      const y = row * cell;
      const touches = quiet.some(
        (r) => x < r.x + r.width && x + cell > r.x && y < r.y + r.height && y + cell > r.y,
      );
      if (touches) mask[row * cols + col] = 1;
    }
  }
  return mask;
}

/**
 * Reassign `share` of the cells to a different icon each. Returns the
 * indices it changed, so a caller can tell a real change from a no-op.
 */
export function shuffle(
  cells: Uint8Array,
  iconCount: number,
  share: number,
  random: () => number,
): number[] {
  if (iconCount < 2 || cells.length === 0) return [];
  const changed: number[] = [];
  const count = Math.max(1, Math.round(cells.length * share));
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * cells.length);
    // A cell picked twice in one tick could land back on its old icon.
    if (changed.includes(index)) continue;
    const current = cells[index] ?? 0;
    // Any icon but the one already there.
    const next = (current + 1 + Math.floor(random() * (iconCount - 1))) % iconCount;
    cells[index] = next;
    changed.push(index);
  }
  return changed;
}

export interface GlyphOptions {
  icons: readonly HTMLImageElement[];
  /** Device pixel ratio the layer is drawn at. */
  dpr: number;
}

/**
 * Null when there are no icons or no 2D context (jsdom, a starved device):
 * the liquid then simply reveals nothing, which is the pre-layer design.
 */
export function createGlyphLayer(options: GlyphOptions): GlyphLayer | null {
  if (options.icons.length === 0) return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cell = CELL * options.dpr;
  const icon = ICON * options.dpr;
  const inset = (cell - icon) / 2;
  let cols = 0;
  let rows = 0;
  let cells: Uint8Array = new Uint8Array(0);
  let quiet: Uint8Array = new Uint8Array(0);
  let random = seeded(1);
  let lastTick = -1;

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        if (quiet[index]) continue;
        const image = options.icons[cells[index] ?? 0];
        if (image) ctx.drawImage(image, col * cell + inset, row * cell + inset, icon, icon);
      }
    }
  };

  return {
    canvas,

    resize(width, height, quietRects) {
      canvas.width = width;
      canvas.height = height;
      cols = Math.max(1, Math.ceil(width / cell));
      rows = Math.max(1, Math.ceil(height / cell));
      random = seeded(width * 73856093 + height * 19349663);
      cells = scramble(cols * rows, options.icons.length, random);
      quiet = quietCells(cols, rows, cell, quietRects);
      lastTick = -1;
      draw();
    },

    update(now) {
      const tick = Math.floor(now / SHUFFLE_MS);
      if (tick === lastTick) return false;
      lastTick = tick;
      if (shuffle(cells, options.icons.length, SHUFFLE_SHARE, random).length === 0) return false;
      draw();
      return true;
    },

    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/** The icons that load, in order; the ones that fail are simply left out. */
export function loadIcons(urls: readonly string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = url;
        }),
    ),
  ).then((images) => images.filter((image): image is HTMLImageElement => image !== null));
}
