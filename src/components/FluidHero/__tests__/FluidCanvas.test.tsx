import { act, render, waitFor } from "@testing-library/react";

import { FluidCanvas, parseHex } from "../FluidCanvas";
import type { Fluid } from "../fluid";

/**
 * The client island is the codebase's THIRD rAF exception, and CLAUDE.md makes
 * it conditional on four guarantees. All four are behaviour this file can
 * assert, and each fails silently in the browser: a loop that ignores
 * prefers-reduced-motion, a chunk fetched on a metered connection, a loop that
 * runs off screen or in a hidden tab, and a failure that takes the section
 * down with it.
 *
 * The simulation module is mocked: what matters here is whether it was
 * imported at all, and what the island asks of it once it is.
 */

const createFluid = jest.fn();
jest.mock("../fluid", () => ({
  createFluid: (...args: unknown[]) => createFluid(...args),
}));

type IoCallback = (entries: { isIntersecting: boolean }[]) => void;

let ioCallback: IoCallback | undefined;
let ioDisconnected = 0;
let roCallback: (() => void) | undefined;
let roDisconnected = 0;
let frames: FrameRequestCallback[] = [];
let cancelled: number[] = [];

const TOKENS: Record<string, string> = {
  "--brown-100": " #f0e9dd",
  "--brown-800": "#2b241d ",
};

function stubEnvironment({
  reducedMotion = false,
  saveData = false,
  effectiveType,
  webgl = true,
  tokens = TOKENS,
}: {
  reducedMotion?: boolean;
  saveData?: boolean;
  effectiveType?: string;
  webgl?: boolean;
  tokens?: Record<string, string>;
} = {}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query.includes("reduce") && reducedMotion }),
  });
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: { saveData, effectiveType },
  });
  Object.defineProperty(window, "getComputedStyle", {
    configurable: true,
    value: () => ({ getPropertyValue: (name: string) => tokens[name] ?? "" }),
  });
  HTMLCanvasElement.prototype.getContext = jest.fn(() =>
    webgl ? ({ fake: true } as unknown as RenderingContext) : null,
  ) as typeof HTMLCanvasElement.prototype.getContext;

  class FakeIntersectionObserver {
    constructor(callback: IoCallback) {
      ioCallback = callback;
    }
    observe() {}
    disconnect() {
      ioDisconnected += 1;
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });

  class FakeResizeObserver {
    constructor(callback: () => void) {
      roCallback = callback;
    }
    observe() {}
    disconnect() {
      roDisconnected += 1;
    }
  }
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: FakeResizeObserver,
  });
}

function fakeFluid(overrides: Partial<Fluid> = {}) {
  let active = true;
  const fluid = {
    resize: jest.fn(),
    splat: jest.fn(),
    step: jest.fn(),
    draw: jest.fn(),
    dispose: jest.fn(),
    get active() {
      return active;
    },
    setActive(value: boolean) {
      active = value;
    },
    ...overrides,
  };
  return fluid;
}

/** Mount inside a [data-hero] section, the way FluidHero.tsx does. */
function mount() {
  const utils = render(
    <section data-hero>
      <FluidCanvas />
    </section>,
  );
  const section = utils.container.querySelector<HTMLElement>("[data-hero]");
  const canvas = utils.container.querySelector<HTMLCanvasElement>("canvas");
  if (!section || !canvas) throw new Error("mount failed");
  Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 400 });
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 800, height: 400 }) as DOMRect;
  return { ...utils, section, canvas };
}

const flush = () => act(async () => {});

/** Show the section, so the loop may start. */
const show = () => act(() => ioCallback?.([{ isIntersecting: true }]));
const hide = () => act(() => ioCallback?.([{ isIntersecting: false }]));

