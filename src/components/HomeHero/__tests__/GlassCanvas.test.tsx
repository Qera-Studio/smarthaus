import { act, render } from "@testing-library/react";

import { GLOW_FADE_MS, GlassCanvas } from "../GlassCanvas";

/**
 * The hero's glass island: the third canvas exception (CLAUDE.md). What it is
 * conditional on is what is tested: no loop (one frame, then frames only while
 * a mouse moves or the glow fades), no glow under reduced motion or on a touch
 * screen, nothing at all under Save-Data or without WebGL, and everything
 * undone when the hero goes. glass.ts is a stand-in here; glass.test.ts tests
 * the real one against a recording WebGL context.
 */

const draw = jest.fn();
const dispose = jest.fn();
const createGlass = jest.fn<{ draw: jest.Mock; dispose: jest.Mock }, unknown[]>(() => ({
  draw,
  dispose,
}));
jest.mock("../glass", () => ({
  createGlass: (...args: unknown[]) => createGlass(...args),
  reedWidth: (width: number) => width / 24,
}));

let frames: FrameRequestCallback[] = [];
let clock = 1000;
let resized: (() => void) | undefined;
let observerDisconnected = 0;
let decode: () => Promise<void>;
let context: unknown;
let images: { src: string }[] = [];

function environment({
  reducedMotion = false,
  finePointer = true,
  saveData = false,
  dpr = 2,
}: { reducedMotion?: boolean; finePointer?: boolean; saveData?: boolean; dpr?: number } = {}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("reduce") ? reducedMotion : finePointer,
    }),
  });
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: { saveData },
  });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: dpr });
}

beforeEach(() => {
  draw.mockClear();
  dispose.mockClear();
  createGlass.mockClear();
  createGlass.mockImplementation(() => ({ draw, dispose }));
  frames = [];
  clock = 1000;
  resized = undefined;
  observerDisconnected = 0;
  images = [];
  decode = () => Promise.resolve();
  context = { webgl2: true };
  environment();

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.push(cb);
    return frames.length;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  jest.spyOn(performance, "now").mockImplementation(() => clock);

  Object.defineProperty(window, "Image", {
    configurable: true,
    value: class {
      src = "";
      naturalWidth = 512;
      naturalHeight = 288;
      constructor() {
        images.push(this);
      }
      decode() {
        return decode();
      }
    },
  });
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect() {
        observerDisconnected += 1;
      }
    },
  });
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => context as never);
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 1440,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 900,
  });
  jest.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 100,
    right: 1440,
    bottom: 1000,
    width: 1440,
    height: 900,
    x: 0,
    y: 100,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The canvas inside a hero section, as HomeHero renders it, once loaded. */
async function mount(inHero = true) {
  const view = render(
    inHero ? (
      <section data-hero="">
        <GlassCanvas src="/hero/glass/ground.webp" />
      </section>
    ) : (
      <GlassCanvas src="/hero/glass/ground.webp" />
    ),
  );
  // The dynamic import and the picture's decode.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  const section = view.container.querySelector("section");
  const canvas = view.container.querySelector("canvas")!;
  return { ...view, section, canvas };
}

/** Let `ms` pass, then run every frame asked for, stamped with the new time. */
function run(ms: number, stamp = ms) {
  const pending = frames;
  frames = [];
  const at = clock + stamp;
  clock += ms;
  act(() => {
    for (const cb of pending) cb(at);
  });
}

const move = (clientX: number, clientY: number, pointerType = "mouse") =>
  act(() => {
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX, clientY, pointerType }),
    );
  });

const lastGlow = () => (draw.mock.calls.at(-1)![0] as { glow: number }).glow;

