// The 404 field's frame loop. Its physics used to advance one step per
// animation frame, so the effect was a function of the display: twice as
// strong at 120 Hz, and barely moving on a slow device (CI's drag moved the
// field 15px where 66px was designed). These drive the real component with a
// controlled clock and assert the field depends on elapsed time, not on how
// many frames were drawn in it.
import { act, render } from "@testing-library/react";
import { ParticleText } from "../ParticleText";
import { MAX_STEPS, STEP_MS } from "../physics";

type Dot = { x: number; y: number };

// --- A fake 2D canvas: text rasterises to a solid block, arcs are recorded ---
let frameDots: Dot[] = [];
let getContextCalls = 0;

function fakeContext(canvas: HTMLCanvasElement) {
  return {
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    measureText: (line: string) => ({ width: line.length * 60 }),
    fillText() {},
    // Opaque across the middle band of whatever canvas asks, so sampleText
    // keeps a real, deterministic field of particles.
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = Math.floor(height * 0.3); y < Math.floor(height * 0.7); y += 1) {
        for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x += 1) {
          data[(y * width + x) * 4 + 3] = 255;
        }
      }
      return { data };
    },
    clearRect: () => {
      if (canvas.dataset.main) frameDots = [];
    },
    beginPath() {},
    arc: (x: number, y: number) => {
      if (canvas.dataset.main) frameDots.push({ x, y });
    },
    fill() {},
  };
}

// --- A controllable animation frame clock ------------------------------------
let queued: FrameRequestCallback[] = [];

function runFrame(now: number) {
  const callbacks = queued;
  queued = [];
  for (const callback of callbacks) callback(now);
}

const originals = {
  matchMedia: window.matchMedia,
  ResizeObserver: window.ResizeObserver,
  raf: window.requestAnimationFrame,
  caf: window.cancelAnimationFrame,
  getContext: HTMLCanvasElement.prototype.getContext,
  rect: Element.prototype.getBoundingClientRect,
};

function stubMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? reduce : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  frameDots = [];
  queued = [];
  getContextCalls = 0;
  stubMotion(false);
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    queued.push(callback);
    return queued.length;
  };
  window.cancelAnimationFrame = () => {
    queued = [];
  };
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    getContextCalls += 1;
    return fakeContext(this);
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 120,
      width: 300,
      height: 120,
    } as DOMRect;
  };
  // Deterministic jitter, so two mounts build identical fields.
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  window.matchMedia = originals.matchMedia;
  window.ResizeObserver = originals.ResizeObserver;
  window.requestAnimationFrame = originals.raf;
  window.cancelAnimationFrame = originals.caf;
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  Element.prototype.getBoundingClientRect = originals.rect;
  jest.restoreAllMocks();
});

function mount() {
  const result = render(<ParticleText text="404" label="404" />);
  const canvas = result.container.querySelector("canvas");
  if (canvas) canvas.dataset.main = "1";
  return { ...result, canvas };
}

