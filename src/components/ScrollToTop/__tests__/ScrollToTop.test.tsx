import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ScrollToTop } from "../ScrollToTop";

type Entry = { target: Element; isIntersecting: boolean };

class FakeIO {
  static all: FakeIO[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(public callback: (entries: Entry[]) => void) {
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

const originalIO = window.IntersectionObserver;

beforeEach(() => {
  FakeIO.all = [];
  window.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  window.IntersectionObserver = originalIO;
  document.body.innerHTML = "";
});

function renderButton() {
  const utils = render(<ScrollToTop />);
  const button = screen.getByRole("button", { name: "Back to top", hidden: true });
  const sentinelIO = FakeIO.all[0]!;
  return { ...utils, button, sentinelIO };
}

describe("ScrollToTop", () => {
  it("stays hidden and out of the tab order until the page top has scrolled away", () => {
    const { button, sentinelIO } = renderButton();
    expect(button).not.toHaveAttribute("data-visible");
    expect(button).toHaveAttribute("inert");
    sentinelIO.deliver({ target: sentinelIO.observed[0]!, isIntersecting: false });
    expect(button).toHaveAttribute("data-visible");
    expect(button).not.toHaveAttribute("inert");
    sentinelIO.deliver({ target: sentinelIO.observed[0]!, isIntersecting: true });
    expect(button).toHaveAttribute("inert");
  });

  it("watches only the page top, not the grounds behind it", () => {
    // One colour everywhere since 2026-10-04: a dark section on the page is
    // no longer anything the button needs to know about.
    const footer = document.createElement("footer");
    footer.setAttribute("data-ground", "dark");
    document.body.append(footer);
    const { button, sentinelIO } = renderButton();
    expect(FakeIO.all).toHaveLength(1);
    expect(sentinelIO.observed).toEqual([button.previousElementSibling]);
    expect(button).not.toHaveAttribute("data-on-dark");
  });

  it("scrolls to the top smoothly, leaving reduced motion to the browser", () => {
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    const { button } = renderButton();
    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("disconnects its observer on unmount", () => {
    const { unmount, sentinelIO } = renderButton();
    unmount();
    expect(sentinelIO.disconnected).toBe(true);
  });
});

describe("ScrollToTop.module.scss", () => {
  // jsdom applies no CSS; e2e/scroll-to-top.spec.ts reads the computed colour.
  const scss = readFileSync(join(__dirname, "..", "ScrollToTop.module.scss"), "utf8");

  it("paints brown-600 with bone ink, and nothing that swaps them", () => {
    expect(scss).toMatch(/background-color:\s*#\{\$brown-600\};/);
    expect(scss).toMatch(/color:\s*#\{\$brown-50\};/);
    expect(scss).not.toMatch(/data-on-dark/);
    expect(scss.match(/background-color:/g)).toHaveLength(1);
  });
});
