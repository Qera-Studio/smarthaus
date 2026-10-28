import { act, fireEvent, render, screen } from "@testing-library/react";

import { CARDS_PER_PASS, EDGE_SLACK, NUDGE_MS, StripControls } from "../StripControls";

/**
 * The strip's buttons. Pause toggles data-paused on the strip; the arrows
 * glide the strip's CSS animation one card and pin it on the card's edge.
 * jsdom runs no CSS animation, so the track carries a stand-in with the
 * three things the arrows touch: its duration, currentTime and playbackRate.
 */

const DURATION = 80_000;
const CARD = DURATION / CARDS_PER_PASS;

type FakeAnimation = {
  currentTime: number;
  playbackRate: number;
  effect: unknown;
  pause: jest.Mock;
};

function setup({ animated = true, at = 0 }: { animated?: boolean; at?: number } = {}) {
  render(
    <section data-hero>
      <StripControls className="controls" buttonClassName="control" />
      <div data-hero-strip data-testid="strip">
        <div data-testid="track">
          <ul>
            <li>card</li>
          </ul>
        </div>
      </div>
    </section>,
  );
  const strip = screen.getByTestId("strip");
  const track = screen.getByTestId("track");
  const animation: FakeAnimation = {
    currentTime: at,
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ duration: DURATION }) },
    pause: jest.fn(),
  };
  track.getAnimations = () => (animated ? [animation as unknown as Animation] : []);
  strip.scrollBy = jest.fn() as unknown as typeof strip.scrollBy;
  // jsdom lays nothing out; a card is 300px wide here.
  strip.querySelector("li")!.getBoundingClientRect = () => ({ width: 300 }) as DOMRect;
  return {
    strip,
    animation,
    prev: screen.getByRole("button", { name: "Previous image" }),
    pause: screen.getByRole("button", { name: "Pause the images" }),
    next: screen.getByRole("button", { name: "Next image" }),
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("StripControls", () => {
  it("renders previous, pause, next, in that order, as real buttons", () => {
    const { prev, pause, next } = setup();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toEqual([prev, pause, next]);
    for (const button of buttons) {
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass("control");
      expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  describe("pause", () => {
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

    it("is the one control the stylesheet hides under reduced motion", () => {
      const { prev, pause, next } = setup();
      expect(pause).toHaveAttribute("data-pause");
      expect(prev).not.toHaveAttribute("data-pause");
      expect(next).not.toHaveAttribute("data-pause");
    });
  });

  describe("the arrows, with the strip animating", () => {
    it("next glides forward to the next card's edge in NUDGE_MS", () => {
      const { strip, animation, next } = setup({ at: CARD * 2.5 });
      fireEvent.click(next);
      expect(strip).toHaveAttribute("data-nudging");
      expect(animation.playbackRate).toBeCloseTo((CARD * 3 - CARD * 2.5) / NUDGE_MS);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 3);
      expect(animation.playbackRate).toBe(1);
      expect(strip).not.toHaveAttribute("data-nudging");
    });

    it("next from exactly on an edge goes a whole card", () => {
      const { animation, next } = setup({ at: CARD * 2 });
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 3);
    });

    it("previous glides backwards to the card edge behind", () => {
      const { animation, prev } = setup({ at: CARD * 2.5 });
      fireEvent.click(prev);
      expect(animation.playbackRate).toBeLessThan(0);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 2);
    });

    it("previous from the very start wraps a pass on, never below zero", () => {
      const { animation, prev } = setup({ at: 0 });
      fireEvent.click(prev);
      expect(animation.currentTime).toBeCloseTo(DURATION);
      expect(animation.playbackRate).toBeCloseTo(-CARD / NUDGE_MS);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(DURATION - CARD);
    });

    it("next past the end of a pass lands back inside it", () => {
      const { animation, next } = setup({ at: DURATION - CARD / 2 });
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(0);
    });

    it("two quick presses add up to two cards", () => {
      const { animation, next } = setup({ at: CARD });
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS / 2));
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 3);
    });

    it("a glide runs while paused and leaves the strip paused", () => {
      const { strip, pause, next } = setup({ at: CARD });
      fireEvent.click(pause);
      fireEvent.click(next);
      expect(strip).toHaveAttribute("data-nudging");
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(strip).not.toHaveAttribute("data-nudging");
      expect(strip).toHaveAttribute("data-paused");
    });

    it("previous from a frame past an edge steps back a whole card", () => {
      // A landing overshoots by a frame before the stylesheet pauses it;
      // found in Chrome on 2026-10-28, where previous moved 17ms and stopped.
      const { animation, prev } = setup({ at: CARD * 2 + 17 });
      fireEvent.click(prev);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD);
    });

    it("next from a frame short of an edge goes on to the edge after it", () => {
      const { animation, next } = setup({ at: CARD * 2 - CARD * (EDGE_SLACK / 2) });
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 3);
    });

    it("outside the slack, a part-way strip goes to the nearer edge ahead", () => {
      const { animation, prev } = setup({ at: CARD * 2 + CARD * EDGE_SLACK * 2 });
      fireEvent.click(prev);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.currentTime).toBeCloseTo(CARD * 2);
    });

    it("pins a paused strip exactly on the edge as it lands", () => {
      const { animation, pause, next } = setup({ at: CARD });
      fireEvent.click(pause);
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.pause).toHaveBeenCalledTimes(1);
    });

    it("leaves a running strip to run on after landing", () => {
      const { animation, next } = setup({ at: CARD });
      fireEvent.click(next);
      act(() => jest.advanceTimersByTime(NUDGE_MS));
      expect(animation.pause).not.toHaveBeenCalled();
    });

    it("never scrolls the strip while it animates", () => {
      const { strip, next } = setup();
      fireEvent.click(next);
      expect(strip.scrollBy).not.toHaveBeenCalled();
    });
  });

  describe("the arrows, under reduced motion", () => {
    it("scroll the strip one card either way, with no glide", () => {
      const { strip, prev, next } = setup({ animated: false });
      fireEvent.click(next);
      fireEvent.click(prev);
      const calls = (strip.scrollBy as jest.Mock).mock.calls.map(([options]) => options);
      expect(calls).toHaveLength(2);
      expect(calls).toEqual([
        { left: 300, behavior: "auto" },
        { left: -300, behavior: "auto" },
      ]);
      expect(strip).not.toHaveAttribute("data-nudging");
    });
  });

  it("does nothing, and does not throw, with no strip on the page", () => {
    render(<StripControls />);
    for (const name of ["Previous image", "Next image"]) {
      expect(() => fireEvent.click(screen.getByRole("button", { name }))).not.toThrow();
    }
  });
});