beforeEach(() => {
  ioCallback = undefined;
  roCallback = undefined;
  ioDisconnected = 0;
  roDisconnected = 0;
  frames = [];
  cancelled = [];
  createFluid.mockReset();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.push(cb);
    return frames.length;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    cancelled.push(id);
  });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("gates", () => {
  test.each([
    ["prefers-reduced-motion", { reducedMotion: true }],
    ["Save-Data", { saveData: true }],
    ["a 2g connection", { effectiveType: "2g" }],
    ["a 3g connection", { effectiveType: "3g" }],
    ["a slow-2g connection", { effectiveType: "slow-2g" }],
  ])("%s keeps the static ground and never imports the simulation", async (_name, env) => {
    stubEnvironment(env);
    const { section } = mount();
    await flush();
    expect(createFluid).not.toHaveBeenCalled();
    expect(section).not.toHaveAttribute("data-ready");
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
  });

  test("a 4g connection passes", async () => {
    stubEnvironment({ effectiveType: "4g" });
    createFluid.mockReturnValue(fakeFluid());
    const { section } = mount();
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
  });

  test("no WebGL2 context keeps the static ground after the import", async () => {
    stubEnvironment({ webgl: false });
    const { section } = mount();
    await flush();
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({ alpha: false, powerPreference: "high-performance" }),
    );
    expect(createFluid).not.toHaveBeenCalled();
    expect(section).not.toHaveAttribute("data-ready");
  });

  test("createFluid returning null (no float textures) keeps the static ground", async () => {
    stubEnvironment();
    createFluid.mockReturnValue(null);
    const { section } = mount();
    await flush();
    expect(createFluid).toHaveBeenCalledTimes(1);
    expect(section).not.toHaveAttribute("data-ready");
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("a throw during start is logged once and the section is untouched", async () => {
    stubEnvironment();
    createFluid.mockImplementation(() => {
      throw new Error("no GPU today");
    });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { section } = mount();
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("[hero] fluid failed", expect.any(Error));
    expect(section).not.toHaveAttribute("data-ready");
  });

  test("an unreadable token is a logged failure, not a wrong colour", async () => {
    stubEnvironment({ tokens: { "--brown-100": "", "--brown-800": "#2b241d" } });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    mount();
    await flush();
    expect(spy).toHaveBeenCalledWith("[hero] fluid failed", expect.any(Error));
    expect(createFluid).not.toHaveBeenCalled();
  });

  test("unmounting before the import resolves does nothing afterwards", async () => {
    stubEnvironment();
    createFluid.mockReturnValue(fakeFluid());
    const { unmount } = mount();
    unmount();
    await flush();
    expect(createFluid).not.toHaveBeenCalled();
  });
});

describe("once running", () => {
  let fluid: ReturnType<typeof fakeFluid>;

  beforeEach(() => {
    stubEnvironment();
    fluid = fakeFluid();
    createFluid.mockReturnValue(fluid);
  });

  test("passes the two brand tokens, parsed, to the simulation", async () => {
    mount();
    await flush();
    expect(createFluid).toHaveBeenCalledWith(
      { fake: true },
      { ground: parseHex("#f0e9dd"), ink: parseHex("#2b241d") },
    );
  });

  test("sizes the canvas at device pixels, capped at 2x, and draws a first frame", async () => {
    const { section, canvas } = mount();
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(fluid.resize).toHaveBeenCalledWith(1600, 800);
    expect(fluid.draw).toHaveBeenCalledTimes(1);
  });

  test("caps the pixel ratio at 2", async () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 3 });
    const { canvas } = mount();
    await flush();
    expect(canvas.width).toBe(1600);
  });

  test("resizes again, one frame after the canvas changes size", async () => {
    const { canvas } = mount();
    await flush();
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 400 });
    act(() => roCallback?.());
    // Not yet: the backing store is touched in the next frame, never inside
    // the observer's own callback.
    expect(fluid.resize).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(1);
    act(() => frames[0]?.(16));
    expect(fluid.resize).toHaveBeenLastCalledWith(800, 800);
    expect(canvas.width).toBe(800);
    expect(fluid.draw).toHaveBeenCalledTimes(2);
  });

  test("a resize notification with no size change rebuilds nothing", async () => {
    const { canvas } = mount();
    await flush();
    act(() => roCallback?.());
    act(() => frames[0]?.(16));
    // Same clientWidth and clientHeight as before: the field is left alone.
    expect(fluid.resize).toHaveBeenCalledTimes(1);
    expect(fluid.draw).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(1600);
  });

  test("several notifications in one frame schedule one refit", async () => {
    mount();
    await flush();
    act(() => {
      roCallback?.();
      roCallback?.();
      roCallback?.();
    });
    expect(frames).toHaveLength(1);
  });

  test("a refit still pending at unmount is cancelled", async () => {
    const { unmount } = mount();
    await flush();
    act(() => roCallback?.());
    unmount();
    expect(cancelled).toContain(1);
  });

  test("does not start the loop until the section is on screen", async () => {
    mount();
    await flush();
    expect(frames).toHaveLength(0);
    show();
    expect(frames).toHaveLength(1);
  });

  test("a frame steps with a clamped dt, draws, and reschedules while active", async () => {
    mount();
    await flush();
    jest.spyOn(performance, "now").mockReturnValue(1000);
    show();
    act(() => frames[0]?.(1016));
    expect(fluid.step).toHaveBeenCalledWith(expect.closeTo(0.016, 3));
    expect(fluid.draw).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(2);
    // A long gap (tab switch, GC pause) is integrated as one short step.
    act(() => frames[1]?.(5000));
    expect(fluid.step).toHaveBeenLastCalledWith(1 / 30);
  });

  test("stops rescheduling once the simulation reports inactive", async () => {
    mount();
    await flush();
    show();
    fluid.setActive(false);
    act(() => frames[0]?.(16));
    expect(frames).toHaveLength(1);
  });

  test("a pointer move splats in uv space with y up, and wakes the loop", async () => {
    const { section } = mount();
    await flush();
    show();
    fluid.setActive(false);
    act(() => frames[0]?.(16));
    expect(frames).toHaveLength(1);

    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 150 }));
    });
    // x: (300-100)/800 = 0.25; y: 1 - (150-50)/400 = 0.75. First contact, no delta.
    expect(fluid.splat).toHaveBeenLastCalledWith(0.25, 0.75, 0, 0);
    expect(frames).toHaveLength(2);

    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 500, clientY: 250 }));
    });
    expect(fluid.splat).toHaveBeenLastCalledWith(0.5, 0.5, 0.25, -0.25);
  });

  test("pointerleave and pointercancel reset the delta", async () => {
    const { section } = mount();
    await flush();
    for (const reset of ["pointerleave", "pointercancel"]) {
      act(() => {
        section.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 150 }));
        section.dispatchEvent(new MouseEvent(reset));
        section.dispatchEvent(new MouseEvent("pointermove", { clientX: 500, clientY: 250 }));
      });
      expect(fluid.splat).toHaveBeenLastCalledWith(0.5, 0.5, 0, 0);
    }
  });

  test("pointerdown is a fresh contact: no delta from the previous position", async () => {
    const { section } = mount();
    await flush();
    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 150 }));
      section.dispatchEvent(new MouseEvent("pointerdown", { clientX: 900, clientY: 450 }));
    });
    expect(fluid.splat).toHaveBeenLastCalledWith(1, 0, 0, 0);
  });

  test("ignores moves while the canvas has no size", async () => {
    const { section, canvas } = mount();
    await flush();
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10 }));
    });
    expect(fluid.splat).not.toHaveBeenCalled();
  });

  test("leaving the viewport cancels the frame; returning restarts it", async () => {
    mount();
    await flush();
    show();
    hide();
    expect(cancelled).toEqual([1]);
    show();
    expect(frames).toHaveLength(2);
  });

  test("a hidden tab stops the loop and a visible one resumes it", async () => {
    mount();
    await flush();
    show();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(cancelled).toEqual([1]);
    // A frame that lands after hiding does not reschedule.
    act(() => frames[0]?.(16));
    expect(frames).toHaveLength(1);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames).toHaveLength(2);
  });

  test("does not double-schedule when already running", async () => {
    mount();
    await flush();
    show();
    show();
    expect(frames).toHaveLength(1);
  });

  test("unmount cancels the frame, disconnects both observers, disposes and clears ready", async () => {
    const { section, unmount } = mount();
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
    show();
    unmount();
    expect(cancelled).toContain(1);
    expect(ioDisconnected).toBe(1);
    expect(roDisconnected).toBe(1);
    expect(fluid.dispose).toHaveBeenCalledTimes(1);
    expect(section).not.toHaveAttribute("data-ready");
  });

  test("after unmount, pointer moves on the section reach nothing", async () => {
    const { section, unmount } = mount();
    await flush();
    unmount();
    section.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 150 }));
    expect(fluid.splat).not.toHaveBeenCalled();
  });
});

