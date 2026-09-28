import { act, fireEvent, render, screen } from "@testing-library/react";

import type { HardwareItem } from "../../../content/hardware";
import { HardwareStage, SWIPE_MIN_PX } from "../HardwareStage";

/**
 * The hardware carousel's behaviour: which slide is shown, which way it
 * travels, and what moves it (tabs, keyboard, the two arrows, a sideways
 * swipe, the timer). Appearance is not asserted here: jsdom applies no CSS,
 * so the vertical push is covered in e2e/hardware.spec.ts.
 *
 * jsdom has no IntersectionObserver, no matchMedia and no Element.scrollTo,
 * so each is stubbed per test: what the component does with them is what is
 * under test.
 */

const ITEMS: readonly HardwareItem[] = ["Cameras", "Smart lock", "Curtains"].map((title, i) => ({
  id: `item-${i}`,
  title,
  description: `${title} description`,
  icon: `icon-${i}.svg`,
  image: { src: `image-${i}.avif`, width: 1600, height: 1200, alt: `${title} render` },
}));

// jsdom has no PointerEvent, and without one fireEvent falls back to a plain
// Event that drops clientX, pointerId and pointerType: every swipe would be
// NaN pixels long. A MouseEvent carries the coordinates; this adds the two
// pointer fields the component reads.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? "";
  }
}

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
});

type IoCallback = (entries: { isIntersecting: boolean }[]) => void;

let ioCallback: IoCallback | undefined;
let disconnected = 0;
let mediaListener: (() => void) | undefined;
let mediaRemoved = 0;
let reduced = false;
let scrollTo: jest.Mock;

beforeEach(() => {
  ioCallback = undefined;
  disconnected = 0;
  mediaListener = undefined;
  mediaRemoved = 0;
  reduced = false;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, fn: () => void) => {
        mediaListener = fn;
      },
      removeEventListener: () => {
        mediaRemoved += 1;
      },
    }),
  });

  class FakeIntersectionObserver {
    constructor(callback: IoCallback) {
      ioCallback = callback;
    }
    observe() {}
    disconnect() {
      disconnected += 1;
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });

  scrollTo = jest.fn();
  Object.defineProperty(Element.prototype, "scrollTo", { configurable: true, value: scrollTo });
});

const tab = (name: string) => screen.getByRole("tab", { name });
const panel = (i: number) => document.getElementById(`hardware-panel-item-${i}`)!;
const root = () => document.querySelector("[data-direction]")!;
const stage = () => panel(0).parentElement!;
const progress = () => document.querySelector("span[aria-hidden='true']");
const selected = () =>
  screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");

function swipe(dx: number, dy = 0, opts: { pointerType?: string; upId?: number } = {}) {
  const { pointerType = "touch", upId = 1 } = opts;
  fireEvent.pointerDown(stage(), { pointerId: 1, pointerType, clientX: 200, clientY: 300 });
  fireEvent.pointerUp(stage(), {
    pointerId: upId,
    pointerType,
    clientX: 200 + dx,
    clientY: 300 + dy,
  });
}

