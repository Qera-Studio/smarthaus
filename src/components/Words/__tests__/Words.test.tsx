import { render } from "@testing-library/react";

import { Words } from "../Words";

const setup = (text: string, className?: string) =>
  render(
    <h2>
      <Words text={text} className={className} />
    </h2>,
  ).container.querySelector("h2") as HTMLElement;

describe("Words", () => {
  it("gives each word its own span, in order", () => {
    const words = Array.from(setup("Book a site visit").children).map((el) => el.textContent);
    expect(words).toEqual(["Book", "a", "site", "visit"]);
  });

  it("is still one sentence to a screen reader: the spaces stay as text", () => {
    expect(setup("Book a site visit").textContent).toBe("Book a site visit");
  });

  it("keeps the punctuation on its word", () => {
    const words = Array.from(setup("One stop, full house").children).map((el) => el.textContent);
    expect(words[1]).toBe("stop,");
  });

  it("puts the class it is given on every word, and none when it is given none", () => {
    for (const span of Array.from(setup("Two words", "word").children)) {
      expect(span).toHaveClass("word");
    }
    expect(setup("Two words").querySelector("span")).not.toHaveAttribute("class");
  });

  it("adds no style, which the strict CSP twin would report", () => {
    expect(setup("Two words").querySelector("[style]")).toBeNull();
  });

  it("renders one word with no space around it", () => {
    const heading = setup("Word");
    expect(heading.children).toHaveLength(1);
    expect(heading.textContent).toBe("Word");
  });
});
