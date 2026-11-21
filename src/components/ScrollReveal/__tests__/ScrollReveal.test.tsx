import { act, render } from "@testing-library/react";
import { StrictMode } from "react";

import { REVEAL_MARGIN, ScrollReveal } from "../ScrollReveal";

/**
 * The reveal's one job is to move an attribute. What can fail silently: a thing
 * already on screen hidden, a thing never shown again, or motion under reduced
 * motion.
 */

const SCREEN = 800;
let onSeen: IntersectionObserverCallback;
let options: IntersectionObserverInit | undefined;
const observed = new Set<Element>();
const disconnect = jest.fn();
let reduced = false;

beforeEach(() => {
  observed.clear();
  disconnect.mockClear();
  reduced = false;
  Object.defineProperty(window, "innerHeight", { configurable: true, value: SCREEN });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: reduced }),
  });
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        onSeen = callback;
        options = init;
      }
      observe = (el: Element) => observed.add(el);
      unobserve = (el: Element) => observed.delete(el);
      disconnect = disconnect;
    },
  });
});

/** Elements marked data-reveal at these distances from the top of the screen. */
function page(...tops: number[]) {
  const els = tops.map((top) => {
    const el = document.createElement("p");
    el.setAttribute("data-reveal", "");
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
    document.body.append(el);
    return el;
  });
  return els;
}
afterEach(() => document.body.replaceChildren());

const enter = (el: Element, isIntersecting = true) =>
  act(() => {
    onSeen(
      [{ isIntersecting, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });

describe("ScrollReveal", () => {
  it("renders nothing of its own", () => {
    expect(render(<ScrollReveal />).container).toBeEmptyDOMElement();
  });

  it("hides only what is below the screen, and watches only that", () => {
    const [passed, onScreen, below] = page(-500, 100, SCREEN + 1);
    render(<ScrollReveal />);
    expect(passed).toHaveAttribute("data-reveal", "");
    expect(onScreen).toHaveAttribute("data-reveal", "");
    expect(below).toHaveAttribute("data-reveal", "waiting");
    expect([...observed]).toEqual([below]);
  });

  it("counts what starts exactly at the screen's foot as below it", () => {
    const [foot] = page(SCREEN);
    render(<ScrollReveal />);
    expect(foot).toHaveAttribute("data-reveal", "waiting");
  });

  it("reveals on arrival, and only what has arrived", () => {
    const [first, second] = page(SCREEN + 1, SCREEN + 2);
    render(<ScrollReveal />);
    enter(first!);
    expect(first).toHaveAttribute("data-reveal", "in");
    expect(second).toHaveAttribute("data-reveal", "waiting");
  });

  it("does nothing for an entry that is not on screen", () => {
    const [el] = page(SCREEN + 1);
    render(<ScrollReveal />);
    enter(el!, false);
    expect(el).toHaveAttribute("data-reveal", "waiting");
    expect(observed.has(el!)).toBe(true);
  });

  it("plays once: it stops watching what has been revealed", () => {
    const [el] = page(SCREEN + 1);
    render(<ScrollReveal />);
    enter(el!);
    expect(observed.has(el!)).toBe(false);
  });

  it("waits until a little above the screen's foot, so the rise is seen", () => {
    page(SCREEN + 1);
    render(<ScrollReveal />);
    expect(options?.rootMargin).toBe(REVEAL_MARGIN);
    expect(REVEAL_MARGIN).toBe("0px 0px -10% 0px");
  });

  it("hides nothing under reduced motion", () => {
    reduced = true;
    const [el] = page(SCREEN + 1);
    render(<ScrollReveal />);
    expect(el).toHaveAttribute("data-reveal", "");
    expect(observed.size).toBe(0);
  });

  it("leaves everything visible when it unmounts, so nothing stays hidden", () => {
    const [waiting, revealed] = page(SCREEN + 1, SCREEN + 2);
    const { unmount } = render(<ScrollReveal />);
    enter(revealed!);
    unmount();
    expect(waiting).toHaveAttribute("data-reveal", "");
    expect(revealed).toHaveAttribute("data-reveal", "");
    expect(disconnect).toHaveBeenCalled();
  });

  it("survives development's mount, unmount and mount again", () => {
    const [el] = page(SCREEN + 1);
    render(
      <StrictMode>
        <ScrollReveal />
      </StrictMode>,
    );
    expect(el).toHaveAttribute("data-reveal", "waiting");
    expect(observed.has(el!)).toBe(true);
  });

  it("does nothing on a page with nothing to reveal", () => {
    render(<ScrollReveal />);
    expect(observed.size).toBe(0);
  });
});
