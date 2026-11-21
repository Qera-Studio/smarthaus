import { fireEvent, render } from "@testing-library/react";

import { BRANDS_HOVER_RATE, StripControls } from "../StripControls";

/**
 * The makers' marks slow to a crawl under a pointer and pick up as it leaves
 * (Shivanshu, 2026-11-14: "like a snail"). Not a stop: the pause button is
 * the stop. The rate is the CSS animation's own, so nothing jumps; jsdom runs
 * no animation, so the marks' track carries a stand-in.
 */

beforeAll(() => {
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
  document.elementFromPoint = () => null;
});

function setup(animations = 1) {
  const view = render(
    <section data-hero>
      <div data-hero-brands data-testid="rail">
        <div data-testid="marks" />
      </div>
      <StripControls className="controls" buttonClassName="control" />
      <div data-hero-strip>
        <div />
      </div>
    </section>,
  );
  const rail = view.getByTestId("rail");
  const running = Array.from({ length: animations }, () => ({ updatePlaybackRate: jest.fn() }));
  view.getByTestId("marks").getAnimations = () => running as unknown as Animation[];
  return { ...view, rail, running };
}

describe("StripControls, on the makers' marks", () => {
  it("slows them to a crawl, not a stop", () => {
    expect(BRANDS_HOVER_RATE).toBeGreaterThan(0);
    expect(BRANDS_HOVER_RATE).toBeLessThanOrEqual(0.1);
  });

  it("slows the marks' own animation as a pointer arrives", () => {
    const { rail, running } = setup();
    fireEvent.pointerEnter(rail);
    expect(running[0]!.updatePlaybackRate).toHaveBeenCalledWith(BRANDS_HOVER_RATE);
  });

  it("brings them back to their own pace as it leaves", () => {
    const { rail, running } = setup();
    fireEvent.pointerEnter(rail);
    fireEvent.pointerLeave(rail);
    expect(running[0]!.updatePlaybackRate).toHaveBeenLastCalledWith(1);
  });

  it("slows every animation the marks carry, the opening's included", () => {
    const { rail, running } = setup(2);
    fireEvent.pointerEnter(rail);
    for (const animation of running) {
      expect(animation.updatePlaybackRate).toHaveBeenCalledWith(BRANDS_HOVER_RATE);
    }
  });

  it("does nothing where the marks are not animating, as under reduced motion", () => {
    const { rail } = setup(0);
    expect(() => fireEvent.pointerEnter(rail)).not.toThrow();
  });

  it("stops listening when the hero goes", () => {
    const { rail, running, unmount } = setup();
    unmount();
    fireEvent.pointerEnter(rail);
    expect(running[0]!.updatePlaybackRate).not.toHaveBeenCalled();
  });

  it("leaves the strip's pause button as the one stop", () => {
    const { rail, getByRole } = setup();
    fireEvent.pointerEnter(rail);
    expect(getByRole("button", { name: "Pause the images" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
