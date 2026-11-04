import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";

import { ROLL_MS, ROLL_STEP_MS, RollingFigures } from "../RollingFigures";

/**
 * The roll is an attribute over the real text, so what can go wrong silently is
 * a figure changed, a roll that never ends, or one under reduced motion.
 */

let onSeen: IntersectionObserverCallback;
const disconnect = jest.fn();
const observe = jest.fn();
let reduced = false;

beforeEach(() => {
  jest.useFakeTimers();
  disconnect.mockClear();
  observe.mockClear();
  reduced = false;
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      constructor(callback: IntersectionObserverCallback) {
        onSeen = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: reduced }),
  });
});
afterEach(() => jest.useRealTimers());

const setup = () =>
  render(
    <RollingFigures className="grid">
      <li>
        <span data-stat-value="">150+</span> clients
      </li>
      <li>
        <span data-stat-value="">90%</span> renewals
      </li>
    </RollingFigures>,
  );
const figure = (text: string) => screen.getByText(text);
const enter = (isIntersecting = true) =>
  act(() => {
    onSeen([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe("RollingFigures", () => {
  it("is the list, with the class it is given and its children", () => {
    setup();
    expect(screen.getByRole("list")).toHaveClass("grid");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("waits at zero, keeping each figure's own suffix, until it comes on screen", () => {
    setup();
    expect(figure("150+")).toHaveAttribute("data-roll", "0+");
    expect(figure("90%")).toHaveAttribute("data-roll", "0%");
    advance(ROLL_MS);
    expect(figure("150+")).toHaveAttribute("data-roll", "0+");
  });

  it("does not start for an entry that is not on screen", () => {
    setup();
    enter(false);
    advance(ROLL_MS);
    expect(figure("150+")).toHaveAttribute("data-roll", "0+");
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("only ever climbs, fast at first, and never passes the figure", () => {
    setup();
    enter();
    const seen: number[] = [];
    for (let at = ROLL_STEP_MS; at < ROLL_MS - ROLL_STEP_MS; at += ROLL_STEP_MS) {
      advance(ROLL_STEP_MS);
      seen.push(parseInt(figure("150+").getAttribute("data-roll") ?? "", 10));
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(Math.max(...seen)).toBeLessThanOrEqual(150);
    // Past half of it inside the first fifth of the time.
    expect(seen[Math.floor(seen.length / 5)]).toBeGreaterThan(75);
  });

  it("ends with the attribute gone, leaving the real figure, in about 1.4s", () => {
    setup();
    enter();
    expect(ROLL_MS).toBe(1400);
    advance(ROLL_MS + ROLL_STEP_MS);
    expect(figure("150+")).not.toHaveAttribute("data-roll");
    expect(figure("90%")).not.toHaveAttribute("data-roll");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("never changes the figure's real text, at any point in the roll", () => {
    setup();
    enter();
    for (const ms of [0, ROLL_STEP_MS * 3, ROLL_MS / 2, ROLL_MS]) {
      advance(ms);
      expect(screen.getAllByRole("listitem")[0]!.textContent).toBe("150+ clients");
    }
  });

  it("rolls once: it stops watching as soon as it starts", () => {
    setup();
    enter();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("does nothing under reduced motion", () => {
    reduced = true;
    setup();
    expect(figure("150+")).not.toHaveAttribute("data-roll");
    expect(observe).not.toHaveBeenCalled();
  });

  it("lets go on unmount, mid-roll, leaving no timer running", () => {
    const { unmount } = setup();
    enter();
    advance(ROLL_STEP_MS * 3);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });

  it("survives development's mount, unmount and mount again", () => {
    render(
      <StrictMode>
        <RollingFigures>
          <li>
            <span data-stat-value="">350+</span>
          </li>
        </RollingFigures>
      </StrictMode>,
    );
    enter();
    advance(ROLL_MS + ROLL_STEP_MS);
    expect(figure("350+")).not.toHaveAttribute("data-roll");
  });

  it("leaves a figure with no number to roll at nothing but its text", () => {
    render(
      <RollingFigures>
        <li>
          <span data-stat-value="">soon</span>
        </li>
      </RollingFigures>,
    );
    enter();
    advance(ROLL_MS + ROLL_STEP_MS);
    expect(figure("soon")).not.toHaveAttribute("data-roll");
  });
});
