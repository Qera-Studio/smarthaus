import { fireEvent, render, screen } from "@testing-library/react";

import { DRAG_MIN_PX, StripControls } from "../StripControls";

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

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
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
});
