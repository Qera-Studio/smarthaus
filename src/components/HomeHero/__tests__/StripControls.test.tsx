import { StrictMode } from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  DRAG_MIN_PX,
  DRIFT_RETURN,
  GLIDE_DECAY,
  GLIDE_STEP_MS,
  REVEAL_GUTTER_PX,
  SCROLL_SPEED,
  StripControls,
} from "../StripControls";

/**
 * The strip's pause button, and the hand on the strip: a mouse or finger
 * drag and a sideways trackpad swipe move it. jsdom runs no CSS animation and
 * lays nothing out, so the track carries a stand-in animation (duration and
 * currentTime) and a width, and the strip a scrollLeft.
 */

const DURATION = 64_000;
// The track holds two copies; one copy is 1600px, so one pixel is 40ms.
const TRACK_WIDTH = 3200;
const MS_PER_PX = DURATION / (TRACK_WIDTH / 2);

// jsdom has no PointerEvent; without one fireEvent drops clientX and
// pointerId. Same shim as HardwareStage.test.tsx.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? "";
  }
}

// Nor IntersectionObserver: the stand-in hands the test its callback, so a
// test says when the strip is on screen.
let onScreen: (visible: boolean) => void = () => {};
let observersDisconnected = 0;
class FakeIntersectionObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    onScreen = (visible) => act(() => callback([{ isIntersecting: visible }]));
  }
  observe() {}
  disconnect() {
    observersDisconnected += 1;
  }
}

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: FakeIntersectionObserver,
  });
});

// jsdom has no hit test either: by default nothing is under the pointer.
beforeEach(() => {
  document.elementFromPoint = () => null;
});

function setup({ animated = true, at = 0 }: { animated?: boolean; at?: number } = {}) {
  const utils = render(
    <section data-hero>
      <StripControls className="controls" buttonClassName="control" />
      <div data-hero-strip data-testid="strip">
        <div data-testid="track">
          <ul>
            <li>
              <a href="/solutions">View cameras</a>
            </li>
          </ul>
        </div>
      </div>
    </section>,
  );
  const strip = screen.getByTestId("strip");
  const track = screen.getByTestId("track");
  const animation = {
    currentTime: at,
    playState: "running",
    updatePlaybackRate: jest.fn(),
    effect: { getComputedTiming: () => ({ duration: DURATION }) },
  };
  track.getAnimations = () => (animated ? [animation as unknown as Animation] : []);
  track.getBoundingClientRect = () => ({ width: TRACK_WIDTH }) as DOMRect;
  strip.setPointerCapture = jest.fn();
  return {
    ...utils,
    strip,
    animation,
    link: screen.getByRole("link", { name: "View cameras" }),
    pause: screen.getByRole("button", { name: "Pause the images" }),
  };
}

/** A press at x, dragged to each of the later xs, then released. */
function drag(target: Element, xs: number[], init: PointerEventInit = {}) {
  const [first, ...rest] = xs;
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: first, ...init });
  for (const x of rest) fireEvent.pointerMove(target, { pointerId: 1, clientX: x, ...init });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: rest.at(-1) ?? first, ...init });
}

