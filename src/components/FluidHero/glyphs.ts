import { HARDWARE_ITEMS } from "@/content/hardware";

/**
 * The layer the liquid reveals: the whole field as a grid of the hardware
 * icons, and on every tick every cell flips to a different one of the eight,
 * so what shows through the pool flickers like a character grid and no icon
 * sits anywhere for longer than a tick. Drawn on an offscreen 2D canvas that
 * fluid.ts uploads as a texture; the display shader reads its alpha and
 * shows it only where the liquid is dark, so the pool acts as a lamp.
 *
 * The grid keeps clear of the copy: small icons under the headline would
 * cost it its contrast, so cells that touch a quiet rect stay empty.
 *
 * Nothing here touches WebGL. The scramble, the quiet mask and the flip
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
  /** On a new tick, flip every cell and redraw. True when the canvas changed. */
  update(now: number): boolean;
  dispose(): void;
}

// --- Calibration -------------------------------------------------------------
// ponytail: fixed constants, tuned by eye on 2026-09-28.

/** Grid pitch in CSS px; the layer scales it by the device pixel ratio. Tight. */
export const CELL = 30;
/** Icon size in CSS px, centred in its cell. */
export const ICON = 18;
/** How often every cell flips, in ms. Nothing stays put longer than this. */
export const TICK_MS = 50;

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
 * Give every cell a different icon from the one it has, chosen at random.
 * Returns false when there is nothing to flip to (fewer than two icons).
 */
export function flip(cells: Uint8Array, iconCount: number, random: () => number): boolean {
  if (iconCount < 2) return false;
  for (let i = 0; i < cells.length; i += 1) {
    const current = cells[i] ?? 0;
    // Any icon but the one already there.
    cells[i] = (current + 1 + Math.floor(random() * (iconCount - 1))) % iconCount;
  }
  return cells.length > 0;
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
  // Each icon rasterised once, at the size it is drawn. An SVG image element
  // is re-rendered from its DOM on every drawImage in WebKit, and the grid
  // draws a few thousand per tick; a bitmap is a copy. An icon whose sprite
  // canvas has no 2D context is drawn from the image, as before.
  const sprites: CanvasImageSource[] = options.icons.map((image) => {
    const sprite = document.createElement("canvas");
    sprite.width = icon;
    sprite.height = icon;
    const sctx = sprite.getContext("2d");
    if (!sctx) return image;
    sctx.drawImage(image, 0, 0, icon, icon);
    return sprite;
  });
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
        const sprite = sprites[cells[index] ?? 0];
        if (sprite) ctx.drawImage(sprite, col * cell + inset, row * cell + inset, icon, icon);
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
      const tick = Math.floor(now / TICK_MS);
      if (tick === lastTick) return false;
      lastTick = tick;
      if (!flip(cells, options.icons.length, random)) return false;
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
