import { render, screen, within } from "@testing-library/react";
import { PROCESS_PAGES } from "../../../content/process";
import { Process } from "../Process";

// Both observers have their own tests and need IntersectionObserver; this file
// is about the section's structure and what it tells assistive technology.
jest.mock("../ProcessHandoff", () => ({ ProcessHandoff: () => null }));
jest.mock("../ProcessFallback", () => ({ ProcessFallback: () => null }));

function viewport() {
  return screen.getByRole("group");
}

describe("Process", () => {
  it("is a region named by its own heading", () => {
    render(<Process />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "our-process");
    expect(heading.closest("section")).toHaveAttribute("aria-labelledby", "our-process");
  });

  it("tells the stylesheet how many pages there are", () => {
    render(<Process />);
    const section = screen.getByRole("heading", { level: 2 }).closest("section")!;
    expect(section.style.getPropertyValue("--process-pages")).toBe(String(PROCESS_PAGES.length));
  });

  it("makes the scroller focusable, as axe's scrollable-region-focusable asks", () => {
    render(<Process />);
    expect(viewport()).toHaveAttribute("tabindex", "0");
  });

  it("names the panels and only the keys that move them", () => {
    render(<Process />);
    expect(viewport()).toHaveAccessibleName(
      "Our process, six panels. Scroll the page or use the up and down arrow keys to move through them.",
    );
  });

  it("does not promise left and right, which do nothing in the pinned rail", () => {
    render(<Process />);
    const label = viewport().getAttribute("aria-label")!;
    expect(label).not.toMatch(/left|right/i);
    expect(label).not.toMatch(/use the arrow keys/i);
  });

  it("says six panels because there are six", () => {
    render(<Process />);
    expect(PROCESS_PAGES).toHaveLength(6);
    expect(within(viewport()).getAllByRole("listitem")).toHaveLength(6);
  });

  it("keeps every step heading in the accessibility tree, in order", () => {
    render(<Process />);
    const titles = within(viewport())
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(PROCESS_PAGES.map((page) => page.title));
  });

  it("hides the progress rule, which cannot report a live value", () => {
    const { container } = render(<Process />);
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    const hidden = container.querySelectorAll('header [aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
  });
});