describe("parseHex", () => {
  test("parses #rrggbb with surrounding whitespace into 0..1 channels", () => {
    expect(parseHex(" #ff0080 ")).toEqual([1, 0, 128 / 255]);
    expect(parseHex("#000000")).toEqual([0, 0, 0]);
    expect(parseHex("#FFFFFF")).toEqual([1, 1, 1]);
  });

  test("is case-insensitive, as CSS hex colours are", () => {
    expect(parseHex("#AbCdEf")).toEqual(parseHex("#abcdef"));
    expect(parseHex("#2B241D")).toEqual(parseHex("#2b241d"));
  });

  test.each(["", "#fff", "rgb(1, 2, 3)", "f0e9dd", "#f0e9dd00"])("rejects %p", (value) => {
    expect(() => parseHex(value)).toThrow(/expected a #rrggbb colour/);
  });
});

describe("edge cases", () => {
  let fluid: ReturnType<typeof fakeFluid>;

  beforeEach(() => {
    stubEnvironment();
    fluid = fakeFluid();
    createFluid.mockReturnValue(fluid);
  });

  test("a missing devicePixelRatio counts as 1", async () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 0 });
    const { canvas } = mount();
    await flush();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(400);
  });

  test("a zero-sized canvas still gets a 1x1 backing store, never 0x0", async () => {
    const { canvas } = mount();
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 0 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 0 });
    await flush();
    expect(fluid.resize).toHaveBeenCalledWith(1, 1);
  });

  test("a pointer move while the section is off screen splats but starts no loop", async () => {
    const { section } = mount();
    await flush();
    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 150 }));
    });
    expect(fluid.splat).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    // Once it scrolls into view the ink already there is animated.
    show();
    expect(frames).toHaveLength(1);
  });

  test("hiding a section whose loop never started cancels frame 0 harmlessly", async () => {
    mount();
    await flush();
    hide();
    expect(cancelled).toEqual([0]);
    expect(frames).toHaveLength(0);
  });

  test("an observer with no entries is treated as off screen", async () => {
    mount();
    await flush();
    show();
    act(() => ioCallback?.([]));
    expect(cancelled).toEqual([1]);
  });

  test("the latest of several queued entries wins", async () => {
    mount();
    await flush();
    act(() => ioCallback?.([{ isIntersecting: false }, { isIntersecting: true }]));
    expect(frames).toHaveLength(1);
    act(() => ioCallback?.([{ isIntersecting: true }, { isIntersecting: false }]));
    expect(cancelled).toEqual([1]);
  });

  test("a visibility change while off screen starts nothing", async () => {
    mount();
    await flush();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames).toHaveLength(0);
  });

  test("a frame delivered after the section left the viewport does not reschedule", async () => {
    mount();
    await flush();
    show();
    const frame = frames[0];
    hide();
    act(() => frame?.(16));
    expect(frames).toHaveLength(1);
    expect(fluid.step).toHaveBeenCalledTimes(1);
  });

  test("the first draw happens before data-ready, so the fade never shows a blank canvas", async () => {
    const { section } = mount();
    let drawsAtReady = -1;
    const observer = new MutationObserver(() => {
      if (section.hasAttribute("data-ready"))
        drawsAtReady = (fluid.draw as jest.Mock).mock.calls.length;
    });
    observer.observe(section, { attributes: true });
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
    observer.disconnect();
    expect(drawsAtReady).toBe(1);
  });

  test("renders nothing but the canvas", () => {
    const { container } = mount();
    const section = container.querySelector("[data-hero]");
    expect(section?.children).toHaveLength(1);
    expect(section?.firstElementChild?.tagName).toBe("CANVAS");
  });

  test("the canvas is hidden from assistive technology", () => {
    const { canvas } = mount();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  test("without a [data-hero] ancestor it does nothing at all", async () => {
    render(<FluidCanvas />);
    await flush();
    expect(createFluid).not.toHaveBeenCalled();
    expect(window.matchMedia).toBeDefined();
  });

  test("a connection object without effectiveType passes", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: {},
    });
    const { section } = mount();
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
  });

  test("no connection object at all passes", async () => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: undefined });
    const { section } = mount();
    await waitFor(() => expect(section).toHaveAttribute("data-ready"));
  });
});

