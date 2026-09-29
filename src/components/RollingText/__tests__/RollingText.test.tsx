import { render, screen } from "@testing-library/react";
import { RollingText } from "../RollingText";

/**
 * One span per character and nothing else per character. It was four spans
 * and an inline style each, about 1,500 elements across the nav and footer on
 * every page (2026-09-28). The incoming copy is now a text-shadow, so it is
 * not in the DOM at all.
 */
describe("RollingText", () => {
  it("announces the word once, from the real text beside the animation", () => {
    render(
      <a href="/x">
        <RollingText>Solutions</RollingText>
      </a>,
    );
    expect(screen.getByRole("link")).toHaveAccessibleName("Solutions");
  });

  it("hides the animated copy from assistive technology", () => {
    const { container } = render(<RollingText>Solutions</RollingText>);
    const hidden = container.querySelector('[aria-hidden="true"]')!;
    expect(hidden).not.toBeNull();
    expect(hidden.textContent).toBe("Solutions");
  });

  it("renders exactly one element per character, plus three for the word", () => {
    const word = "Smart locks and access";
    const { container } = render(<RollingText>{word}</RollingText>);
    const root = container.firstElementChild!;
    // root, label, animation, then one span per character.
    expect(root.querySelectorAll("*").length + 1).toBe(word.length + 3);
    const chars = root.querySelector('[aria-hidden="true"]')!.children;
    expect(chars).toHaveLength(word.length);
    for (const char of Array.from(chars)) expect(char.children).toHaveLength(0);
  });

  it("puts no inline style on any character: the stagger is in the stylesheet", () => {
    const { container } = render(<RollingText>Pricing</RollingText>);
    expect(container.querySelectorAll('[aria-hidden="true"] [style]')).toHaveLength(0);
  });

  it("keeps a real space's width with a non-breaking space", () => {
    const { container } = render(<RollingText>For Designers</RollingText>);
    const chars = container.querySelector('[aria-hidden="true"]')!.children;
    expect(chars[3]!.textContent).toBe(" ");
  });

  it("carries the default stagger in the stylesheet, and a custom one as one property on the word", () => {
    const { container, rerender } = render(<RollingText>About</RollingText>);
    expect(container.firstElementChild).not.toHaveAttribute("style");
    rerender(<RollingText stagger={0.05}>About</RollingText>);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue("--roll-stagger"),
    ).toBe("0.05s");
  });

  it("splits by code point, so an emoji or accented letter is one character", () => {
    const { container } = render(<RollingText>Café ✓</RollingText>);
    expect(container.querySelector('[aria-hidden="true"]')!.children).toHaveLength(6);
  });

  it("appends a class without dropping its own", () => {
    const { container } = render(<RollingText className="extra">About</RollingText>);
    expect(container.firstElementChild!.className.split(" ")).toHaveLength(2);
    expect(container.firstElementChild).toHaveClass("extra");
  });

  describe("by word", () => {
    it("rolls the whole word as one piece: three elements plus one, whatever its length", () => {
      const word = "Smart locks and access";
      const { container } = render(<RollingText by="word">{word}</RollingText>);
      const root = container.firstElementChild!;
      expect(root.querySelectorAll("*").length + 1).toBe(4);
      const animated = root.querySelector('[aria-hidden="true"]')!;
      expect(animated.children).toHaveLength(1);
      expect(animated.textContent).toBe(word);
    });

    it("still announces the word once, from the label", () => {
      render(
        <a href="/x">
          <RollingText by="word">Care plans</RollingText>
        </a>,
      );
      expect(screen.getByRole("link")).toHaveAccessibleName("Care plans");
    });

    it("keeps real spaces as spaces, since the word is one line of text", () => {
      const { container } = render(<RollingText by="word">Care plans</RollingText>);
      expect(container.querySelector('[aria-hidden="true"]')!.textContent).toBe("Care plans");
    });
  });

  it("rolls by letter unless told otherwise", () => {
    const { container } = render(<RollingText>Nav</RollingText>);
    expect(container.querySelector('[aria-hidden="true"]')!.children).toHaveLength(3);
  });
});
