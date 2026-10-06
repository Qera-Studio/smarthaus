import { render, screen } from "@testing-library/react";

import { HARDWARE_ITEMS } from "../../../content/hardware";
import { Hardware } from "../Hardware";

/**
 * The section around the carousel: its heading and lead. The carousel itself
 * is HardwareStage.test.tsx's subject and is stubbed here, since it needs
 * IntersectionObserver and matchMedia that jsdom does not have.
 */

// The `mock` prefix is what jest allows a hoisted factory to reference.
const mockStage = jest.fn((props: { items: unknown }) => {
  void props;
  return <div data-testid="stage" />;
});
jest.mock("../HardwareStage", () => ({
  HardwareStage: (props: { items: unknown }) => mockStage(props),
}));

describe("Hardware section", () => {
  beforeEach(() => mockStage.mockClear());

  it("names the section by its h2", () => {
    render(<Hardware />);
    const heading = screen.getByRole("heading", { level: 2, name: "One stop, full house" });
    expect(screen.getByRole("region", { name: "One stop, full house" })).toContainElement(heading);
  });

  it("says what is installed and who looks after it, in plain words", () => {
    // Rewritten 2026-10-02 to read more naturally. The old lead opened on
    // "five apps, four installers", a figure nobody had sourced.
    render(<Hardware />);
    expect(
      screen.getByText(
        "Cameras, locks, lighting, climate and sound on one system. The team that installs it is the team you call when something needs attention.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/five apps|four installers/);
  });

  it("hands the carousel every hardware item, in content order", () => {
    render(<Hardware />);
    expect(mockStage).toHaveBeenCalledTimes(1);
    expect(mockStage.mock.calls[0]![0].items).toBe(HARDWARE_ITEMS);
  });
});
