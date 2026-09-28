import { act, fireEvent, render, screen } from "@testing-library/react";
import { ScrollToTop } from "../ScrollToTop";

type Entry = { target: Element; isIntersecting: boolean };

class FakeIO {
  static all: FakeIO[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(
    public callback: (entries: Entry[]) => void,
    public options: IntersectionObserverInit = {},
  ) {
    // What the browser does with a margin it cannot parse: throw from the
    // constructor. "--8px" was one, and it took the whole page down.
    const margin = options.rootMargin ?? "0px";
    if (!/^(-?\d+(px|%))( -?\d+(px|%)){0,3}$/.test(margin)) {
      throw new SyntaxError(
        "Failed to construct 'IntersectionObserver': rootMargin must be specified in pixels or percent.",
      );
    }
    FakeIO.all.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  deliver(...entries: Entry[]) {
    act(() => this.callback(entries));
  }
}

class FakeRO {
  static all: FakeRO[] = [];
  disconnected = false;
  constructor(public callback: () => void) {
    FakeRO.all.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  fire() {
    act(() => this.callback());
  }
}

const originalIO = window.IntersectionObserver;
const originalRO = window.ResizeObserver;
let rect = { top: 600, bottom: 640, left: 1200, right: 1340 };

beforeEach(() => {
  FakeIO.all = [];
  FakeRO.all = [];
  window.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
  window.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;
  Object.defineProperty(window, "innerHeight", { value: 720, configurable: true });
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: 1380,
    configurable: true,
  });
  rect = { top: 600, bottom: 640, left: 1200, right: 1340 };
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(
      () => ({ ...rect, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    );
});

afterEach(() => {
  window.IntersectionObserver = originalIO;
  window.ResizeObserver = originalRO;
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

/** Two dark grounds on the page before the button mounts, as the footer and the banner are. */
function renderWithDarkGrounds() {
  const footer = document.createElement("footer");
  footer.setAttribute("data-ground", "dark");
  const banner = document.createElement("section");
  banner.setAttribute("data-ground", "dark");
  document.body.append(footer, banner);
  const utils = render(<ScrollToTop />);
  const button = screen.getByRole("button", { name: "Back to top", hidden: true });
  const sentinelIO = FakeIO.all[0]!;
  const darkIO = FakeIO.all[1]!;
  return { ...utils, button, footer, banner, sentinelIO, darkIO };
}

describe("ScrollToTop", () => {
  it("stays hidden and out of the tab order until the page top has scrolled away", () => {
    const { button, sentinelIO } = renderWithDarkGrounds();
    expect(button).not.toHaveAttribute("data-visible");
    expect(button).toHaveAttribute("inert");
    sentinelIO.deliver({ target: sentinelIO.observed[0]!, isIntersecting: false });
    expect(button).toHaveAttribute("data-visible");
    expect(button).not.toHaveAttribute("inert");
    sentinelIO.deliver({ target: sentinelIO.observed[0]!, isIntersecting: true });
    expect(button).toHaveAttribute("inert");
  });

  it("watches every dark ground on the page", () => {
    const { darkIO, footer, banner } = renderWithDarkGrounds();
    expect(darkIO.observed).toEqual([footer, banner]);
  });

  it("shrinks its band to the button's own box on all four sides", () => {
    const { darkIO } = renderWithDarkGrounds();
    // 600 from the top, 720 - 640 = 80 from the bottom, 1200 from the left,
    // 1380 - 1340 = 40 from the right. Inset only top and bottom, the band was
    // the full width and a dark block beside the button counted as behind it.
    expect(darkIO.options.rootMargin).toBe("-600px -40px -80px -1200px");
    expect(darkIO.options.threshold).toBe(0);
  });

  it("inverts while a dark ground is behind it, and keeps inverting while any one still is", () => {
    const { button, darkIO, footer, banner } = renderWithDarkGrounds();
    darkIO.deliver({ target: footer, isIntersecting: true });
    expect(button).toHaveAttribute("data-on-dark");
    darkIO.deliver({ target: banner, isIntersecting: true });
    // One leaves; the other is still behind it.
    darkIO.deliver({ target: footer, isIntersecting: false });
    expect(button).toHaveAttribute("data-on-dark");
    darkIO.deliver({ target: banner, isIntersecting: false });
    expect(button).not.toHaveAttribute("data-on-dark");
  });

  it("rebuilds the band with fresh measurements when the page resizes", () => {
    const { darkIO } = renderWithDarkGrounds();
    rect = { top: 500, bottom: 540, left: 20, right: 160 };
    FakeRO.all[0]!.fire();
    expect(darkIO.disconnected).toBe(true);
    expect(FakeIO.all.at(-1)!.options.rootMargin).toBe("-500px -1220px -180px -20px");
  });

  it("clamps the band at the viewport edge when the button's box is past it", () => {
    // Hidden, the button is nudged down; on a short viewport its box ends
    // below the bottom edge, and the bottom inset came out negative. The
    // margin then read "--8px", which the constructor refuses (2026-09-28,
    // seen on latest as a runtime SyntaxError that blanked the homepage).
    rect = { top: 700, bottom: 728, left: 1200, right: 1340 };
    const { darkIO } = renderWithDarkGrounds();
    expect(darkIO.options.rootMargin).toBe("-700px -40px -0px -1200px");
  });

  it("clamps every side, and survives a rebuild while the box is off screen", () => {
    rect = { top: -10, bottom: 30, left: -5, right: 1400 };
    const { darkIO } = renderWithDarkGrounds();
    expect(darkIO.options.rootMargin).toBe("-0px -0px -690px -0px");
    rect = { top: 600, bottom: 760, left: 1200, right: 1340 };
    expect(() => FakeRO.all[0]!.fire()).not.toThrow();
    expect(FakeIO.all.at(-1)!.options.rootMargin).toBe("-600px -40px -0px -1200px");
  });

  it("builds no band when the page has no dark ground", () => {
    render(<ScrollToTop />);
    expect(FakeIO.all).toHaveLength(1);
    expect(FakeRO.all).toHaveLength(0);
  });

  it("scrolls to the top smoothly, leaving reduced motion to the browser", () => {
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    const { button } = renderWithDarkGrounds();
    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("disconnects every observer on unmount", () => {
    const { unmount, sentinelIO, darkIO } = renderWithDarkGrounds();
    unmount();
    expect(sentinelIO.disconnected).toBe(true);
    expect(darkIO.disconnected).toBe(true);
    expect(FakeRO.all[0]!.disconnected).toBe(true);
  });
});
