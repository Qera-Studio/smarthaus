import Home from "../page";
import { renderServer } from "../../__tests__/helpers/server";

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

jest.mock("../../components/HomeHero", () => ({ HomeHero: mockSection("hero") }));
jest.mock("../../components/FluidHero", () => ({ FluidHero: mockSection("fluid") }));
jest.mock("../../components/Maple", () => ({ Maple: mockSection("maple") }));
jest.mock("../../components/Partners", () => ({ Partners: mockSection("partners") }));
jest.mock("../../components/Stats", () => ({ Stats: mockSection("stats") }));
jest.mock("../../components/Hardware", () => ({ Hardware: mockSection("hardware") }));
// Process holds the section before it (the hardware) under its first sheet,
// so it is handed that section rather than following it (2026-11-14). The
// stand-in draws what it is handed, then its own marker, and remembers it.
const mockHeld: unknown[] = [];
jest.mock("../../components/Process", () => ({
  Process: function Process({ held }: { held?: unknown }) {
    mockHeld.push(held);
    return (
      <>
        {held as never}
        <div data-section="process" />
      </>
    );
  },
}));
jest.mock("../../components/Pricing", () => ({ Pricing: mockSection("pricing") }));
jest.mock("../../components/Care", () => ({ Care: mockSection("care") }));
jest.mock("../../components/HomeEnquiry", () => ({ HomeEnquiry: mockSection("enquiry") }));

const order = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-section]")).map((el) =>
    el.getAttribute("data-section"),
  );

// ScrollReveal reads these, which jsdom does not have; its own tests cover it.
beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
});

describe("Home page", () => {
  it("renders every section once, in the planned order", async () => {
    const { container } = await renderServer(<Home />);
    expect(order(container)).toEqual([
      "hero",
      "stats",
      "hardware",
      "process",
      "care",
      "pricing",
      "enquiry",
    ]);
  });

  it("leaves the fluid hero off the page", async () => {
    // Unmounted 2026-10-28 when HomeHero replaced it. The component is kept in
    // src/components/FluidHero; this fails if it comes back by accident.
    const { container } = await renderServer(<Home />);
    expect(order(container)).not.toContain("fluid");
  });

  it("leaves the Maple banner off the page", async () => {
    // Unmounted 2026-10-02 at Shivanshu's request. The component is kept in
    // src/components/Maple so it can come back; this fails if it does by
    // accident rather than by decision.
    const { container } = await renderServer(<Home />);
    expect(order(container)).not.toContain("maple");
  });

  it("puts the care packages directly above the pricing", async () => {
    // Back on 2026-11-04, at Shivanshu's call, without prices. Off the page
    // from 2026-10-02.
    const { container } = await renderServer(<Home />);
    const sections = order(container);
    expect(sections.indexOf("pricing")).toBe(sections.indexOf("care") + 1);
    expect(sections.indexOf("care")).toBe(sections.indexOf("process") + 1);
  });

  it("leaves the partner cards off the page", async () => {
    // Unmounted 2026-11-14 at Shivanshu's call: TIS and Fibaro are in the
    // hero's rail of makers' marks now. The component and its content are kept
    // in src/components/Partners; this fails if it comes back by accident.
    const { container } = await renderServer(<Home />);
    expect(order(container)).not.toContain("partners");
  });

  it("puts the figures directly after the hero, then the hardware", async () => {
    // 2026-11-14, at Shivanshu's call: "By the numbers" above the hardware
    // carousel. From 2026-11-04 the hardware came first.
    const { container } = await renderServer(<Home />);
    const sections = order(container);
    expect(sections.indexOf("stats")).toBe(sections.indexOf("hero") + 1);
    expect(sections.indexOf("hardware")).toBe(sections.indexOf("stats") + 1);
  });

  it("hands the hardware to the Process stack, which holds it under its first sheet", async () => {
    // 2026-11-14: the hardware holds still while the first sheet rises over
    // it, so the two share one box (Process.tsx, held).
    mockHeld.length = 0;
    const { container } = await renderServer(<Home />);
    expect(mockHeld).toHaveLength(1);
    const sections = order(container);
    expect(sections.indexOf("process")).toBe(sections.indexOf("hardware") + 1);
  });

  it("keeps the enquiry last, directly above the footer", async () => {
    const { container } = await renderServer(<Home />);
    expect(order(container).at(-1)).toBe("enquiry");
  });

  it("adds no wrapper of its own around the sections", async () => {
    // The layout's <main> is the parent every section styles against
    // (Process's overlay pulls up over its previous sibling), so a wrapper
    // here would break that without failing anything else.
    const { container } = await renderServer(<Home />);
    const markers = container.querySelectorAll("[data-section]");
    markers.forEach((el) => expect(el.parentElement).toBe(container));
  });
});