describe("StripControls", () => {
  describe("pause", () => {
    it("is the one button, small, with a hidden glyph", () => {
      const { pause } = setup();
      expect(screen.getAllByRole("button")).toEqual([pause]);
      expect(pause).toHaveAttribute("type", "button");
      expect(pause).toHaveClass("control");
      expect(pause.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(pause.querySelector("svg")).toHaveAttribute("width", "16");
    });

    it("has no arrows any more", () => {
      setup();
      expect(screen.queryByRole("button", { name: /Previous|Next/ })).toBeNull();
    });

    it("starts unpressed, with the strip running", () => {
      const { strip, pause } = setup();
      expect(pause).toHaveAttribute("aria-pressed", "false");
      expect(strip).not.toHaveAttribute("data-paused");
    });

    it("stops the strip on a press and starts it on a second", () => {
      const { strip, pause } = setup();
      fireEvent.click(pause);
      expect(pause).toHaveAttribute("aria-pressed", "true");
      expect(strip).toHaveAttribute("data-paused");
      fireEvent.click(pause);
      expect(pause).toHaveAttribute("aria-pressed", "false");
      expect(strip).not.toHaveAttribute("data-paused");
    });

    it("keeps its name and swaps its glyph", () => {
      const { pause } = setup();
      const glyph = () => pause.querySelector("path")?.getAttribute("d");
      const running = glyph();
      fireEvent.click(pause);
      expect(pause).toHaveAccessibleName("Pause the images");
      expect(glyph()).not.toBe(running);
    });

    it("is marked for the stylesheet to hide under reduced motion", () => {
      const { pause } = setup();
      expect(pause).toHaveAttribute("data-pause");
    });
  });

  describe("dragging, with the strip animating", () => {
    it("moves the strip with the hand: left is forward in the pass", () => {
      const { strip, animation } = setup({ at: 10_000 });
      drag(strip, [500, 450, 400]);
      expect(animation.currentTime).toBeCloseTo(10_000 + 100 * MS_PER_PX);
    });

    it("dragging right runs the pass backwards", () => {
      const { strip, animation } = setup({ at: 10_000 });
      drag(strip, [400, 460]);
      expect(animation.currentTime).toBeCloseTo(10_000 - 60 * MS_PER_PX);
    });

    it("wraps below zero into the end of the pass, the same picture", () => {
      const { strip, animation } = setup({ at: 0 });
      drag(strip, [400, 450]);
      expect(animation.currentTime).toBeCloseTo(DURATION - 50 * MS_PER_PX);
    });

    it("wraps past the end of a pass back to its start", () => {
      const { strip, animation } = setup({ at: DURATION - 10 * MS_PER_PX });
      drag(strip, [500, 470]);
      expect(animation.currentTime).toBeCloseTo(20 * MS_PER_PX);
    });

    it("ignores a wobble shorter than DRAG_MIN_PX", () => {
      const { strip, animation } = setup({ at: 10_000 });
      drag(strip, [500, 500 - (DRAG_MIN_PX - 1)]);
      expect(animation.currentTime).toBe(10_000);
      expect(strip.setPointerCapture).not.toHaveBeenCalled();
    });

    it("holds the strip still under the hand, and lets it go after", () => {
      const { strip } = setup();
      fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientX: 500 });
      fireEvent.pointerMove(strip, { pointerId: 1, clientX: 450 });
      expect(strip).toHaveAttribute("data-dragging");
      expect(strip.setPointerCapture).toHaveBeenCalledWith(1);
      fireEvent.pointerUp(strip, { pointerId: 1, clientX: 450 });
      expect(strip).not.toHaveAttribute("data-dragging");
    });

    it("lets go when the browser takes the gesture", () => {
      const { strip } = setup();
      fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientX: 500 });
      fireEvent.pointerMove(strip, { pointerId: 1, clientX: 450 });
      fireEvent.pointerCancel(strip, { pointerId: 1 });
      expect(strip).not.toHaveAttribute("data-dragging");
    });

    it("ignores a right or middle button", () => {
      const { strip, animation } = setup({ at: 10_000 });
      drag(strip, [500, 400], { button: 2 });
      expect(animation.currentTime).toBe(10_000);
    });

    it("follows the hand off the strip, over whatever covers it", () => {
      // Found 2026-10-28: a drag that crossed the consent banner before the
      // threshold lost every move to the banner and never started.
      const { strip, animation } = setup({ at: 10_000 });
      const banner = document.createElement("div");
      document.body.append(banner);
      fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientX: 500 });
      fireEvent.pointerMove(banner, { pointerId: 1, clientX: 450 });
      fireEvent.pointerMove(banner, { pointerId: 1, clientX: 400 });
      fireEvent.pointerUp(banner, { pointerId: 1, clientX: 400 });
      expect(animation.currentTime).toBeCloseTo(10_000 + 100 * MS_PER_PX);
      expect(strip).not.toHaveAttribute("data-dragging");
      banner.remove();
    });

    it("stops following once the press is released", () => {
      const { strip, animation } = setup({ at: 10_000 });
      drag(strip, [500, 450]);
      const after = animation.currentTime;
      fireEvent.pointerMove(document.body, { pointerId: 1, clientX: 100 });
      expect(animation.currentTime).toBe(after);
    });

    it("ignores a second pointer's moves", () => {
      const { strip, animation } = setup({ at: 10_000 });
      fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientX: 500 });
      fireEvent.pointerMove(strip, { pointerId: 2, clientX: 300 });
      expect(animation.currentTime).toBe(10_000);
    });
  });

  describe("a card's link", () => {
    const click = (link: Element) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      return event;
    };

    it("opens on a plain click", () => {
      const { link } = setup();
      expect(click(link).defaultPrevented).toBe(false);
    });

    it("does not open when a drag ended on it", () => {
      const { strip, link } = setup();
      drag(strip, [500, 400]);
      expect(click(link).defaultPrevented).toBe(true);
    });

    it("opens again on the next plain click after a drag", () => {
      const { strip, link } = setup();
      drag(strip, [500, 400]);
      click(link);
      fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientX: 500 });
      fireEvent.pointerUp(strip, { pointerId: 1, clientX: 500 });
      expect(click(link).defaultPrevented).toBe(false);
    });
  });

  describe("a trackpad", () => {
    const wheel = (target: Element, deltaX: number, deltaY: number) => {
      const event = new WheelEvent("wheel", { deltaX, deltaY, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    it("swiped sideways moves the strip and keeps the page still", () => {
      const { strip, animation } = setup({ at: 10_000 });
      const event = wheel(strip, 30, 2);
      expect(animation.currentTime).toBeCloseTo(10_000 + 30 * MS_PER_PX);
      expect(event.defaultPrevented).toBe(true);
    });

    it("swiped up or down is left to the page", () => {
      const { strip, animation } = setup({ at: 10_000 });
      const event = wheel(strip, 3, 40);
      expect(animation.currentTime).toBe(10_000);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("under reduced motion, with no animation", () => {
    it("a drag scrolls the strip instead", () => {
      const { strip } = setup({ animated: false });
      strip.scrollLeft = 200;
      drag(strip, [500, 440]);
      expect(strip.scrollLeft).toBe(260);
    });

    it("a sideways swipe scrolls it too", () => {
      const { strip } = setup({ animated: false });
      strip.scrollLeft = 200;
      strip.dispatchEvent(
        new WheelEvent("wheel", { deltaX: 50, deltaY: 0, bubbles: true, cancelable: true }),
      );
      expect(strip.scrollLeft).toBe(250);
    });
  });

  describe("keyboard focus on a card off screen", () => {
    // A 360px screen, and a card wherever each test puts it.
    function place(strip: HTMLElement, left: number, width = 200) {
      strip.getBoundingClientRect = () => ({ left: 0, right: 360, width: 360 }) as DOMRect;
      const card = strip.querySelector("li")!;
      card.getBoundingClientRect = () => ({ left, right: left + width, width }) as DOMRect;
      return card;
    }

    // Synchronous: the reveal happens in the focus event, before the browser
    // would scroll anything.
    const focusCard = (link: HTMLElement) => link.focus();

    it("brings a card past the right edge fully in, a gutter from the edge", () => {
      const { strip, animation, link } = setup({ at: 10_000 });
      place(strip, 300);
      focusCard(link);
      // Its right edge was 500; it goes to 360 - gutter, so 156px left.
      const moved = 500 - (360 - REVEAL_GUTTER_PX);
      expect(animation.currentTime).toBeCloseTo(10_000 + moved * MS_PER_PX);
    });

    it("brings a card past the left edge fully in", () => {
      const { strip, animation, link } = setup({ at: 10_000 });
      place(strip, -120);
      focusCard(link);
      const moved = REVEAL_GUTTER_PX - -120;
      expect(animation.currentTime).toBeCloseTo(10_000 - moved * MS_PER_PX);
    });

    it("lines a card wider than the gap up by its start edge", () => {
      const { strip, animation, link } = setup({ at: 10_000 });
      place(strip, 40, 348);
      focusCard(link);
      const moved = REVEAL_GUTTER_PX - 40;
      expect(animation.currentTime).toBeCloseTo(10_000 - moved * MS_PER_PX);
    });

    it("never wraps a reveal round the pass: it stops at the pass's start", () => {
      // Found 2026-10-28: near the start of a pass, a small nudge right
      // wrapped to the end, where the first copy (the focusable one) sits a
      // whole copy's width off screen.
      const { strip, animation, link } = setup({ at: 5 * MS_PER_PX });
      place(strip, -10);
      focusCard(link);
      expect(animation.currentTime).toBe(0);
    });

    it("nor past its end", () => {
      const { strip, animation, link } = setup({ at: DURATION - 5 * MS_PER_PX });
      place(strip, 300);
      focusCard(link);
      expect(animation.currentTime).toBe(DURATION - 1);
    });

    it("a drag still wraps, since there the picture is all that matters", () => {
      const { strip, animation } = setup({ at: 5 * MS_PER_PX });
      drag(strip, [400, 420]);
      expect(animation.currentTime).toBeCloseTo(DURATION - 15 * MS_PER_PX);
    });

    it("leaves a card that is already in view where it is", () => {
      const { strip, animation, link } = setup({ at: 10_000 });
      place(strip, 60);
      focusCard(link);
      expect(animation.currentTime).toBe(10_000);
    });

    it("hands the browser's scroll to the animation and puts the scroll back to 0", () => {
      const { strip, animation, link } = setup({ at: 10_000 });
      place(strip, 60);
      strip.scrollLeft = 300;
      focusCard(link);
      expect(strip.scrollLeft).toBe(0);
      expect(animation.currentTime).toBeCloseTo(10_000 + 300 * MS_PER_PX);
    });

    it("does the same for a scroll that came from anywhere else", () => {
      const { strip, animation } = setup({ at: 10_000 });
      strip.scrollLeft = 120;
      fireEvent.scroll(strip);
      expect(strip.scrollLeft).toBe(0);
      expect(animation.currentTime).toBeCloseTo(10_000 + 120 * MS_PER_PX);
    });

    it("leaves a reduced-motion strip to the browser, which scrolls it properly", () => {
      const { strip, link } = setup({ animated: false });
      place(strip, 300);
      strip.scrollLeft = 300;
      focusCard(link);
      expect(strip.scrollLeft).toBe(300);
    });
  });

  describe("the card under the pointer", () => {
    // jsdom has no layout, so no hit test: the pointer's x picks the card.
    function cards() {
      const { strip, unmount } = setup();
      const list = strip.querySelector("ul")!;
      list.append(document.createElement("li"));
      const [a, b] = Array.from(list.children) as [Element, Element];
      let under: Element | null = a;
      document.elementFromPoint = jest.fn((x: number) => (x < 0 ? null : under));
      const moveUnder = (card: Element | null) => (under = card);
      return { strip, unmount, a, b, moveUnder };
    }

    it("tells the stylesheet hover is tracked here", () => {
      const { strip } = setup();
      expect(strip).toHaveAttribute("data-hand");
    });

    it("marks the card the mouse is over, and only that one", () => {
      const { strip, a, b, moveUnder } = cards();
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 10, clientY: 10 });
      expect(a).toHaveAttribute("data-hover");
      moveUnder(b);
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 20, clientY: 10 });
      expect(b).toHaveAttribute("data-hover");
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("moves the mark when a swipe carries a new card under a still pointer", () => {
      const { strip, a, b, moveUnder } = cards();
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 10, clientY: 10 });
      moveUnder(b);
      fireEvent.wheel(strip, { deltaX: 120, deltaY: 0, clientX: 10, clientY: 10 });
      expect(b).toHaveAttribute("data-hover");
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("moves it when a drag ends with another card under the hand", () => {
      const { strip, a, b, moveUnder } = cards();
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 300, clientY: 10 });
      expect(a).toHaveAttribute("data-hover");
      moveUnder(b);
      drag(strip, [300, 200, 100], { pointerType: "mouse" });
      expect(b).toHaveAttribute("data-hover");
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("clears it when the pointer leaves the strip", () => {
      const { strip, a } = cards();
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 10, clientY: 10 });
      fireEvent.pointerLeave(strip);
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("marks nothing for a finger, which has no hover", () => {
      const { strip, a } = cards();
      fireEvent.pointerMove(strip, { pointerType: "touch", clientX: 10, clientY: 10 });
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("marks nothing outside the strip", () => {
      const { strip, a, moveUnder } = cards();
      moveUnder(document.body);
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 10, clientY: 10 });
      expect(a).not.toHaveAttribute("data-hover");
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: -1, clientY: 10 });
      expect(a).not.toHaveAttribute("data-hover");
    });

    it("takes its marks away when it unmounts", () => {
      const { strip, a, unmount } = cards();
      fireEvent.pointerMove(strip, { pointerType: "mouse", clientX: 10, clientY: 10 });
      unmount();
      expect(a).not.toHaveAttribute("data-hover");
      expect(strip).not.toHaveAttribute("data-hand");
    });
  });

  it("stops the browser's own image drag from taking the gesture", () => {
    const { strip } = setup();
    const event = new Event("dragstart", { bubbles: true, cancelable: true });
    strip.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets go of the strip when it unmounts", () => {
    const { strip, animation, unmount } = setup({ at: 10_000 });
    unmount();
    drag(strip, [500, 400]);
    expect(animation.currentTime).toBe(10_000);
  });

  it("does not throw with no strip on the page", () => {
    render(<StripControls />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  describe("the page's scroll", () => {
    /** Scrolls the page to y and tells the listeners. */
    const scrollTo = (y: number) => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: y });
      fireEvent.scroll(window);
    };
    /** The speed a scroll of dy adds at once, on top of the drift's 1. */
    const extra = (dy: number) =>
      (dy * MS_PER_PX * SCROLL_SPEED * (1 - GLIDE_DECAY)) / GLIDE_STEP_MS;
    const lastRate = (animation: { updatePlaybackRate: jest.Mock }) =>
      animation.updatePlaybackRate.mock.calls.at(-1)?.[0] as number;
    /** Every speed set from here until the glide ends. */
    const runOut = (animation: { updatePlaybackRate: jest.Mock }) => {
      animation.updatePlaybackRate.mockClear();
      act(() => {
        jest.advanceTimersByTime(GLIDE_STEP_MS * 400);
      });
      return animation.updatePlaybackRate.mock.calls.map((call) => call[0] as number);
    };

    beforeEach(() => {
      jest.useFakeTimers();
      scrollTo(0);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test("never jumps: it changes the drift's speed, and not where it is", () => {
      const { animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(100);
      expect(animation.currentTime).toBe(10_000);
      expect(lastRate(animation)).toBeCloseTo(1 + extra(100));
    });

    test("a scroll up runs it backwards, at the scroll's speed alone", () => {
      const { animation } = setup({ at: 200_000 });
      scrollTo(5000);
      onScreen(true);
      scrollTo(4000);
      expect(lastRate(animation)).toBeCloseTo(extra(-1000));
      expect(lastRate(animation)).toBeLessThan(0);
    });

    test("no bounce: after a scroll up it comes to rest, then the drift eases back", () => {
      const { strip, animation } = setup({ at: 200_000 });
      scrollTo(1000);
      onScreen(true);
      scrollTo(800);
      const rates = runOut(animation);
      // Only ever rising, with no step up larger than the gentle return once
      // the scroll's part has run out: it never snaps back to full drift.
      for (let i = 1; i < rates.length; i += 1) {
        expect(rates[i]!).toBeGreaterThanOrEqual(rates[i - 1]!);
        if (rates[i - 1]! >= 0)
          expect(rates[i]! - rates[i - 1]!).toBeLessThanOrEqual(DRIFT_RETURN + 1e-9);
      }
      expect(rates.at(-1)).toBe(1);
      expect(strip).not.toHaveAttribute("data-gliding");
    });

    test("the speed eases away, step by step, and hands back to the drift", () => {
      const { strip, animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(100);
      const rates = runOut(animation);
      for (let i = 1; i < rates.length; i += 1) {
        expect(rates[i]!).toBeLessThanOrEqual(rates[i - 1]!);
      }
      expect(rates.at(-1)).toBe(1);
      expect(strip).not.toHaveAttribute("data-gliding");
    });

    test("has a short tail, so nothing glides on long after the scroll stops", () => {
      const { strip, animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(400);
      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      expect(strip).not.toHaveAttribute("data-gliding");
      expect(lastRate(animation)).toBe(1);
    });

    test("over the whole glide it runs SCROLL_SPEED pixels for every pixel scrolled", () => {
      const { animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(300);
      const first = lastRate(animation);
      const rates = [first, ...runOut(animation)];
      const ms = rates.slice(0, -1).reduce((sum, rate) => sum + (rate - 1) * GLIDE_STEP_MS, 0);
      // Within what GLIDE_END cuts off the tail.
      expect(Math.abs(ms / MS_PER_PX - 300 * SCROLL_SPEED)).toBeLessThan(5);
    });

    test("is a little faster than the 1 it was", () => {
      expect(SCROLL_SPEED).toBe(1.5);
    });

    test("another scroll while it glides adds to the speed already there", () => {
      const { animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(100);
      const once = lastRate(animation);
      scrollTo(200);
      expect(lastRate(animation)).toBeGreaterThan(once);
    });

    test("going backwards never reaches zero, where an animation would end", () => {
      const { animation } = setup({ at: 1000 });
      onScreen(true);
      scrollTo(5000);
      runOut(animation);
      Object.defineProperty(window, "scrollY", { configurable: true, value: 5000 });
      animation.currentTime = 1000;
      scrollTo(0);
      // Whole passes on: the same picture.
      expect(animation.currentTime).toBe(1000 + DURATION * 4);
    });

    test("forwards, it leaves the clock alone however near the start", () => {
      const { animation } = setup({ at: 5 });
      onScreen(true);
      scrollTo(100);
      expect(animation.currentTime).toBe(5);
    });

    test("does nothing until any of the strip is on screen, and nothing once it has left", () => {
      const { animation } = setup({ at: 1000 });
      scrollTo(100);
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
      onScreen(true);
      onScreen(false);
      scrollTo(300);
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
    });

    test("counts from where the page was when the strip came on screen", () => {
      const { animation } = setup({ at: 1000 });
      scrollTo(900);
      onScreen(true);
      scrollTo(910);
      expect(lastRate(animation)).toBeCloseTo(1 + extra(10));
    });

    test("runs a strip that hover or the pause button holds, with no drift to add to", () => {
      const { strip, animation } = setup({ at: 1000 });
      animation.playState = "paused";
      onScreen(true);
      scrollTo(50);
      expect(strip).toHaveAttribute("data-gliding");
      expect(lastRate(animation)).toBeCloseTo(extra(50));
    });

    test("the pause button pressed mid-glide stops it", () => {
      const { strip, animation, pause } = setup({ at: 1000 });
      onScreen(true);
      scrollTo(100);
      fireEvent.click(pause);
      act(() => {
        jest.advanceTimersByTime(GLIDE_STEP_MS);
      });
      expect(strip).not.toHaveAttribute("data-gliding");
      expect(lastRate(animation)).toBe(1);
    });

    test("leaves the strip alone while keyboard focus is in it", () => {
      const { animation, link } = setup({ at: 1000 });
      link.focus();
      animation.updatePlaybackRate.mockClear();
      onScreen(true);
      scrollTo(100);
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
    });

    test("a card taking focus ends a glide at once", () => {
      const { strip, animation, link } = setup({ at: 1000 });
      onScreen(true);
      scrollTo(100);
      act(() => link.focus());
      expect(strip).not.toHaveAttribute("data-gliding");
      expect(lastRate(animation)).toBe(1);
    });

    test("a press ends a glide at once, and a drag is not disturbed by the scroll", () => {
      const { strip, animation } = setup({ at: 10_000 });
      onScreen(true);
      scrollTo(100);
      fireEvent.pointerDown(strip, { button: 0, clientX: 500, pointerId: 1 });
      expect(strip).not.toHaveAttribute("data-gliding");
      expect(lastRate(animation)).toBe(1);
      fireEvent.pointerMove(window, { clientX: 400, pointerId: 1 });
      animation.updatePlaybackRate.mockClear();
      scrollTo(300);
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
      fireEvent.pointerUp(window, { pointerId: 1 });
    });

    test("leaves the strip alone under reduced motion, where it does not drift", () => {
      const { strip } = setup({ animated: false });
      strip.scrollLeft = 50;
      onScreen(true);
      scrollTo(100);
      expect(strip.scrollLeft).toBe(50);
      expect(strip).not.toHaveAttribute("data-gliding");
    });

    test("does nothing on a strip that has no track yet", () => {
      render(
        <section data-hero>
          <StripControls />
          <div data-hero-strip />
        </section>,
      );
      onScreen(true);
      expect(() => scrollTo(100)).not.toThrow();
    });

    test("ends if the animation goes away mid-glide", () => {
      const { strip, animation } = setup({ at: 1000 });
      onScreen(true);
      scrollTo(100);
      screen.getByTestId("track").getAnimations = () => [];
      animation.updatePlaybackRate.mockClear();
      act(() => {
        jest.advanceTimersByTime(GLIDE_STEP_MS);
      });
      expect(strip).not.toHaveAttribute("data-gliding");
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
    });

    test("stops listening, observing and gliding on unmount", () => {
      const { animation, unmount } = setup({ at: 1000 });
      onScreen(true);
      scrollTo(100);
      const before = observersDisconnected;
      unmount();
      expect(observersDisconnected).toBe(before + 1);
      animation.updatePlaybackRate.mockClear();
      scrollTo(300);
      act(() => {
        jest.advanceTimersByTime(GLIDE_STEP_MS * 5);
      });
      expect(animation.updatePlaybackRate).not.toHaveBeenCalled();
    });
  });

  describe("the opening", () => {
    afterEach(() => document.documentElement.removeAttribute("data-intro"));

    /** An animationend on `target`, named as CSS Modules hashes it. */
    const ended = (target: Element, name: string) => {
      const event = new Event("animationend", { bubbles: true });
      Object.defineProperty(event, "animationName", { value: `HomeHero-module__x__${name}` });
      fireEvent(target, event);
    };

    test("leaves data-intro on <html> while the opening plays", () => {
      document.documentElement.setAttribute("data-intro", "");
      setup();
      expect(document.documentElement.hasAttribute("data-intro")).toBe(true);
    });

    test("takes it off once the strip has arrived, so a soft navigation back finds the hero at rest", () => {
      document.documentElement.setAttribute("data-intro", "");
      const { strip } = setup();
      ended(strip, "hero-arrive");
      expect(document.documentElement.hasAttribute("data-intro")).toBe(false);
    });

    test("not when another animation ends, or one inside the strip", () => {
      document.documentElement.setAttribute("data-intro", "");
      const { strip, link } = setup();
      ended(strip, "hero-in");
      ended(link, "hero-arrive");
      expect(document.documentElement.hasAttribute("data-intro")).toBe(true);
    });

    test("survives development's mount, unmount and mount again", () => {
      document.documentElement.setAttribute("data-intro", "");
      render(
        <StrictMode>
          <section data-hero>
            <StripControls />
            <div data-hero-strip />
          </section>
        </StrictMode>,
      );
      expect(document.documentElement.hasAttribute("data-intro")).toBe(true);
    });

    test("stops listening on unmount", () => {
      document.documentElement.setAttribute("data-intro", "");
      const { strip, unmount } = setup();
      unmount();
      expect(document.documentElement.hasAttribute("data-intro")).toBe(true);
      ended(strip, "hero-arrive");
      expect(document.documentElement.hasAttribute("data-intro")).toBe(true);
    });
  });
});
