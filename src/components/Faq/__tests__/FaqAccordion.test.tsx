import { render, screen } from "@testing-library/react";

import type { FaqEntry } from "../../../content/faq";
import { FAQ_CATEGORIES } from "../../../content/faq";
import { FaqAccordion, plainAnswer } from "../FaqAccordion";

/**
 * One FAQ entry: a native <details>, so the behaviour under test is the
 * markup, not state. The braces matter most: an unconfirmed figure must reach
 * the page marked, and must never reach the JSON-LD with its braces on.
 */

const entry = (over: Partial<FaqEntry> = {}): FaqEntry => ({
  id: "assessment-fee",
  question: "What does a site assessment cost?",
  answer: ["The assessment is {AED 1,500}, credited to the project.", "It takes about an hour."],
  ...over,
});

const marks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-placeholder]")).map((m) => m.textContent);

describe("FaqAccordion", () => {
  it("joins a named group when given one, so one row opens at a time", () => {
    const { container } = render(<FaqAccordion entry={entry()} group="about-faq" />);
    expect(container.querySelector("details")).toHaveAttribute("name", "about-faq");
  });

  it("stays ungrouped by default, as /faq wants", () => {
    const { container } = render(<FaqAccordion entry={entry()} />);
    expect(container.querySelector("details")).not.toHaveAttribute("name");
  });

  it("is a closed native disclosure, anchored by the entry's id", () => {
    const { container } = render(<FaqAccordion entry={entry()} />);
    const details = container.querySelector("details")!;
    expect(details.id).toBe("assessment-fee");
    expect(details.open).toBe(false);
    expect(details.firstElementChild!.tagName).toBe("SUMMARY");
  });

  it("puts the question in the summary and hides the chevron from readers", () => {
    const { container } = render(<FaqAccordion entry={entry()} />);
    const summary = container.querySelector("summary")!;
    expect(summary).toHaveTextContent("What does a site assessment cost?");
    expect(summary.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // No role or aria-expanded: <summary> already carries both.
    expect(summary).not.toHaveAttribute("role");
    expect(summary).not.toHaveAttribute("aria-expanded");
  });

  it("renders every paragraph, present in the HTML while closed", () => {
    const { container } = render(<FaqAccordion entry={entry()} />);
    const paragraphs = container.querySelectorAll("details > div > p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]).toHaveTextContent("It takes about an hour.");
  });

  it("marks each braced figure and drops the braces from the page", () => {
    const { container } = render(
      <FaqAccordion entry={entry({ answer: ["From {AED 18,000} to {AED 60,000}."] })} />,
    );
    expect(marks(container)).toEqual(["AED 18,000", "AED 60,000"]);
    expect(container.textContent).not.toMatch(/[{}]/);
    expect(screen.getByText(/From/).textContent).toBe("From AED 18,000 to AED 60,000.");
  });

  it("leaves an answer with no braces unmarked", () => {
    const { container } = render(<FaqAccordion entry={entry({ answer: ["Yes."] })} />);
    expect(marks(container)).toEqual([]);
  });

  it("shows the reviewer's note under the answer while the fact is pending", () => {
    const { container } = render(
      <FaqAccordion entry={entry({ pending: "Fee to be confirmed with Sunil." })} />,
    );
    expect(marks(container)).toContain("Fee to be confirmed with Sunil.");
  });

  it("shows no note once the fact is confirmed", () => {
    const { container } = render(<FaqAccordion entry={entry({ answer: ["Confirmed."] })} />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});

describe("plainAnswer", () => {
  it("joins the paragraphs and strips the braces, for the JSON-LD", () => {
    expect(plainAnswer(entry())).toBe(
      "The assessment is AED 1,500, credited to the project. It takes about an hour.",
    );
  });

  it("returns a single paragraph unchanged", () => {
    expect(plainAnswer(entry({ answer: ["Yes, every system."] }))).toBe("Yes, every system.");
  });
});

describe("plainAnswer, against the edges and the real content", () => {
  it("never carries the reviewer's note into the schema text", () => {
    const text = plainAnswer(entry({ pending: "Fee to be confirmed with Sunil." }));
    expect(text).not.toContain("Sunil");
  });

  it("leaves no brace in any real entry's schema text", () => {
    for (const real of FAQ_CATEGORIES.flatMap((category) => category.entries)) {
      expect(plainAnswer(real)).not.toMatch(/[{}]/);
    }
  });
});

describe("FaqAccordion, against a stray brace", () => {
  it("leaves an unmatched brace as text rather than marking the rest of the answer", () => {
    const { container } = render(
      <FaqAccordion entry={entry({ answer: ["An open { with no close."] })} />,
    );
    expect(marks(container)).toEqual([]);
    expect(container.querySelector("details > div > p")).toHaveTextContent(
      "An open { with no close.",
    );
  });
});
