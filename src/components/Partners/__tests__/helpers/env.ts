import { act } from "@testing-library/react";

/**
 * jsdom has no matchMedia and no IntersectionObserver, and the carousel reads
 * both: reduced motion withholds the timer, and the timer runs only on screen.
 * This stands in for them with levers a test can pull. Same shape as
 * HardwareStage.test.tsx's setup.
 */
type IoCallback = (entries: { isIntersecting: boolean }[]) => void;

export const env = {
  reduced: false,
  ioCallback: undefined as IoCallback | undefined,
  mediaListener: undefined as (() => void) | undefined,
  disconnected: 0,
  mediaRemoved: 0,
  /** Reports the carousel as on screen, or off it. */
  inView(isIntersecting: boolean) {
    act(() => env.ioCallback?.([{ isIntersecting }]));
  },
  /** Flips the reduced-motion preference and tells the listener. */
  setReduced(reduced: boolean) {
    env.reduced = reduced;
    act(() => env.mediaListener?.());
  },
};

export function installEnv() {
  env.reduced = false;
  env.ioCallback = undefined;
  env.mediaListener = undefined;
  env.disconnected = 0;
  env.mediaRemoved = 0;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      get matches() {
        return env.reduced;
      },
      addEventListener: (_: string, fn: () => void) => {
        env.mediaListener = fn;
      },
      removeEventListener: () => {
        env.mediaRemoved += 1;
      },
    }),
  });

  class FakeIntersectionObserver {
    constructor(callback: IoCallback) {
      env.ioCallback = callback;
    }
    observe() {}
    disconnect() {
      env.disconnected += 1;
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });
}
