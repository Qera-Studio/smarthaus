// The 404. The particle canvas is decorative and has its own suite
// (ParticleText.test.tsx); here it is stubbed to the real heading it renders,
// which is what a crawler and a screen reader receive.
import type { ElementType } from "react";
import { render, screen } from "@testing-library/react";
import NotFound, { metadata } from "../not-found";

jest.mock("../../components/ParticleText", () => ({
  ParticleText: ({ label, as: Tag }: { label: string; as: ElementType }) => <Tag>{label}</Tag>,
}));

describe("not-found", () => {
  it("has one h1, the real text under the decorative canvas", () => {
    render(<NotFound />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("404");
  });

  it("says what happened in one plain line", () => {
    render(<NotFound />);
    expect(screen.getByText("Oops, looks like this page does not exist.")).toBeInTheDocument();
  });

  it("always offers a way home, as the page's only link", () => {
    render(<NotFound />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("Back to home");
    expect(links[0]).toHaveAttribute("href", "/");
  });

  it("titles the page and leaves the robots line to the framework", () => {
    expect(metadata.title).toBe("Page not found");
    // Next emits noindex for not-found itself; a second tag was a real bug.
    expect(metadata).not.toHaveProperty("robots");
  });

  it("contains no em dash", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).not.toContain("—");
  });
});