describe("gate combinations", () => {
  // The gates are independent: any one of them alone keeps the static ground,
  // and only all of them passing loads the simulation.
  const cases: [string, Parameters<typeof stubEnvironment>[0], boolean][] = [
    ["nothing set", {}, true],
    ["4g", { effectiveType: "4g" }, true],
    ["5g", { effectiveType: "5g" }, true],
    ["reduce + 4g", { reducedMotion: true, effectiveType: "4g" }, false],
    ["saveData + 4g", { saveData: true, effectiveType: "4g" }, false],
    ["3g alone", { effectiveType: "3g" }, false],
    ["reduce + saveData + 2g", { reducedMotion: true, saveData: true, effectiveType: "2g" }, false],
    ["saveData false, explicitly", { saveData: false }, true],
    ["an unknown effectiveType", { effectiveType: "wifi" }, true],
  ];

  test.each(cases)("%s", async (_name, env, loads) => {
    stubEnvironment(env);
    createFluid.mockReturnValue(fakeFluid());
    const { section } = mount();
    if (loads) {
      await waitFor(() => expect(section).toHaveAttribute("data-ready"));
      expect(createFluid).toHaveBeenCalledTimes(1);
    } else {
      await flush();
      expect(createFluid).not.toHaveBeenCalled();
      expect(section).not.toHaveAttribute("data-ready");
    }
  });

  test("a gate decides before any listener is attached", async () => {
    stubEnvironment({ reducedMotion: true });
    const { section } = mount();
    const spy = jest.spyOn(section, "addEventListener");
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("context and lifecycle details", () => {
  let fluid: ReturnType<typeof fakeFluid>;

  beforeEach(() => {
    stubEnvironment();
    fluid = fakeFluid();
    createFluid.mockReturnValue(fluid);
  });

  test("asks for an opaque, unantialiased WebGL2 context with no depth or stencil", async () => {
    mount();
    await flush();
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
  });

  test("a move past the canvas edge is forwarded with out-of-range coordinates", async () => {
    const { section } = mount();
    await flush();
    act(() => {
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 1000, clientY: 0 }));
    });
    expect(fluid.splat).toHaveBeenLastCalledWith(1.125, 1.125, 0, 0);
  });

  test("a visibility change after unmount starts no frame", async () => {
    const { unmount } = mount();
    await flush();
    show();
    unmount();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames).toHaveLength(1);
  });

  test("unmount disposes exactly once even if the effect ran twice", async () => {
    const { unmount } = mount();
    await flush();
    unmount();
    unmount();
    expect(fluid.dispose).toHaveBeenCalledTimes(1);
  });
});

