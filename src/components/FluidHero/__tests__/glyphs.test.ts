import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CELL,
  createGlyphLayer,
  ICON,
  ICON_URLS,
  loadIcons,
  quietCells,
  scramble,
  seeded,
  flip,
  TICK_MS,
  type Rect,
} from "../glyphs";
import { HARDWARE_ITEMS } from "@/content/hardware";

/**
 * The icon field without an image decoder or a GPU. The scramble, the quiet
 * mask and the shuffle are pure functions and are tested as such; the layer
 * itself is driven against a recording 2D context, because jsdom has none.
 */

describe("ICON_URLS", () => {
  test("is every hardware icon, under the carousel's own directory", () => {
    expect(ICON_URLS).toHaveLength(8);
    for (const url of ICON_URLS) expect(url).toMatch(/^\/hero\/hardware\/icons\/\w+\.svg$/);
    expect(new Set(ICON_URLS).size).toBe(ICON_URLS.length);
  });

  test("every url resolves to a file in public/, so a rename cannot silently empty the field", () => {
    for (const url of ICON_URLS) expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
  });

  test.each(ICON_URLS)("%s is a 24-unit icon with filled paths, so it draws to alpha", (url) => {
    const svg = readFileSync(join(process.cwd(), "public", url), "utf8");
    expect(svg).toMatch(/viewBox="0 0 24 24"/);
    expect(svg).toMatch(/<path/);
    expect(svg).toMatch(/fill="#[0-9a-f]{6}"/i);
  });

  test("the carousel builds the same urls, so the two cannot drift apart", () => {
    const stage = readFileSync(
      join(process.cwd(), "src/components/Hardware/HardwareStage.tsx"),
      "utf8",
    );
    expect(stage).toContain("`/hero/hardware/icons/${item.icon}`");
  });
});