describe("HardwareStage", () => {
  describe("initial state", () => {
    it("selects the first tab and shows its panel only", () => {
      render(<HardwareStage items={ITEMS} />);
      expect(tab("Cameras")).toHaveAttribute("aria-selected", "true");
      expect(tab("Cameras")).toHaveAttribute("tabindex", "0");
      expect(tab("Smart lock")).toHaveAttribute("tabindex", "-1");
      expect(panel(0)).toHaveAttribute("data-state", "active");
      expect(panel(1)).not.toHaveAttribute("data-state");
    });

    it("renders every slide's copy in the HTML, visible or not", () => {
      render(<HardwareStage items={ITEMS} />);
      for (const item of ITEMS) {
        expect(screen.getByRole("heading", { level: 3, name: item.title })).toBeInTheDocument();
      }
    });

    it("labels the tablist and ties every tab to its panel", () => {
      render(<HardwareStage items={ITEMS} />);
      expect(screen.getByRole("tablist", { name: "Components" })).toBeInTheDocument();
      ITEMS.forEach((item, i) => {
        expect(tab(item.title)).toHaveAttribute("aria-controls", `hardware-panel-item-${i}`);
        expect(panel(i)).toHaveAttribute("aria-labelledby", `hardware-tab-item-${i}`);
      });
    });
  });

  describe("the arrow buttons", () => {
    it("puts previous first in the bar and next last, around the tabs and pause", () => {
      render(<HardwareStage items={ITEMS} />);
      const bar = screen.getByRole("tablist").parentElement!;
      const buttons = Array.from(bar.children).filter((el) => el.tagName === "BUTTON");
      expect(buttons[0]).toHaveAccessibleName("Previous component");
      expect(buttons.at(-1)).toHaveAccessibleName("Next component");
      expect(buttons.at(-2)).toHaveAccessibleName("Pause automatic advance");
    });

    it("next steps forward and travels up from below", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(selected()).toBe(1);
      expect(root()).toHaveAttribute("data-direction", "next");
    });

    it("previous steps back and travels down from above", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Curtains"));
      fireEvent.click(screen.getByRole("button", { name: "Previous component" }));
      expect(selected()).toBe(1);
      expect(root()).toHaveAttribute("data-direction", "prev");
    });

    it("next wraps from the last slide to the first, still travelling as next", () => {
      // Picking the direction from the index would call 2 -> 0 a "prev" and
      // run the wrap backwards.
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Curtains"));
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(selected()).toBe(0);
      expect(root()).toHaveAttribute("data-direction", "next");
    });

    it("previous wraps from the first slide to the last, still travelling as prev", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(screen.getByRole("button", { name: "Previous component" }));
      expect(selected()).toBe(2);
      expect(root()).toHaveAttribute("data-direction", "prev");
    });

    it("are plain buttons outside the tablist's roving tab order", () => {
      render(<HardwareStage items={ITEMS} />);
      for (const name of ["Previous component", "Next component"]) {
        const button = screen.getByRole("button", { name });
        expect(button).toHaveAttribute("type", "button");
        expect(button).not.toHaveAttribute("tabindex");
        expect(screen.getByRole("tablist")).not.toContainElement(button);
      }
    });

    it("stay available under reduced motion, where there is no pause", () => {
      reduced = true;
      render(<HardwareStage items={ITEMS} />);
      expect(screen.queryByRole("button", { name: "Pause automatic advance" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(selected()).toBe(1);
    });
  });

  describe("swipe", () => {
    it("a leftward swipe goes to the next slide", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20));
      expect(selected()).toBe(1);
      expect(root()).toHaveAttribute("data-direction", "next");
    });

    it("a rightward swipe goes to the previous slide", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(SWIPE_MIN_PX + 20);
      expect(selected()).toBe(2);
      expect(root()).toHaveAttribute("data-direction", "prev");
    });

    it("counts a swipe of exactly the threshold", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-SWIPE_MIN_PX);
      expect(selected()).toBe(1);
    });

    it("ignores a movement shorter than the threshold, which is a tap", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX - 1));
      expect(selected()).toBe(0);
    });

    it("ignores a gesture more vertical than horizontal, which is a scroll", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20), SWIPE_MIN_PX + 40);
      expect(selected()).toBe(0);
    });

    it("ignores an exactly diagonal gesture", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20), SWIPE_MIN_PX + 20);
      expect(selected()).toBe(0);
    });

    it("works for a pen as well as a finger", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20), 0, { pointerType: "pen" });
      expect(selected()).toBe(1);
    });

    it("ignores a mouse drag, which the image's own drag would take", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20), 0, { pointerType: "mouse" });
      expect(selected()).toBe(0);
    });

    it("ignores a lift from a different pointer than the one that went down", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20), 0, { upId: 2 });
      expect(selected()).toBe(0);
    });

    it("ignores a lift with no press before it", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.pointerUp(stage(), { pointerId: 1, pointerType: "touch", clientX: 0 });
      expect(selected()).toBe(0);
    });

    it("drops the gesture when the browser cancels it for a scroll", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.pointerDown(stage(), {
        pointerId: 1,
        pointerType: "touch",
        clientX: 200,
        clientY: 300,
      });
      fireEvent.pointerCancel(stage(), { pointerId: 1 });
      fireEvent.pointerUp(stage(), {
        pointerId: 1,
        pointerType: "touch",
        clientX: 100,
        clientY: 300,
      });
      expect(selected()).toBe(0);
    });

    it("forgets the press once lifted, so a later lift alone does nothing", () => {
      render(<HardwareStage items={ITEMS} />);
      swipe(-(SWIPE_MIN_PX + 20));
      fireEvent.pointerUp(stage(), {
        pointerId: 1,
        pointerType: "touch",
        clientX: 0,
        clientY: 300,
      });
      expect(selected()).toBe(1);
    });
  });

  describe("tabs and keyboard", () => {
    it("a click on a later tab travels as next, an earlier one as prev", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Curtains"));
      expect(root()).toHaveAttribute("data-direction", "next");
      fireEvent.click(tab("Cameras"));
      expect(root()).toHaveAttribute("data-direction", "prev");
      expect(selected()).toBe(0);
    });

    it("a click on the tab already shown changes nothing", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Cameras"));
      expect(panel(0)).toHaveAttribute("data-state", "active");
      expect(document.querySelector("[data-state='leaving']")).toBeNull();
    });

    it.each([
      ["ArrowRight", 1],
      ["ArrowDown", 1],
      ["ArrowLeft", 2],
      ["ArrowUp", 2],
      ["End", 2],
    ])("%s from the first tab selects and focuses tab %i", (key, expected) => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.keyDown(tab("Cameras"), { key });
      expect(selected()).toBe(expected);
      expect(screen.getAllByRole("tab")[expected]).toHaveFocus();
    });

    it("Home from a later tab goes back to the first", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Curtains"));
      fireEvent.keyDown(tab("Curtains"), { key: "Home" });
      expect(selected()).toBe(0);
    });

    it("leaves every other key to the browser", () => {
      render(<HardwareStage items={ITEMS} />);
      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      tab("Cameras").dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(selected()).toBe(0);
    });
  });

  describe("the push", () => {
    it("keeps the outgoing slide painted, and hidden from readers, until the incoming one lands", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(panel(0)).toHaveAttribute("data-state", "leaving");
      expect(panel(0)).toHaveAttribute("aria-hidden", "true");
      expect(panel(1)).toHaveAttribute("data-state", "active");

      fireEvent.animationEnd(panel(1));
      expect(panel(0)).not.toHaveAttribute("data-state");
      expect(panel(0)).not.toHaveAttribute("aria-hidden");
    });

    it("the outgoing slide's own animation end does not release it", () => {
      // Both slides animate now and end together; only the incoming one's end
      // may clear the outgoing slide, or a slower outgoing frame would vanish.
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      fireEvent.animationEnd(panel(0));
      expect(panel(0)).toHaveAttribute("data-state", "leaving");
    });

    it("an animation ending inside a slide does not release it", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      fireEvent.animationEnd(panel(1).querySelector("h3")!);
      expect(panel(0)).toHaveAttribute("data-state", "leaving");
    });
  });

  describe("keeping the selected tab in view", () => {
    it("scrolls only the strip, smoothly, when the slide changes", () => {
      render(<HardwareStage items={ITEMS} />);
      scrollTo.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.mock.contexts[0]).toBe(screen.getByRole("tablist"));
      expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: "smooth" });
    });

    it("jumps instead of gliding under reduced motion", () => {
      reduced = true;
      render(<HardwareStage items={ITEMS} />);
      scrollTo.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Next component" }));
      expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: "auto" });
    });
  });

  describe("the timer", () => {
    it("runs only while the section is on screen", () => {
      render(<HardwareStage items={ITEMS} />);
      expect(progress()).toHaveAttribute("data-running", "false");
      act(() => ioCallback?.([{ isIntersecting: true }]));
      expect(progress()).toHaveAttribute("data-running", "true");
      act(() => ioCallback?.([{ isIntersecting: false }]));
      expect(progress()).toHaveAttribute("data-running", "false");
    });

    it("treats an empty entry list as off screen", () => {
      render(<HardwareStage items={ITEMS} />);
      act(() => ioCallback?.([]));
      expect(progress()).toHaveAttribute("data-running", "false");
    });

    it("advances to the next slide when its line finishes, wrapping as next", () => {
      render(<HardwareStage items={ITEMS} />);
      fireEvent.click(tab("Curtains"));
      fireEvent.animationEnd(progress()!);
      expect(selected()).toBe(0);
      expect(root()).toHaveAttribute("data-direction", "next");
    });

    it("the pause button stops it, and a second press restarts it", () => {
      render(<HardwareStage items={ITEMS} />);
      act(() => ioCallback?.([{ isIntersecting: true }]));
      const pause = screen.getByRole("button", { name: "Pause automatic advance" });
      fireEvent.click(pause);
      expect(pause).toHaveAttribute("aria-pressed", "true");
      expect(progress()).toHaveAttribute("data-running", "false");
      fireEvent.click(pause);
      expect(pause).toHaveAttribute("aria-pressed", "false");
      expect(progress()).toHaveAttribute("data-running", "true");
    });

    it("never exists under reduced motion", () => {
      reduced = true;
      render(<HardwareStage items={ITEMS} />);
      expect(progress()).toBeNull();
    });

    it("follows a change to the reduced-motion setting after mount", () => {
      render(<HardwareStage items={ITEMS} />);
      expect(progress()).not.toBeNull();
      reduced = true;
      act(() => mediaListener?.());
      expect(progress()).toBeNull();
      expect(screen.queryByRole("button", { name: "Pause automatic advance" })).toBeNull();
    });
  });

  it("stops observing and listening on unmount", () => {
    const { unmount } = render(<HardwareStage items={ITEMS} />);
    unmount();
    expect(disconnected).toBe(1);
    expect(mediaRemoved).toBe(1);
  });
});