describe("GlassCanvas", () => {
  it("is a canvas, hidden from AT and drawn by the stylesheet's class", async () => {
    const { canvas } = await mount();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("glass");
  });

  it("does nothing outside a hero section", async () => {
    await mount(false);
    expect(images).toHaveLength(0);
    expect(createGlass).not.toHaveBeenCalled();
  });

  describe("once loaded", () => {
    it("loads the ground picture it was given", async () => {
      await mount();
      expect(images.map((i) => i.src)).toEqual(["/hero/glass/ground.webp"]);
    });

    it("asks for a plain WebGL2 context: no alpha, depth, stencil or antialias", async () => {
      await mount();
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
      });
    });

    it("hands the glass the picture and the picture's own shape", async () => {
      await mount();
      expect(createGlass).toHaveBeenCalledWith(context, images[0], 512 / 288);
    });

    it("sizes the backing store at the screen's density, and draws one frame", async () => {
      const { canvas } = await mount();
      expect([canvas.width, canvas.height]).toEqual([2880, 1800]);
      expect(draw).toHaveBeenCalledTimes(1);
      expect(draw).toHaveBeenCalledWith({
        width: 2880,
        height: 1800,
        reed: (1440 / 24) * 2,
        pointerX: 0,
        pointerY: 0,
        glow: 0,
      });
    });

    it("caps the density at 2, where the cost doubles for nothing a soft field shows", async () => {
      environment({ dpr: 3 });
      const { canvas } = await mount();
      expect(canvas.width).toBe(2880);
    });

    it("draws at 1x on a screen that is 1x", async () => {
      environment({ dpr: 1 });
      const { canvas } = await mount();
      expect([canvas.width, canvas.height]).toEqual([1440, 900]);
      expect(draw.mock.calls[0]![0]).toMatchObject({ reed: 1440 / 24 });
    });

    it("shows itself only once that frame is drawn", async () => {
      const { section } = await mount();
      expect(section).toHaveAttribute("data-ready", "");
    });

    it("runs no loop: nothing more is drawn while nothing moves", async () => {
      await mount();
      expect(frames).toHaveLength(0);
      expect(draw).toHaveBeenCalledTimes(1);
    });
  });

  describe("the glow, under a mouse", () => {
    it("lights where the pointer is, in device pixels, with no easing on the position", async () => {
      await mount();
      move(700, 400);
      run(16);
      expect(draw.mock.calls.at(-1)![0]).toMatchObject({ pointerX: 1400, pointerY: 600 });
    });

    it("fades in over GLOW_FADE_MS, a frame at a time, then stops asking for frames", async () => {
      await mount();
      move(700, 400);
      run(GLOW_FADE_MS / 2);
      expect(lastGlow()).toBeCloseTo(0.5);
      expect(frames).toHaveLength(1);
      run(GLOW_FADE_MS);
      expect(lastGlow()).toBe(1);
      expect(frames).toHaveLength(0);
    });

    it("draws one frame per move once lit, and none while the mouse is still", async () => {
      await mount();
      move(700, 400);
      run(GLOW_FADE_MS * 2);
      const drawn = draw.mock.calls.length;
      move(720, 410);
      expect(frames).toHaveLength(1);
      run(16);
      expect(draw).toHaveBeenCalledTimes(drawn + 1);
      expect(frames).toHaveLength(0);
    });

    it("asks for one frame however many moves arrive before it", async () => {
      await mount();
      move(700, 400);
      move(710, 400);
      move(720, 400);
      expect(frames).toHaveLength(1);
      run(16);
      expect(draw.mock.calls.at(-1)![0]).toMatchObject({ pointerX: 1440 });
    });

    it("fades out when the pointer leaves the glass, keeping its last place", async () => {
      await mount();
      move(700, 400);
      run(GLOW_FADE_MS * 2);
      move(700, 1200);
      run(GLOW_FADE_MS * 3);
      expect(lastGlow()).toBe(0);
      expect(draw.mock.calls.at(-1)![0]).toMatchObject({ pointerX: 1400, pointerY: 600 });
    });

    it("follows the pointer anywhere on the glass, past the page's column", async () => {
      // The listener is on the window: on the section it stopped at 1440.
      await mount();
      move(1430, 950);
      run(16);
      expect(draw.mock.calls.at(-1)![0]).toMatchObject({ pointerX: 2860, pointerY: 1700 });
    });

    it("does nothing for a pointer elsewhere on the page while it is already dark", async () => {
      await mount();
      move(700, 1200);
      expect(frames).toHaveLength(0);
    });

    it("fades out when the pointer leaves the window", async () => {
      await mount();
      move(700, 400);
      run(GLOW_FADE_MS * 2);
      act(() => {
        document.documentElement.dispatchEvent(new Event("pointerleave"));
      });
      run(GLOW_FADE_MS * 2);
      expect(lastGlow()).toBe(0);
    });

    it("never dims below dark or brightens past full, when a frame is stamped early", async () => {
      // A frame's time is when it began, which can come a moment before the
      // clock the pointer handler read (Chrome aligns input to the frame).
      await mount();
      move(700, 400);
      run(0, -5);
      expect(lastGlow()).toBe(0);
      run(GLOW_FADE_MS * 2);
      expect(lastGlow()).toBe(1);
      move(710, 400);
      run(0, -5);
      expect(lastGlow()).toBe(1);
      expect(frames).toHaveLength(0);
    });

    it("ignores a finger: there is no pointer to follow", async () => {
      await mount();
      move(700, 400, "touch");
      expect(frames).toHaveLength(0);
    });
  });

  describe("its gates", () => {
    it("draws the glass, still, and no glow, under reduced motion", async () => {
      environment({ reducedMotion: true });
      const { section } = await mount();
      expect(draw).toHaveBeenCalledTimes(1);
      expect(section).toHaveAttribute("data-ready", "");
      move(700, 400);
      expect(frames).toHaveLength(0);
    });

    it("draws the glass, still, and no glow, where there is no fine pointer", async () => {
      environment({ finePointer: false });
      await mount();
      expect(draw).toHaveBeenCalledTimes(1);
      move(700, 400);
      expect(frames).toHaveLength(0);
    });

    it("loads nothing at all under Save-Data", async () => {
      environment({ saveData: true });
      const { section } = await mount();
      expect(images).toHaveLength(0);
      expect(createGlass).not.toHaveBeenCalled();
      expect(section).not.toHaveAttribute("data-ready");
    });

    it("keeps the CSS ground where there is no WebGL2", async () => {
      context = null;
      const { section } = await mount();
      expect(createGlass).not.toHaveBeenCalled();
      expect(section).not.toHaveAttribute("data-ready");
    });

    it("logs a failure and keeps the CSS ground", async () => {
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      createGlass.mockImplementation(() => {
        throw new Error("[hero] glass: no shader");
      });
      const { section } = await mount();
      expect(error).toHaveBeenCalledWith("[hero] glass failed", expect.any(Error));
      expect(section).not.toHaveAttribute("data-ready");
    });

    it("logs a picture that will not decode, and draws nothing", async () => {
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      decode = () => Promise.reject(new Error("EncodingError"));
      await mount();
      expect(error).toHaveBeenCalledWith("[hero] glass failed", expect.any(Error));
      expect(createGlass).not.toHaveBeenCalled();
    });
  });

  describe("a resize", () => {
    it("draws again at the new size, a frame later", async () => {
      const { canvas } = await mount();
      Object.defineProperty(canvas, "clientWidth", { configurable: true, get: () => 800 });
      Object.defineProperty(canvas, "clientHeight", { configurable: true, get: () => 600 });
      act(() => resized!());
      expect(draw).toHaveBeenCalledTimes(1);
      run(16);
      expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
      expect(draw).toHaveBeenCalledTimes(2);
    });

    it("asks for one frame for a burst of notifications", async () => {
      await mount();
      act(() => {
        resized!();
        resized!();
        resized!();
      });
      expect(frames).toHaveLength(1);
    });

    it("keeps the backing store when the size has not changed, and still draws", async () => {
      const { canvas } = await mount();
      act(() => resized!());
      run(16);
      expect(canvas.width).toBe(2880);
      expect(draw).toHaveBeenCalledTimes(2);
    });
  });

  it("falls back to the CSS ground if the GPU drops the context", async () => {
    const { section, canvas } = await mount();
    act(() => {
      canvas.dispatchEvent(new Event("webglcontextlost"));
    });
    expect(section).not.toHaveAttribute("data-ready");
  });

  describe("when the hero goes", () => {
    it("undoes everything: the glass, the observer, the listeners, the mark", async () => {
      const { section, unmount } = await mount();
      unmount();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(observerDisconnected).toBe(1);
      expect(section).not.toHaveAttribute("data-ready");
      draw.mockClear();
      move(700, 400);
      expect(frames).toHaveLength(0);
    });

    it("cancels a fade in progress", async () => {
      const { unmount } = await mount();
      move(700, 400);
      unmount();
      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    });

    it("builds nothing if it goes before the picture has loaded", async () => {
      let finish: () => void = () => {};
      decode = () => new Promise<void>((resolve) => (finish = resolve));
      const view = render(
        <section data-hero="">
          <GlassCanvas src="/hero/glass/ground.webp" />
        </section>,
      );
      view.unmount();
      await act(async () => {
        finish();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(createGlass).not.toHaveBeenCalled();
    });
  });
});