describe("listeners", () => {
  let fluid: ReturnType<typeof fakeFluid>;

  beforeEach(() => {
    stubEnvironment();
    fluid = fakeFluid();
    createFluid.mockReturnValue(fluid);
  });

  test("pointer listeners are passive, so a finger never waits on them to scroll", async () => {
    const { section } = mount();
    const spy = jest.spyOn(section, "addEventListener");
    await flush();
    const options = (type: string) => spy.mock.calls.find((call) => call[0] === type)?.[2];
    expect(options("pointermove")).toEqual({ passive: true });
    expect(options("pointerdown")).toEqual({ passive: true });
  });

  test("listens on the section, never on the canvas", async () => {
    const { section, canvas } = mount();
    const onSection = jest.spyOn(section, "addEventListener");
    const onCanvas = jest.spyOn(canvas, "addEventListener");
    await flush();
    expect(onSection.mock.calls.map((call) => call[0]).sort()).toEqual([
      "pointercancel",
      "pointerdown",
      "pointerleave",
      "pointermove",
    ]);
    expect(onCanvas).not.toHaveBeenCalled();
  });

  test("a move after a down carries the delta from the down point", async () => {
    const { section } = mount();
    await flush();
    act(() => {
      section.dispatchEvent(new MouseEvent("pointerdown", { clientX: 100, clientY: 50 }));
      section.dispatchEvent(new MouseEvent("pointermove", { clientX: 500, clientY: 250 }));
    });
    expect(fluid.splat).toHaveBeenNthCalledWith(1, 0, 1, 0, 0);
    expect(fluid.splat).toHaveBeenNthCalledWith(2, 0.5, 0.5, 0.5, -0.5);
  });

  test("removes exactly the listeners it added", async () => {
    const { section, unmount } = mount();
    const added = jest.spyOn(section, "addEventListener");
    const removed = jest.spyOn(section, "removeEventListener");
    await flush();
    unmount();
    expect(removed.mock.calls.map((call) => call[0]).sort()).toEqual(
      added.mock.calls.map((call) => call[0]).sort(),
    );
  });
});
