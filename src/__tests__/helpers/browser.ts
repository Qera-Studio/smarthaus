/**
 * What jsdom does not have and a client island asks for: matchMedia,
 * IntersectionObserver and PointerEvent. Installed on window for the calling
 * suite; the returned handle drives the first two.
 */
export type FakeBrowser = {
  /** Whether "(prefers-reduced-motion: reduce)", or any query, matches. */
  reduced: boolean;
  /** Every observer made, newest last. */
  observers: FakeObserver[];
  /** Reports an entry to every observer, as the browser would on a scroll. */
  intersect: (entry: { isIntersecting: boolean; intersectionRatio?: number }) => void;
};

export type FakeObserver = {
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
};

export function stubBrowser(): FakeBrowser {
  const browser: FakeBrowser = {
    reduced: false,
    observers: [],
    intersect: (entry) => {
      for (const observer of browser.observers.filter((o) => !o.disconnected)) {
        callbacks.get(observer)!(
          observer.observed.map((target) => ({
            target,
            intersectionRatio: entry.intersectionRatio ?? (entry.isIntersecting ? 1 : 0),
            isIntersecting: entry.isIntersecting,
          })) as unknown as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      }
    },
  };
  const callbacks = new Map<FakeObserver, IntersectionObserverCallback>();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return browser.reduced;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });

  class FakeIntersectionObserver {
    private readonly own: FakeObserver;
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.own = { options, observed: [], disconnected: false };
      callbacks.set(this.own, callback);
      browser.observers.push(this.own);
    }
    observe(target: Element) {
      this.own.observed.push(target);
    }
    disconnect() {
      this.own.disconnected = true;
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });

  // Without one, fireEvent drops pointerType (as StripControls.test.tsx found).
  class FakePointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "";
    }
  }
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });

  return browser;
}
