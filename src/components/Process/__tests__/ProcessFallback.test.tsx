import { render } from "@testing-library/react";

import { ProcessFallback } from "../ProcessFallback";

/**
 * The fallback is the codebase's SECOND rAF exception, and CLAUDE.md makes it
 * conditional on four guarantees. Three of them are behaviour this file can
 * assert, and they are exactly the ones that fail silently: a loop that runs
 * when the CSS path is already driving the rail, a loop that ignores
 * prefers-reduced-motion, and a loop that keeps running after unmount.
 *
 * jsdom has neither CSS.supports nor IntersectionObserver, so both are stubbed
 * per test rather than globally: what each test needs them to DO is the thing
 * under test.
 */

type IoCallback = (entries: { isIntersecting: boolean }[]) => void;

let ioCallback: IoCallback | undefined;
let observed = 0;
let disconnected = 0;

function stubEnvironment({
  supportsTimeline,
  reducedMotion,
}: {
  supportsTimeline: boolean;
  reducedMotion: boolean;
}) {
  Object.defineProperty(window, "CSS", {
    configurable: true,
    value: { supports: () => supportsTimeline },
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: reducedMotion,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });

  class FakeIntersectionObserver {
    constructor(callback: IoCallback) {
      ioCallback = callback;
    }
    observe() {
      observed += 1;
    }
    disconnect() {
      disconnected += 1;
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });
}

/** The section the effect looks for, and whose custom property it writes. */
function mountSection() {
  const section = document.createElement("div");
  section.setAttribute("data-process", "");
  // getBoundingClientRect is 0 in jsdom, so give the effect something to divide.
  section.getBoundingClientRect = () => ({ top: -500, height: 2000 }) as DOMRect;
  document.body.append(section);
  return section;
}

beforeEach(() => {
  ioCallback = undefined;
  observed = 0;
  disconnected = 0;
  document.body.replaceChildren();
  // Runs the callback exactly ONCE and then stops handing out frames, so the
  // loop's self-rescheduling does not recurse forever inside the test.
  let framesLeft = 1;
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    if (framesLeft > 0) {
      framesLeft -= 1;
      cb(0);
    }
    return 1;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ProcessFallback", () => {
  it("renders nothing", () => {
    stubEnvironment({ supportsTimeline: true, reducedMotion: false });
    const { container } = render(<ProcessFallback />);
    expect(container).toBeEmptyDOMElement();
  });

  it("never starts when the CSS path is supported", () => {
    // The load-bearing one. Two drivers writing --process-progress is a bug,
    // not redundancy, so this must not even observe.
    stubEnvironment({ supportsTimeline: true, reducedMotion: false });
    mountSection();
    render(<ProcessFallback />);
    expect(observed).toBe(0);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("never starts under prefers-reduced-motion, even without CSS support", () => {
    // The _reset.scss reduced-motion block zeroes animation durations and has
    // no effect whatsoever on a rAF loop, so this gate has to be in JS.
    stubEnvironment({ supportsTimeline: false, reducedMotion: true });
    mountSection();
    render(<ProcessFallback />);
    expect(observed).toBe(0);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("observes the section when neither gate blocks it", () => {
    stubEnvironment({ supportsTimeline: false, reducedMotion: false });
    mountSection();
    render(<ProcessFallback />);
    expect(observed).toBe(1);
    // Observing is not running: the loop starts only once the section is on
    // screen, which is what keeps it off the main thread the rest of the time.
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("writes the progress property once the section is on screen", () => {
    stubEnvironment({ supportsTimeline: false, reducedMotion: false });
    const section = mountSection();
    render(<ProcessFallback />);

    ioCallback?.([{ isIntersecting: true }]);

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    // top -500 over a travel of 2000 - 768 (jsdom's innerHeight) = 0.406…
    const written = section.style.getPropertyValue("--process-progress");
    expect(Number(written)).toBeGreaterThan(0);
    expect(Number(written)).toBeLessThan(1);
  });

  it("stops the loop on unmount", () => {
    stubEnvironment({ supportsTimeline: false, reducedMotion: false });
    mountSection();
    const { unmount } = render(<ProcessFallback />);
    ioCallback?.([{ isIntersecting: true }]);

    unmount();

    expect(disconnected).toBe(1);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
