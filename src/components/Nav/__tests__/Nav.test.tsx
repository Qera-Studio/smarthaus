import { render, within } from "@testing-library/react";
import { NAV_LINKS } from "../../../lib/nav-links";
import { Nav } from "../Nav";

// NavShell owns the open and stuck state and has its own tests. Here it only
// lays its slots out, so what is asserted is what Nav itself puts in them.
jest.mock("../NavShell", () => ({
  NavShell: (slots: Record<string, React.ReactNode>) => (
    <div>
      {Object.entries(slots).map(([name, node]) => (
        <div key={name} data-slot={name}>
          {node}
        </div>
      ))}
    </div>
  ),
}));

let pathname: string | null = "/";
jest.mock("next/navigation", () => ({ usePathname: () => pathname }));

function slot(name: string) {
  return document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
}

describe("Nav", () => {
  it("lists every primary link, in the registry's order, at its href", () => {
    render(<Nav />);
    const links = within(slot("links")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(NAV_LINKS.map((l) => l.href));
    // RollingText splits the label into characters; the accessible name is
    // what a screen reader hears, and it must be the whole word.
    links.forEach((link, index) => expect(link).toHaveAccessibleName(NAV_LINKS[index]!.label));
  });

  it("gives each item its index for the open stagger", () => {
    render(<Nav />);
    const items = within(slot("links")).getAllByRole("listitem");
    expect(items).toHaveLength(NAV_LINKS.length);
    items.forEach((item, index) =>
      expect(item.style.getPropertyValue("--link-index")).toBe(String(index)),
    );
  });

  it("marks the current page's link, and only that one", () => {
    const current = NAV_LINKS[1]!;
    pathname = current.href;
    render(<Nav />);
    const links = within(slot("links")).getAllByRole("link");
    const marked = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute("href", current.href);
  });

  it("marks nothing on a page the nav does not list", () => {
    pathname = "/privacy";
    render(<Nav />);
    expect(within(slot("links")).getAllByRole("link")).toHaveLength(NAV_LINKS.length);
    expect(slot("links").querySelector("[aria-current]")).toBeNull();
  });

  it("names both brand links as the way home", () => {
    render(<Nav />);
    for (const name of ["brandMark", "brandFull"]) {
      const link = within(slot(name)).getByRole("link");
      expect(link).toHaveAttribute("href", "/");
      expect(link).toHaveAccessibleName("Smarthaus — home");
    }
  });

  it("puts the site-visit CTA in its slot, pointing at the contact page", () => {
    render(<Nav />);
    const cta = within(slot("cta")).getByRole("link", { name: "Book a site visit" });
    expect(cta).toHaveAttribute("href", "/contact");
    expect(cta).toHaveAttribute("data-cursor", "none");
  });

  it("signs the open panel as by MapleTech", () => {
    render(<Nav />);
    expect(within(slot("footer")).getByText("by MapleTech")).toBeInTheDocument();
  });
});
