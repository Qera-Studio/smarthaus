import { render } from "@testing-library/react";

import Home from "../page";

/**
 * The homepage is an ordered list of sections, and the order is the argument:
 * who is behind the brand, what the house is made of, how it gets installed,
 * what it costs, what keeping it running costs, then the enquiry. Each
 * section has its own suite; this one only holds the sequence.
 *
 * Every section is stubbed to a marker. The real ones pull in three.js, scroll
 * timelines and observers that jsdom cannot run, and none of that is what is
 * under test here.
 */

// A function declaration, not a const: jest.mock is hoisted above every other
// statement, and only a hoisted declaration is initialised by the time the
// factories run. The `mock` prefix is what jest allows a factory to reference.
function mockSection(name: string) {
  function Section() {
    return <div data-section={name} />;
  }
  return Section;
}

jest.mock("../../components/Hero", () => ({ Hero: mockSection("hero") }));
jest.mock("../../components/Maple", () => ({ Maple: mockSection("maple") }));
jest.mock("../../components/Hardware", () => ({ Hardware: mockSection("hardware") }));
jest.mock("../../components/Process", () => ({ Process: mockSection("process") }));
jest.mock("../../components/Pricing", () => ({ Pricing: mockSection("pricing") }));
jest.mock("../../components/Care", () => ({ Care: mockSection("care") }));
jest.mock("../../components/HomeEnquiry", () => ({ HomeEnquiry: mockSection("enquiry") }));

const order = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-section]")).map((el) =>
    el.getAttribute("data-section"),
  );

describe("Home page", () => {
  it("renders every section once, in the planned order", () => {
    const { container } = render(<Home />);
    expect(order(container)).toEqual([
      "hero",
      "maple",
      "hardware",
      "process",
      "pricing",
      "care",
      "enquiry",
    ]);
  });

  it("places the Maple banner directly after the hero", () => {
    // The banner answers "who is behind this" before anything asks to be
    // trusted. Anywhere later and the Hardware pitch arrives first.
    const { container } = render(<Home />);
    const sections = order(container);
    expect(sections.indexOf("maple")).toBe(sections.indexOf("hero") + 1);
  });

  it("places the Maple banner directly before the hardware carousel", () => {
    const { container } = render(<Home />);
    const sections = order(container);
    expect(sections.indexOf("hardware")).toBe(sections.indexOf("maple") + 1);
  });

  it("keeps the enquiry last, directly above the footer", () => {
    const { container } = render(<Home />);
    expect(order(container).at(-1)).toBe("enquiry");
  });

  it("adds no wrapper of its own around the sections", () => {
    // The layout's <main> is the parent every section styles against
    // (Process's overlay pulls up over its previous sibling), so a wrapper
    // here would break that without failing anything else.
    const { container } = render(<Home />);
    const markers = container.querySelectorAll("[data-section]");
    markers.forEach((el) => expect(el.parentElement).toBe(container));
  });
});
