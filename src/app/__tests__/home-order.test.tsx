import { render } from "@testing-library/react";

import Home from "../page";

/**
 * The homepage is an ordered list of sections, and the order is the argument:
 * what the house is made of, how it gets installed,
 * what it costs, then the enquiry. Each
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

jest.mock("../../components/FluidHero", () => ({ FluidHero: mockSection("hero") }));
jest.mock("../../components/Maple", () => ({ Maple: mockSection("maple") }));
jest.mock("../../components/Partners", () => ({ Partners: mockSection("partners") }));
jest.mock("../../components/Stats", () => ({ Stats: mockSection("stats") }));
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
      "partners",
      "stats",
      "hardware",
      "process",
      "pricing",
      "enquiry",
    ]);
  });

  it("leaves the Maple banner off the page", () => {
    // Unmounted 2026-10-02 at Shivanshu's request. The component is kept in
    // src/components/Maple so it can come back; this fails if it does by
    // accident rather than by decision.
    const { container } = render(<Home />);
    expect(order(container)).not.toContain("maple");
  });

  it("leaves the Care section off the page", () => {
    // Hidden 2026-10-02 at Shivanshu's request, ahead of its removal. The
    // component stays in src/components/Care, as Maple does.
    const { container } = render(<Home />);
    expect(order(container)).not.toContain("care");
  });

  it("puts the partner cards directly after the hero, where Maple was", () => {
    // 2026-10-06, at Shivanshu's call: the TIS and Fibaro partnerships are the
    // stronger trust signal, and take the Maple banner's place.
    const { container } = render(<Home />);
    const sections = order(container);
    expect(sections.indexOf("partners")).toBe(sections.indexOf("hero") + 1);
  });

  it("puts the figures directly under the partner cards", () => {
    // 2026-10-07, at Shivanshu's call: who Smarthaus works with, then what it
    // has done, before what the house is made of.
    const { container } = render(<Home />);
    const sections = order(container);
    expect(sections.indexOf("stats")).toBe(sections.indexOf("partners") + 1);
  });

  it("puts the hardware carousel directly after the figures", () => {
    const { container } = render(<Home />);
    const sections = order(container);
    expect(sections.indexOf("hardware")).toBe(sections.indexOf("stats") + 1);
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
