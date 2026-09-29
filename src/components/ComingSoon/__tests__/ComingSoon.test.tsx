// The placeholder every unbuilt route renders. The particle canvas is
// decorative and has its own suite (ParticleText.test.tsx); here it is
// stubbed to the real heading it renders.
import type { ElementType } from "react";
import { render, screen } from "@testing-library/react";
import { ComingSoon } from "../ComingSoon";

jest.mock("../../ParticleText", () => ({
  ParticleText: ({ label, as: Tag }: { label: string; as: ElementType }) => <Tag>{label}</Tag>,
}));

const BLURB = "Case studies from finished villas, with the drawings that went with them.";

describe("ComingSoon", () => {
  it("names the state in the page's one h1", () => {
    render(<ComingSoon blurb={BLURB} />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/coming\s*soon/i);
  });

  it("says what is coming on this route, in the caller's words", () => {
    const other = "A page for interior designers.";
    const { rerender } = render(<ComingSoon blurb={BLURB} />);
    expect(screen.getByText(BLURB)).toBeInTheDocument();
    rerender(<ComingSoon blurb={other} />);
    expect(screen.getByText(other)).toBeInTheDocument();
    expect(screen.queryByText(BLURB)).toBeNull();
  });

  it("offers one way on: home", () => {
    render(<ComingSoon blurb={BLURB} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("Back to home");
    expect(links[0]).toHaveAttribute("href", "/");
  });

  it("is a section, the same composition as the 404", () => {
    const { container } = render(<ComingSoon blurb={BLURB} />);
    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });

  it("adds no em dash of its own", () => {
    const { container } = render(<ComingSoon blurb={BLURB} />);
    expect(container.textContent).not.toContain("—");
  });
});
