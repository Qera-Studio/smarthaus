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
  shuffle,
  FRAME_MS,
  SHUFFLE_MS,
  SHUFFLE_SHARE,
  SPIN,
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

describe("shuffle", () => {
  test("changes up to the given share of cells, each to a different icon", () => {
    const cells = scramble(1000, 8, seeded(2));
    const before = Uint8Array.from(cells);
    const changed = shuffle(cells, 8, 0.05, seeded(5));
    expect(changed.length).toBeGreaterThan(40);
    expect(changed.length).toBeLessThanOrEqual(50);
    expect(new Set(changed).size).toBe(changed.length);
    for (const index of changed) {
      expect(cells[index]).not.toBe(before[index]);
      expect(cells[index]).toBeLessThan(8);
    }
  });

  test("touches nothing outside the indices it reports", () => {
    const cells = scramble(200, 8, seeded(2));
    const before = Uint8Array.from(cells);
    const changed = new Set(shuffle(cells, 8, 0.1, seeded(5)));
    for (let i = 0; i < cells.length; i += 1) {
      if (!changed.has(i)) expect(cells[i]).toBe(before[i]);
    }
  });

  test("changes at least one cell for any positive share", () => {
    const cells = scramble(10, 8, seeded(2));
    expect(shuffle(cells, 8, 0.001, seeded(5)).length).toBe(1);
  });

  test("does nothing with fewer than two icons, or no cells", () => {
    const cells = scramble(10, 1, seeded(2));
    expect(shuffle(cells, 1, 0.5, seeded(5))).toEqual([]);
    expect(shuffle(new Uint8Array(0), 8, 0.5, seeded(5))).toEqual([]);
  });

  test("is deterministic for a generator", () => {
    const a = scramble(100, 8, seeded(2));
    const b = Uint8Array.from(a);
    expect(shuffle(a, 8, 0.1, seeded(3))).toEqual(shuffle(b, 8, 0.1, seeded(3)));
    expect(a).toEqual(b);
  });
});

