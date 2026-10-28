import { fireEvent, render, screen } from "@testing-library/react";

import { CarouselPause } from "../CarouselPause";

/**
 * The strip's pause button: a toggle that says what it does, and the
 * data-paused flag on its parent that the stylesheet stops the strip on.
 */

function renderInStrip() {
  render(
    <div data-testid="strip">
      <CarouselPause className="pause" />
    </div>,
  );
  return {
    strip: screen.getByTestId("strip"),
    button: screen.getByRole("button", { name: "Pause the images" }),
  };
}

describe("CarouselPause", () => {
  it("starts unpressed, with the strip running", () => {
    const { strip, button } = renderInStrip();
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(strip).not.toHaveAttribute("data-paused");
  });

  it("is a real button, so it never submits a form", () => {
    const { button } = renderInStrip();
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("pauses the strip on a press", () => {
    const { strip, button } = renderInStrip();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(strip).toHaveAttribute("data-paused");
  });

  it("resumes on a second press", () => {
    const { strip, button } = renderInStrip();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(strip).not.toHaveAttribute("data-paused");
  });

  it("keeps its name while the state changes, so AT hears pressed, not a new control", () => {
    const { button } = renderInStrip();
    fireEvent.click(button);
    expect(button).toHaveAccessibleName("Pause the images");
  });

  it("swaps the glyph to play while paused", () => {
    const { button } = renderInStrip();
    const glyph = () => button.querySelector("path")?.getAttribute("d");
    const running = glyph();
    fireEvent.click(button);
    expect(glyph()).not.toBe(running);
    fireEvent.click(button);
    expect(glyph()).toBe(running);
  });

  it("hides its glyph from AT", () => {
    const { button } = renderInStrip();
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("passes its class through", () => {
    const { button } = renderInStrip();
    expect(button).toHaveClass("pause");
  });
});