describe("seeded", () => {
  test("is deterministic for a seed and in [0, 1)", () => {
    const a = seeded(42);
    const b = seeded(42);
    for (let i = 0; i < 50; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test("different seeds give different sequences", () => {
    const a = seeded(1);
    const b = seeded(2);
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b));
  });

  test("a zero seed does not get stuck at zero", () => {
    const random = seeded(0);
    expect(random()).not.toBe(random());
  });
});

describe("scramble", () => {
  test("gives every cell an icon in range", () => {
    const cells = scramble(100, 8, seeded(3));
    expect(cells).toHaveLength(100);
    for (const icon of cells) expect(icon).toBeLessThan(8);
  });

  test("uses every icon equally often", () => {
    const cells = scramble(800, 8, seeded(3));
    const counts = new Array<number>(8).fill(0);
    for (const icon of cells) counts[icon] = (counts[icon] ?? 0) + 1;
    expect(counts).toEqual(new Array<number>(8).fill(100));
  });

  test("is not in order: ascending neighbours are rare", () => {
    const cells = scramble(400, 8, seeded(9));
    let runs = 0;
    for (let i = 1; i < cells.length; i += 1) if (cells[i] === (cells[i - 1] ?? 0) + 1) runs += 1;
    expect(runs).toBeLessThan(cells.length / 4);
  });

  test("is deterministic for a seed", () => {
    expect(scramble(50, 8, seeded(7))).toEqual(scramble(50, 8, seeded(7)));
    expect(scramble(50, 8, seeded(7))).not.toEqual(scramble(50, 8, seeded(8)));
  });

  test("handles a single icon and no cells", () => {
    expect([...scramble(5, 1, seeded(1))]).toEqual([0, 0, 0, 0, 0]);
    expect(scramble(0, 8, seeded(1))).toHaveLength(0);
  });
});

describe("quietCells", () => {
  test("marks exactly the cells a rect touches", () => {
    // 4x3 grid of 10px cells; a rect over the middle two columns, top row.
    const mask = quietCells(4, 3, 10, [{ x: 12, y: 2, width: 15, height: 5 }]);
    expect([...mask]).toEqual([0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  test("a rect on a cell boundary touches only the cells it overlaps", () => {
    const mask = quietCells(3, 1, 10, [{ x: 10, y: 0, width: 10, height: 10 }]);
    expect([...mask]).toEqual([0, 1, 0]);
  });

  test("no rects means no quiet cells", () => {
    expect([...quietCells(3, 2, 10, [])]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test("several rects union", () => {
    const mask = quietCells(3, 1, 10, [
      { x: 0, y: 0, width: 5, height: 5 },
      { x: 25, y: 0, width: 5, height: 5 },
    ]);
    expect([...mask]).toEqual([1, 0, 1]);
  });

  test("a rect covering everything quiets everything", () => {
    const mask = quietCells(2, 2, 10, [{ x: -5, y: -5, width: 100, height: 100 }]);
    expect([...mask]).toEqual([1, 1, 1, 1]);
  });
});

describe("loadIcons", () => {
  let images: { src: string; onload?: () => void; onerror?: () => void }[];

  beforeEach(() => {
    images = [];
    class FakeImage {
      onload?: () => void;
      onerror?: () => void;
      private value = "";
      set src(value: string) {
        this.value = value;
        images.push(this);
      }
      get src() {
        return this.value;
      }
    }
    Object.defineProperty(window, "Image", { configurable: true, value: FakeImage });
  });

  test("resolves the icons that load, in order, and drops the ones that fail", async () => {
    const pending = loadIcons(["/a.svg", "/b.svg", "/c.svg"]);
    expect(images.map((image) => image.src)).toEqual(["/a.svg", "/b.svg", "/c.svg"]);
    images[2]?.onload?.();
    images[1]?.onerror?.();
    images[0]?.onload?.();
    const loaded = await pending;
    expect(loaded.map((image) => (image as unknown as { src: string }).src)).toEqual([
      "/a.svg",
      "/c.svg",
    ]);
  });

  test("resolves to nothing when every icon fails", async () => {
    const pending = loadIcons(["/a.svg"]);
    images[0]?.onerror?.();
    expect(await pending).toEqual([]);
  });

  test("resolves to nothing for no urls", async () => {
    expect(await loadIcons([])).toEqual([]);
  });
});

describe("the grid geometry", () => {
  test("the icon fits its cell with a margin on every side", () => {
    expect(ICON).toBeLessThan(CELL);
    expect((CELL - ICON) / 2).toBeGreaterThanOrEqual(4);
  });

  test.each([
    ["desktop", 1440, 1553, 2],
    ["iPhone 17", 402, 1300, 2],
    ["Galaxy S24", 360, 1200, 2],
  ])("%s: the grid covers the whole canvas, edge to edge", (_name, w, h, dpr) => {
    const cell = CELL * dpr;
    const cols = Math.ceil((w * dpr) / cell);
    const rows = Math.ceil((h * dpr) / cell);
    expect(cols * cell).toBeGreaterThanOrEqual(w * dpr);
    expect(rows * cell).toBeGreaterThanOrEqual(h * dpr);
    expect((cols - 1) * cell).toBeLessThan(w * dpr);
    expect((rows - 1) * cell).toBeLessThan(h * dpr);
  });

  test.each([
    ["desktop", 1440, 1553, { x: 300, y: 690, width: 840, height: 300 }],
    ["iPhone 17", 402, 1300, { x: 20, y: 680, width: 362, height: 320 }],
    ["Galaxy S24", 360, 1200, { x: 16, y: 620, width: 328, height: 300 }],
  ])("%s: the copy quiets a minority of the cells", (_name, w, h, quiet) => {
    const dpr = 2;
    const cell = CELL * dpr;
    const cols = Math.ceil((w * dpr) / cell);
    const rows = Math.ceil((h * dpr) / cell);
    const box = {
      x: quiet.x * dpr,
      y: quiet.y * dpr,
      width: quiet.width * dpr,
      height: quiet.height * dpr,
    };
    const mask = quietCells(cols, rows, cell, [box]);
    const quietCount = mask.reduce((sum, v) => sum + v, 0);
    expect(quietCount).toBeGreaterThan(0);
    expect(quietCount).toBeLessThan(mask.length / 2);
  });
});

describe("scramble, uneven counts", () => {
  test("a count that does not divide by the icons differs by at most one per icon", () => {
    const cells = scramble(803, 8, seeded(4));
    const counts = new Array<number>(8).fill(0);
    for (const icon of cells) counts[icon] = (counts[icon] ?? 0) + 1;
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  test("fewer cells than icons still uses distinct icons", () => {
    const cells = scramble(3, 8, seeded(4));
    expect(new Set(cells).size).toBe(3);
  });
});

describe("ICON_URLS and the carousel content", () => {
  test("follow HARDWARE_ITEMS in order, one url per item", () => {
    expect(ICON_URLS).toHaveLength(HARDWARE_ITEMS.length);
    HARDWARE_ITEMS.forEach((item, i) => {
      expect(ICON_URLS[i]).toBe(`/hero/hardware/icons/${item.icon}`);
    });
  });

  test("every item's icon name is a plain svg filename", () => {
    for (const item of HARDWARE_ITEMS) expect(item.icon).toMatch(/^[A-Za-z]+\.svg$/);
  });
});

describe("flip", () => {
  test("gives every cell a different icon, in range", () => {
    const cells = scramble(500, 8, seeded(2));
    const before = Uint8Array.from(cells);
    expect(flip(cells, 8, seeded(5))).toBe(true);
    for (let i = 0; i < cells.length; i += 1) {
      expect(cells[i]).not.toBe(before[i]);
      expect(cells[i]).toBeLessThan(8);
    }
  });

  test("over many ticks every cell shows every icon", () => {
    const cells = scramble(64, 8, seeded(3));
    const seen = Array.from({ length: 64 }, () => new Set<number>());
    const random = seeded(9);
    for (let tick = 0; tick < 200; tick += 1) {
      flip(cells, 8, random);
      cells.forEach((icon, i) => seen[i]?.add(icon));
    }
    for (const set of seen) expect(set.size).toBe(8);
  });

  test("with two icons it alternates", () => {
    const cells = scramble(6, 2, seeded(1));
    const before = Uint8Array.from(cells);
    flip(cells, 2, seeded(4));
    expect([...cells]).toEqual([...before].map((v) => 1 - v));
  });

  test("does nothing, and says so, with fewer than two icons", () => {
    const cells = scramble(10, 1, seeded(2));
    expect(flip(cells, 1, seeded(5))).toBe(false);
    expect([...cells]).toEqual(new Array<number>(10).fill(0));
  });

  test("an empty grid flips to nothing", () => {
    expect(flip(new Uint8Array(0), 8, seeded(5))).toBe(false);
  });

  test("is deterministic for a generator", () => {
    const a = scramble(100, 8, seeded(2));
    const b = Uint8Array.from(a);
    flip(a, 8, seeded(3));
    flip(b, 8, seeded(3));
    expect(a).toEqual(b);
  });
});

describe("createGlyphLayer", () => {
  interface FakeContext {
    canvas: HTMLCanvasElement;
    clearRect: jest.Mock;
    drawImage: jest.Mock;
  }
  let contexts: FakeContext[];

  beforeEach(() => {
    contexts = [];
    HTMLCanvasElement.prototype.getContext = jest.fn(function (this: HTMLCanvasElement) {
      const ctx: FakeContext = { canvas: this, clearRect: jest.fn(), drawImage: jest.fn() };
      contexts.push(ctx);
      return ctx as unknown as RenderingContext;
    }) as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const icons = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      width: 24,
      height: 24,
    })) as unknown as HTMLImageElement[];
  // What the layer draws is a sprite canvas per icon, rasterised once at
  // creation; this follows a sprite back to the icon it was drawn from.
  type Source = { id: number } | HTMLCanvasElement;
  const iconOf = (source: Source): number => {
    if (!(source instanceof HTMLCanvasElement)) return source.id;
    const sprite = contexts.find((c) => c.canvas === source);
    const [image] = (sprite?.drawImage.mock.calls[0] ?? []) as [{ id: number }?];
    if (!image) throw new Error("drawn from a canvas that is not an icon sprite");
    return image.id;
  };
  const drawn = (ctx: FakeContext | undefined) =>
    ((ctx?.drawImage.mock.calls ?? []) as [Source, number, number, number, number][]).map(
      ([source, x, y, w, h]) => ({ id: iconOf(source), x, y, w, h }),
    );
  const clear = (ctx: FakeContext | undefined) => {
    ctx?.drawImage.mockClear();
    ctx?.clearRect.mockClear();
  };

  test("is null without icons, and allocates nothing", () => {
    expect(createGlyphLayer({ icons: [], dpr: 1 })).toBeNull();
    expect(contexts).toHaveLength(0);
  });

  test("is null without a 2D context", () => {
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => null,
    ) as typeof HTMLCanvasElement.prototype.getContext;
    expect(createGlyphLayer({ icons: icons(2), dpr: 1 })).toBeNull();
  });

  test("rasterises each icon once, at the drawn size, and draws the grid from those", () => {
    const layer = createGlyphLayer({ icons: icons(3), dpr: 2 });
    if (!layer) throw new Error("no layer");
    // The layer's own context, then one per icon.
    expect(contexts).toHaveLength(4);
    for (const sprite of contexts.slice(1)) {
      expect(sprite.canvas.width).toBe(ICON * 2);
      expect(sprite.canvas.height).toBe(ICON * 2);
      expect(sprite.drawImage).toHaveBeenCalledTimes(1);
      expect(sprite.drawImage.mock.calls[0]?.slice(1)).toEqual([0, 0, ICON * 2, ICON * 2]);
    }
    layer.resize(300, 200, []);
    layer.update(TICK_MS * 3);
    // Every grid draw is from a sprite canvas, never from an image element.
    const sources = contexts[0]?.drawImage.mock.calls.map(([s]) => s as Source) ?? [];
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) expect(s).toBeInstanceOf(HTMLCanvasElement);
    // And the icons were rasterised once: no sprite was drawn to again.
    for (const sprite of contexts.slice(1)) expect(sprite.drawImage).toHaveBeenCalledTimes(1);
  });

  test("draws an icon from the image itself when its sprite has no context", () => {
    let calls = 0;
    HTMLCanvasElement.prototype.getContext = jest.fn(function (this: HTMLCanvasElement) {
      calls += 1;
      // The layer's context, then the first sprite's, then nothing.
      if (calls > 2) return null;
      const ctx: FakeContext = { canvas: this, clearRect: jest.fn(), drawImage: jest.fn() };
      contexts.push(ctx);
      return ctx as unknown as RenderingContext;
    }) as typeof HTMLCanvasElement.prototype.getContext;
    const layer = createGlyphLayer({ icons: icons(2), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(300, 200, []);
    const sources = contexts[0]?.drawImage.mock.calls.map(([s]) => s as Source) ?? [];
    expect(sources.some((s) => s instanceof HTMLCanvasElement)).toBe(true);
    expect(sources.some((s) => !(s instanceof HTMLCanvasElement) && s.id === 1)).toBe(true);
    expect(
      drawn(contexts[0])
        .map((r) => r.id)
        .sort(),
    ).toEqual(expect.arrayContaining([0, 1]));
  });

  test("resize sizes the canvas and draws one icon per cell, centred, at the icon size", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 2 });
    if (!layer) throw new Error("no layer");
    layer.resize(1120, 560, []);
    expect(layer.canvas.width).toBe(1120);
    expect(layer.canvas.height).toBe(560);
    const cell = CELL * 2;
    const records = drawn(contexts[0]);
    expect(records).toHaveLength(Math.ceil(1120 / cell) * Math.ceil(560 / cell));
    expect(contexts[0]?.clearRect).toHaveBeenCalledWith(0, 0, 1120, 560);
    for (const r of records) {
      expect(r.w).toBe(ICON * 2);
      expect(r.h).toBe(ICON * 2);
      expect((r.x - (cell - ICON * 2) / 2) % cell).toBe(0);
      expect((r.y - (cell - ICON * 2) / 2) % cell).toBe(0);
    }
  });

  test("uses every icon, scrambled rather than in order", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(1120, 560, []);
    const ids = drawn(contexts[0]).map((r) => r.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids.slice(0, 8)).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test("leaves the cells under a quiet rect empty", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    const quiet: Rect = { x: 200, y: 100, width: 300, height: 150 };
    layer.resize(1120, 560, [quiet]);
    const records = drawn(contexts[0]);
    const total = Math.ceil(1120 / CELL) * Math.ceil(560 / CELL);
    expect(records.length).toBeLessThan(total);
    for (const r of records) {
      const touches =
        r.x < quiet.x + quiet.width &&
        r.x + r.w > quiet.x &&
        r.y < quiet.y + quiet.height &&
        r.y + r.h > quiet.y;
      expect(touches).toBe(false);
    }
  });

  test("the same size lays out the same way twice", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    const first = drawn(contexts[0]);
    clear(contexts[0]);
    layer.resize(600, 400, []);
    expect(drawn(contexts[0])).toEqual(first);
  });

  test("update redraws once per tick and reports it", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    const ctx = contexts[0];
    clear(ctx);
    expect(layer.update(TICK_MS * 0.5)).toBe(true);
    expect(ctx?.clearRect).toHaveBeenCalledTimes(1);
    expect(layer.update(TICK_MS * 0.9)).toBe(false);
    expect(layer.update(TICK_MS * 1.2)).toBe(true);
    expect(ctx?.clearRect).toHaveBeenCalledTimes(2);
  });

  test("every tick changes every icon and moves none", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(1120, 560, []);
    const ctx = contexts[0];
    let previous = drawn(ctx);
    for (let tick = 1; tick <= 5; tick += 1) {
      clear(ctx);
      layer.update(TICK_MS * tick + 1);
      const current = drawn(ctx);
      expect(current.map((r) => [r.x, r.y])).toEqual(previous.map((r) => [r.x, r.y]));
      current.forEach((r, i) => expect(r.id).not.toBe(previous[i]?.id));
      previous = current;
    }
  });

  test("no cell keeps an icon longer than a tick", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(300, 200, []);
    const ctx = contexts[0];
    let previous = drawn(ctx).map((r) => r.id);
    for (let now = TICK_MS; now < TICK_MS * 40; now += TICK_MS) {
      clear(ctx);
      layer.update(now);
      const ids = drawn(ctx).map((r) => r.id);
      expect(ids.some((id, i) => id === previous[i])).toBe(false);
      previous = ids;
    }
  });

  test("with one icon there is nothing to flip to, and update says so", () => {
    const layer = createGlyphLayer({ icons: icons(1), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    expect(layer.update(TICK_MS * 2)).toBe(false);
  });

  test("dispose releases the canvas", () => {
    const layer = createGlyphLayer({ icons: icons(2), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    layer.dispose();
    expect(layer.canvas.width).toBe(0);
    expect(layer.canvas.height).toBe(0);
  });

  test("a tiny field still gets one cell", () => {
    const layer = createGlyphLayer({ icons: icons(2), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(10, 10, []);
    expect(drawn(contexts[0])).toHaveLength(1);
  });

  test("a resize resets the tick, so the next update after it draws", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(300, 200, []);
    expect(layer.update(TICK_MS * 5)).toBe(true);
    expect(layer.update(TICK_MS * 5)).toBe(false);
    layer.resize(300, 200, []);
    expect(layer.update(TICK_MS * 5)).toBe(true);
  });

  test("every icon drawn is inside the canvas", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 2 });
    if (!layer) throw new Error("no layer");
    layer.resize(500, 300, []);
    for (const r of drawn(contexts[0])) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(Math.ceil(500 / (CELL * 2)) * CELL * 2);
      expect(r.y + r.h).toBeLessThanOrEqual(Math.ceil(300 / (CELL * 2)) * CELL * 2);
    }
  });

  test("quiet cells stay quiet through ticks", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 1 });
    if (!layer) throw new Error("no layer");
    const quiet: Rect = { x: 100, y: 50, width: 120, height: 60 };
    layer.resize(400, 200, [quiet]);
    for (let tick = 1; tick <= 5; tick += 1) {
      clear(contexts[0]);
      layer.update(TICK_MS * tick + 1);
      for (const r of drawn(contexts[0])) {
        const touches =
          r.x < quiet.x + quiet.width &&
          r.x + r.w > quiet.x &&
          r.y < quiet.y + quiet.height &&
          r.y + r.h > quiet.y;
        expect(touches).toBe(false);
      }
    }
  });

  test("the tick is short enough that nothing reads as static", () => {
    expect(TICK_MS).toBeLessThanOrEqual(100);
    expect(TICK_MS).toBeGreaterThanOrEqual(1000 / 60);
  });
});