describe("createGlyphLayer", () => {
  interface FakeContext {
    clearRect: jest.Mock;
    drawImage: jest.Mock;
    setTransform: jest.Mock;
  }
  let contexts: FakeContext[];

  beforeEach(() => {
    contexts = [];
    HTMLCanvasElement.prototype.getContext = jest.fn(() => {
      const ctx: FakeContext = {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        setTransform: jest.fn(),
      };
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

  /** One record per drawn icon: which image, its centre, and its angle. */
  const drawn = (ctx: FakeContext | undefined) => {
    const transforms = (ctx?.setTransform.mock.calls ?? []) as number[][];
    const images = (ctx?.drawImage.mock.calls ?? []) as [
      { id: number },
      number,
      number,
      number,
      number,
    ][];
    // The last setTransform is the reset; the rest pair with the draws.
    return images.map(([image, x, y, w, h], i) => {
      const [a, b, , , cx, cy] = transforms[i] ?? [];
      return {
        id: image.id,
        cx: cx ?? -1,
        cy: cy ?? -1,
        angle: Math.atan2(b ?? 0, a ?? 1),
        x,
        y,
        w,
        h,
      };
    });
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

  test("resize sizes the canvas and draws one icon per cell, about the cell's centre", () => {
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
      // Drawn about the origin of a transform placed at the cell's centre.
      expect(r.x).toBe(-ICON);
      expect(r.y).toBe(-ICON);
      expect((r.cx - cell / 2) % cell).toBe(0);
      expect((r.cy - cell / 2) % cell).toBe(0);
    }
    // The transform is put back after the pass.
    expect(contexts[0]?.setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);
  });

  test("uses every icon, scrambled rather than in order", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(1120, 560, []);
    const ids = drawn(contexts[0]).map((r) => r.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids.slice(0, 8)).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test("every icon starts at its own angle", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 300, []);
    const angles = drawn(contexts[0]).map((r) => r.angle.toFixed(3));
    expect(new Set(angles).size).toBeGreaterThan(angles.length / 2);
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
      const x = r.cx - CELL / 2;
      const y = r.cy - CELL / 2;
      const touches =
        x < quiet.x + quiet.width &&
        x + CELL > quiet.x &&
        y < quiet.y + quiet.height &&
        y + CELL > quiet.y;
      expect(touches).toBe(false);
    }
  });

  test("the same size lays out the same way twice", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    const first = drawn(contexts[0]);
    contexts[0]?.drawImage.mockClear();
    contexts[0]?.setTransform.mockClear();
    layer.resize(600, 400, []);
    expect(drawn(contexts[0])).toEqual(first);
  });

  test("update redraws at most every FRAME_MS and reports it", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    const ctx = contexts[0];
    ctx?.clearRect.mockClear();
    expect(layer.update(100)).toBe(true);
    expect(layer.update(100 + FRAME_MS / 2)).toBe(false);
    expect(layer.update(100 + FRAME_MS)).toBe(true);
    expect(ctx?.clearRect).toHaveBeenCalledTimes(2);
  });

  test("between draws the icons turn, each at its own speed, and none moves", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    const ctx = contexts[0];
    ctx?.drawImage.mockClear();
    ctx?.setTransform.mockClear();
    layer.update(1000);
    const at1 = drawn(ctx);
    ctx?.drawImage.mockClear();
    ctx?.setTransform.mockClear();
    layer.update(2000);
    const at2 = drawn(ctx);
    expect(at2.map((r) => [r.cx, r.cy])).toEqual(at1.map((r) => [r.cx, r.cy]));
    const deltas = at2.map((r, i) => {
      let delta = r.angle - (at1[i]?.angle ?? 0);
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      return delta;
    });
    // One second on: every delta is within the spin limit, and they differ.
    for (const delta of deltas) expect(Math.abs(delta)).toBeLessThanOrEqual(SPIN + 1e-6);
    expect(new Set(deltas.map((d) => d.toFixed(2))).size).toBeGreaterThan(deltas.length / 2);
    // Some turn one way and some the other.
    expect(deltas.some((d) => d > 0.05)).toBe(true);
    expect(deltas.some((d) => d < -0.05)).toBe(true);
  });

  test("a shuffle tick changes a few icons; a plain frame changes none", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(1120, 560, []);
    const ctx = contexts[0];
    ctx?.drawImage.mockClear();
    ctx?.setTransform.mockClear();
    layer.update(10);
    const cellCount = Math.ceil(1120 / CELL) * Math.ceil(560 / CELL);
    const before = drawn(ctx).map((r) => r.id);
    ctx?.drawImage.mockClear();
    ctx?.setTransform.mockClear();
    layer.update(10 + FRAME_MS);
    const sameTick = drawn(ctx).map((r) => r.id);
    expect(sameTick).toEqual(before);
    ctx?.drawImage.mockClear();
    ctx?.setTransform.mockClear();
    layer.update(SHUFFLE_MS + 10);
    const nextTick = drawn(ctx).map((r) => r.id);
    const changed = nextTick.filter((id, i) => id !== before[i]).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThanOrEqual(Math.round(cellCount * SHUFFLE_SHARE) + 1);
  });

  test("with one icon the field still turns", () => {
    const layer = createGlyphLayer({ icons: icons(1), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(600, 400, []);
    expect(layer.update(SHUFFLE_MS * 2)).toBe(true);
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

  test("a resize restarts the clock, so the next update draws at once", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(300, 200, []);
    expect(layer.update(5000)).toBe(true);
    expect(layer.update(5000)).toBe(false);
    layer.resize(300, 200, []);
    expect(layer.update(5000)).toBe(true);
  });

  test("every icon's centre is inside the canvas", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 2 });
    if (!layer) throw new Error("no layer");
    layer.resize(500, 300, []);
    for (const r of drawn(contexts[0])) {
      expect(r.cx).toBeGreaterThan(0);
      expect(r.cy).toBeGreaterThan(0);
      expect(r.cx).toBeLessThan(Math.ceil(500 / (CELL * 2)) * CELL * 2);
      expect(r.cy).toBeLessThan(Math.ceil(300 / (CELL * 2)) * CELL * 2);
    }
  });

  test("quiet cells stay quiet through shuffles and turns", () => {
    const layer = createGlyphLayer({ icons: icons(4), dpr: 1 });
    if (!layer) throw new Error("no layer");
    const quiet: Rect = { x: 100, y: 50, width: 120, height: 60 };
    layer.resize(400, 200, [quiet]);
    for (let tick = 1; tick <= 5; tick += 1) {
      contexts[0]?.drawImage.mockClear();
      contexts[0]?.setTransform.mockClear();
      layer.update(SHUFFLE_MS * tick + 1);
      for (const r of drawn(contexts[0])) {
        const x = r.cx - CELL / 2;
        const y = r.cy - CELL / 2;
        const touches =
          x < quiet.x + quiet.width &&
          x + CELL > quiet.x &&
          y < quiet.y + quiet.height &&
          y + CELL > quiet.y;
        expect(touches).toBe(false);
      }
    }
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

describe("shuffle, over many ticks", () => {
  test("never leaves a cell with the icon it had", () => {
    const cells = scramble(500, 8, seeded(6));
    const random = seeded(12);
    for (let tick = 0; tick < 50; tick += 1) {
      const before = Uint8Array.from(cells);
      for (const index of shuffle(cells, 8, 0.05, random)) {
        expect(cells[index]).not.toBe(before[index]);
      }
    }
  });

  test("reaches every icon over time", () => {
    const cells = scramble(200, 8, seeded(6));
    const seen = new Set<number>();
    const random = seeded(12);
    for (let tick = 0; tick < 100; tick += 1) {
      for (const index of shuffle(cells, 8, 0.05, random)) seen.add(cells[index] ?? -1);
    }
    expect(seen.size).toBe(8);
  });

  test("the share rounds to the nearest whole cell", () => {
    expect(shuffle(scramble(10, 8, seeded(1)), 8, 0.14, seeded(2))).toHaveLength(1);
    expect(shuffle(scramble(10, 8, seeded(1)), 8, 0.16, seeded(2))).toHaveLength(2);
  });
});

describe("shuffle, re-picked cells", () => {
  test("a cell picked twice in one tick is changed once and reported once", () => {
    // A generator that keeps landing on the same cell (3 of 20), and on a
    // different icon than the one there.
    const cells = scramble(20, 8, seeded(1));
    const before = Uint8Array.from(cells);
    const changed = shuffle(cells, 8, 0.5, () => 3 / 20);
    expect(changed).toEqual([3]);
    expect(cells[3]).not.toBe(before[3]);
    for (let i = 0; i < cells.length; i += 1) if (i !== 3) expect(cells[i]).toBe(before[i]);
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

describe("the spin", () => {
  interface FakeContext {
    clearRect: jest.Mock;
    drawImage: jest.Mock;
    setTransform: jest.Mock;
  }
  let contexts: FakeContext[];

  beforeEach(() => {
    contexts = [];
    HTMLCanvasElement.prototype.getContext = jest.fn(() => {
      const ctx: FakeContext = {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        setTransform: jest.fn(),
      };
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

  test("FRAME_MS is about thirty frames a second, and SPIN under a turn every few seconds", () => {
    expect(FRAME_MS).toBeGreaterThanOrEqual(1000 / 40);
    expect(FRAME_MS).toBeLessThanOrEqual(1000 / 25);
    expect(SPIN).toBeGreaterThan(0);
    expect(SPIN).toBeLessThan(Math.PI);
  });

  test.each([
    [300, 200],
    [1120, 560],
    [402, 900],
  ])("at %sx%s, every transform is a pure rotation about the cell centre", (w, h) => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(w, h, []);
    layer.update(700);
    const transforms = (contexts[0]?.setTransform.mock.calls ?? []) as number[][];
    for (const [a, b, c, d] of transforms) {
      // cos, sin, -sin, cos: a unit rotation, no scale or shear.
      expect((a ?? 0) * (a ?? 0) + (b ?? 0) * (b ?? 0)).toBeCloseTo(1, 5);
      expect(c).toBeCloseTo(-(b ?? 0), 5);
      expect(d).toBeCloseTo(a ?? 0, 5);
    }
  });

  test("a frame without a shuffle tick still redraws, so the turn is continuous", () => {
    const layer = createGlyphLayer({ icons: icons(8), dpr: 1 });
    if (!layer) throw new Error("no layer");
    layer.resize(300, 200, []);
    const ctx = contexts[0];
    ctx?.clearRect.mockClear();
    layer.update(10);
    layer.update(10 + FRAME_MS);
    layer.update(10 + FRAME_MS * 2);
    expect(ctx?.clearRect).toHaveBeenCalledTimes(3);
  });
});