// jsdom has no PointerEvent. A MouseEvent carrying pointerType is what the
// component reads.
function mouse(x: number) {
  const event = new MouseEvent("pointermove", { clientX: x, clientY: 60 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  window.dispatchEvent(event);
}

/**
 * One mount, one drag, sampled at the given frame interval. The pointer moves
 * on the same wall-clock schedule whatever the frame rate, as a real hand
 * would: every 25ms from x=40 to x=260, then rests. Returns the field as drawn
 * after `duration` ms.
 */
function simulate(frameMs: number, duration = 1000): Dot[] {
  const { unmount } = mount();
  let nextMove = 0;
  let x = 40;
  act(() => {
    runFrame(0);
    for (let now = frameMs; now <= duration + 1e-6; now += frameMs) {
      while (nextMove <= now && x <= 260) {
        mouse(x);
        x += 11;
        nextMove += 25;
      }
      runFrame(now);
    }
  });
  const dots = frameDots;
  unmount();
  return dots;
}

const displacement = (a: Dot[], b: Dot[]) =>
  a.reduce((sum, dot, i) => sum + Math.hypot(dot.x - b[i]!.x, dot.y - b[i]!.y), 0) / a.length;

describe("ParticleText frame loop", () => {
  it("builds a field and draws it on the first frame", () => {
    mount();
    act(() => runFrame(0));
    expect(frameDots.length).toBeGreaterThan(50);
  });

  it("owes no physics on the first frame, so nothing moves before time passes", () => {
    mount();
    act(() => runFrame(0));
    const first = frameDots;
    act(() => runFrame(0));
    expect(displacement(first, frameDots)).toBe(0);
  });

  it("does not advance on a frame that arrives before a step is due", () => {
    mount();
    act(() => runFrame(0));
    const before = frameDots;
    act(() => runFrame(STEP_MS / 3));
    expect(displacement(before, frameDots)).toBe(0);
  });

  it("advances once a step is due, even with the pointer parked", () => {
    // The idle drift runs on the step clock too.
    mount();
    act(() => runFrame(0));
    const before = frameDots;
    act(() => {
      for (let i = 1; i <= 30; i += 1) runFrame(i * STEP_MS);
    });
    expect(displacement(before, frameDots)).toBeGreaterThan(0);
  });

  it("moves the field when the pointer sweeps across it", () => {
    const rest = simulate(1000 / 60, 0);
    const swept = simulate(1000 / 60, 400);
    expect(displacement(rest, swept)).toBeGreaterThan(1);
  });

  // Field energy: the mean distance of every particle from where it rests,
  // which is what the eye reads as "how much the 404 moved". Compared rather
  // than particle-by-particle positions because a slower display samples the
  // pointer less often, which shifts individual particles slightly without
  // changing the effect. Measured with the fix: every rate within 1% to 7% of
  // 60 Hz. Stepping once per frame put the same ratios between 0.3 and 1.9.
  const energy = (hz: number, t: number) =>
    displacement(simulate(1000 / 60, 0), simulate(1000 / hz, t));

  it.each([
    [120, 300],
    [120, 800],
    [144, 300],
    [30, 300],
    [30, 800],
  ])("moves the field as much at %i Hz as at 60 Hz, %i ms into the drag", (hz, t) => {
    const ratio = energy(hz, t) / energy(60, t);
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });

  it("would fail that check if the physics stepped once per frame", () => {
    // Guards the guard. Once-per-frame stepping at 30 Hz runs 300ms of drag as
    // 150ms of physics, which is 60 Hz at half the time. Far outside the band.
    const ratio = energy(60, 150) / energy(60, 300);
    expect(ratio < 0.9 || ratio > 1.1).toBe(true);
  });

  it("caps a long gap at MAX_STEPS instead of running seconds of physics at once", () => {
    // A backgrounded tab resuming reports a huge gap. It must equal exactly
    // MAX_STEPS steps, not the hundreds the gap would otherwise owe.
    const resumed = mount();
    act(() => {
      runFrame(0);
      runFrame(10_000);
    });
    const afterGap = frameDots;
    resumed.unmount();

    mount();
    act(() => {
      runFrame(0);
      runFrame(MAX_STEPS * STEP_MS + 0.01);
    });
    expect(displacement(afterGap, frameDots)).toBeLessThan(1e-9);
  });

  it("drops the remainder after a capped gap rather than banking it", () => {
    // If the dropped time were carried, the next ordinary frame would run a
    // burst of catch-up steps. It must run exactly one. A step and a half, not
    // exactly one step, so float rounding at the boundary cannot decide it.
    const capped = mount();
    act(() => {
      runFrame(0);
      runFrame(10_000);
      runFrame(10_000 + STEP_MS * 1.5);
    });
    const afterNext = frameDots;
    capped.unmount();

    mount();
    act(() => {
      runFrame(0);
      runFrame(MAX_STEPS * STEP_MS + 0.01);
      runFrame(MAX_STEPS * STEP_MS + 0.01 + STEP_MS * 1.5);
    });
    expect(displacement(afterNext, frameDots)).toBeLessThan(1e-9);
  });

  it("never starts the loop under reduced motion, and renders no canvas", () => {
    stubMotion(true);
    const { canvas } = mount();
    expect(canvas).toBeNull();
    expect(queued).toHaveLength(0);
    expect(getContextCalls).toBe(0);
  });

  it("stops the loop on unmount", () => {
    const { unmount } = mount();
    act(() => runFrame(0));
    expect(queued).toHaveLength(1);
    unmount();
    expect(queued).toHaveLength(0);
  });
});
