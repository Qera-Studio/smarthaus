import { fireEvent, render, screen } from "@testing-library/react";

import { ValuesHover } from "../ValuesHover";

/**
 * The hover rule, as of 2026-10-07: a mouse resting on a value opens it,
 * leaving closes it unless it was clicked, and touch or pen never opens anything by passing
 * over it. jsdom does not run the native `name` exclusivity, so this suite
 * checks only what the island itself does; e2e/about.spec.ts checks the
 * one-at-a-time behaviour in real browsers.
 */

// jsdom has no PointerEvent, and fireEvent's fallback drops pointerType, the
// one field the island reads. Same fake as HardwareStage's suite.
class FakePointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? "";
  }
}

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
});

function setup() {
  render(
    <ValuesHover className="list">
      <details data-testid="one">
        <summary>One</summary>
        <p>First answer</p>
      </details>
      <details data-testid="two">
        <summary>Two</summary>
        <p>Second answer</p>
      </details>
      <p data-testid="outside">Not a row</p>
    </ValuesHover>,
  );
  return {
    one: screen.getByTestId("one") as HTMLDetailsElement,
    two: screen.getByTestId("two") as HTMLDetailsElement,
  };
}

const hover = (el: Element, pointerType: string) => fireEvent.pointerOver(el, { pointerType });
const leave = (el: Element, to: Element, pointerType = "mouse") =>
  fireEvent.pointerOut(el, { pointerType, relatedTarget: to });

describe("ValuesHover", () => {
  it("passes its class to the wrapper", () => {
    const { container } = render(
      <ValuesHover className="list">
        <span />
      </ValuesHover>,
    );
    expect(container.firstElementChild).toHaveClass("list");
  });

  it("adds no control of its own: no role, no tab stop", () => {
    // The wrapper only listens; the rows' own <summary> elements are the
    // controls, so the keyboard order and the accessibility tree are the
    // browser's alone.
    const { container } = render(
      <ValuesHover>
        <span />
      </ValuesHover>,
    );
    const wrapper = container.firstElementChild!;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper).not.toHaveAttribute("role");
    expect(wrapper).not.toHaveAttribute("tabindex");
  });

  it("opens a row a mouse moves onto", () => {
    const { one } = setup();
    hover(screen.getByText("One"), "mouse");
    expect(one.open).toBe(true);
  });

  it("opens a row from anywhere inside it, not only its summary", () => {
    const { two } = setup();
    hover(screen.getByText("Second answer"), "mouse");
    expect(two.open).toBe(true);
  });

  it.each(["touch", "pen", ""])("does nothing for a %s pointer", (pointerType) => {
    const { one } = setup();
    hover(screen.getByText("One"), pointerType);
    expect(one.open).toBe(false);
  });

  it("closes a row the hover opened when the mouse leaves it", () => {
    // 2026-10-07: replaced the earlier rule that a hovered row stays open.
    const { one } = setup();
    hover(screen.getByText("One"), "mouse");
    leave(screen.getByText("One"), screen.getByTestId("outside"));
    expect(one.open).toBe(false);
  });

  it("keeps it open while the mouse moves within the same row", () => {
    // pointerout fires from the summary to the answer below it.
    const { one } = setup();
    hover(screen.getByText("One"), "mouse");
    leave(screen.getByText("One"), screen.getByText("First answer"));
    expect(one.open).toBe(true);
  });

  it("hands over from one row to the next as the mouse travels down", () => {
    const { one, two } = setup();
    hover(screen.getByText("One"), "mouse");
    leave(screen.getByText("One"), screen.getByText("Two"));
    hover(screen.getByText("Two"), "mouse");
    expect(one.open).toBe(false);
    expect(two.open).toBe(true);
  });

  it("leaves a row the visitor clicked open when the mouse moves on", () => {
    const { one } = setup();
    hover(screen.getByText("One"), "mouse");
    fireEvent.click(screen.getByText("One"));
    leave(screen.getByText("One"), screen.getByTestId("outside"));
    expect(one.open).toBe(true);
  });

  it("never closes a row it did not open", () => {
    // Opened by a tap or the keyboard, then crossed by a mouse.
    const { one } = setup();
    one.open = true;
    leave(screen.getByText("One"), screen.getByTestId("outside"));
    expect(one.open).toBe(true);
  });

  it("ignores a touch leaving a row", () => {
    const { one } = setup();
    hover(screen.getByText("One"), "mouse");
    leave(screen.getByText("One"), screen.getByTestId("outside"), "touch");
    expect(one.open).toBe(true);
  });

  it("leaves an open row alone when hovered again", () => {
    // Re-setting `open` would fire another toggle event for nothing.
    const { one } = setup();
    one.open = true;
    const toggle = jest.fn();
    one.addEventListener("toggle", toggle);
    hover(screen.getByText("One"), "mouse");
    expect(one.open).toBe(true);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("ignores the mouse outside any row", () => {
    const { one, two } = setup();
    hover(screen.getByTestId("outside"), "mouse");
    expect(one.open).toBe(false);
    expect(two.open).toBe(false);
  });

  describe("a click after the hover", () => {
    const click = (text: string) => fireEvent.click(screen.getByText(text));

    it("does not shut the row the hover just opened", () => {
      // fireEvent returns false when the event's default was prevented.
      setup();
      hover(screen.getByText("One"), "mouse");
      expect(click("One")).toBe(false);
    });

    it("closes it on the next click, as a plain <details> would", () => {
      setup();
      hover(screen.getByText("One"), "mouse");
      click("One");
      expect(click("One")).toBe(true);
    });

    it("leaves a click alone when no hover opened the row", () => {
      // Touch, keyboard, or a row already open before the mouse arrived.
      setup();
      expect(click("Two")).toBe(true);
    });

    it("leaves a click on another row alone", () => {
      setup();
      hover(screen.getByText("One"), "mouse");
      expect(click("Two")).toBe(true);
    });

    it("leaves a click inside the answer alone", () => {
      setup();
      hover(screen.getByText("One"), "mouse");
      expect(click("First answer")).toBe(true);
    });

    it("never swallows a click after a touch has passed over the row", () => {
      setup();
      hover(screen.getByText("One"), "touch");
      expect(click("One")).toBe(true);
    });
  });
});
