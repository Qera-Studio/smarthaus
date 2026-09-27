import { render, screen } from "@testing-library/react";
import { NavLink } from "../NavLink";

let pathname: string | null = "/pricing";
jest.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("NavLink", () => {
  it("says aria-current=page on the page it points at", () => {
    pathname = "/pricing";
    render(<NavLink href="/pricing">Pricing</NavLink>);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
  });

  it("stays current on a sub-page of its section", () => {
    pathname = "/solutions/lighting";
    render(<NavLink href="/solutions">Solutions</NavLink>);
    expect(screen.getByRole("link", { name: "Solutions" })).toHaveAttribute("aria-current", "page");
  });

  it("says nothing on any other page, rather than aria-current=false", () => {
    pathname = "/about";
    render(<NavLink href="/pricing">Pricing</NavLink>);
    expect(screen.getByRole("link", { name: "Pricing" })).not.toHaveAttribute("aria-current");
  });

  it("copes with no pathname yet, as during the first render", () => {
    pathname = null;
    render(<NavLink href="/pricing">Pricing</NavLink>);
    expect(screen.getByRole("link", { name: "Pricing" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the href and the class it was given", () => {
    pathname = "/";
    render(
      <NavLink href="/pricing" className="styled">
        Pricing
      </NavLink>,
    );
    const link = screen.getByRole("link", { name: "Pricing" });
    expect(link).toHaveAttribute("href", "/pricing");
    expect(link).toHaveClass("styled");
  });
});
