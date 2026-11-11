import { within } from "@testing-library/react";
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { NAV_LINKS } from "../../../lib/nav-links";
import { Nav } from "../Nav";
import { renderServer } from "../../../__tests__/helpers/server";

const SOLUTIONS_MENU_ITEMS = SITE_SETTINGS.solutionsMenu.items;

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

// The bar's own items and links, not the Solutions panel hanging in the first.
const barItems = () => Array.from(slot("links").querySelectorAll<HTMLElement>(":scope > ul > li"));
const barLinks = () =>
  Array.from(slot("links").querySelectorAll<HTMLElement>(":scope > ul > li > a"));

describe("Nav", () => {
  it("lists every primary link, in the registry's order, at its href", async () => {
    await renderServer(<Nav />);
    const links = barLinks();
    expect(links.map((link) => link.getAttribute("href"))).toEqual(NAV_LINKS.map((l) => l.href));
    // RollingText splits the label into characters; the accessible name is
    // what a screen reader hears, and it must be the whole word.
    links.forEach((link, index) => expect(link).toHaveAccessibleName(NAV_LINKS[index]!.label));
  });

  it("gives each item its index for the open stagger", async () => {
    await renderServer(<Nav />);
    const items = barItems();
    expect(items).toHaveLength(NAV_LINKS.length);
    items.forEach((item, index) =>
      expect(item.style.getPropertyValue("--link-index")).toBe(String(index)),
    );
  });

  it("marks the current page's link, and only that one", async () => {
    const current = NAV_LINKS[1]!;
    pathname = current.href;
    await renderServer(<Nav />);
    const links = within(slot("links")).getAllByRole("link");
    const marked = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute("href", current.href);
  });

  it("marks nothing on a page the nav does not list", async () => {
    pathname = "/privacy";
    await renderServer(<Nav />);
    expect(barLinks()).toHaveLength(NAV_LINKS.length);
    expect(slot("links").querySelector("[aria-current]")).toBeNull();
  });

  describe("the Solutions menu", () => {
    const zone = () => slot("links").querySelector<HTMLElement>("[data-menu-zone]")!;

    it("hangs from the Solutions item, and only that one", async () => {
      await renderServer(<Nav />);
      const zones = slot("links").querySelectorAll("[data-menu-zone]");
      expect(zones).toHaveLength(1);
      expect(zone().querySelector(":scope > a")).toHaveAttribute("href", "/solutions");
      for (const item of barItems().slice(1)) {
        expect(item).not.toHaveAttribute("data-menu-zone");
        expect(item.querySelector("[data-menu-panel]")).toBeNull();
      }
    });

    it("lists the eight solutions in the panel, after the link, so Tab reaches them next", async () => {
      await renderServer(<Nav />);
      const panel = zone().querySelector<HTMLElement>("[data-menu-panel]")!;
      expect(panel.previousElementSibling).toBe(zone().querySelector(":scope > a"));
      const labels = within(panel)
        .getAllByRole("link")
        .map((link) => link.textContent);
      expect(labels).toEqual(SOLUTIONS_MENU_ITEMS.map((item) => item.label));
    });

    it("hands the phone menu its own copy, with the swipe", async () => {
      await renderServer(<Nav />);
      const phone = slot("solutions");
      expect(within(phone).getAllByRole("link")).toHaveLength(8);
      // The picture is out of the tab order, so only the eight are reachable.
      const media = phone.querySelector("[data-solutions-media]")!;
      expect(media).toHaveAttribute("tabindex", "-1");
    });

    it("sizes each copy's pictures for its own box", async () => {
      await renderServer(<Nav />);
      const desktop = zone().querySelector("[data-menu-panel] img")!;
      const phone = slot("solutions").querySelector("img")!;
      expect(desktop).toHaveAttribute("sizes", "21rem");
      expect(phone).toHaveAttribute("sizes", "(min-width: 25rem) 25rem, 100vw");
    });
  });

  it("names both brand links as the way home", async () => {
    await renderServer(<Nav />);
    for (const name of ["brandMark", "brandFull"]) {
      const link = within(slot(name)).getByRole("link");
      expect(link).toHaveAttribute("href", "/");
      expect(link).toHaveAccessibleName("Smarthaus — home");
    }
  });

  it("puts the site-visit CTA in its slot, pointing at the contact page", async () => {
    await renderServer(<Nav />);
    const cta = within(slot("cta")).getByRole("link", { name: "Book a site visit" });
    expect(cta).toHaveAttribute("href", "/contact");
    // It used to carry data-cursor="none", which hid the pointer over it.
    // Removed at the client's request: the cursor now shows on every control.
    expect(cta).not.toHaveAttribute("data-cursor");
  });

  it("signs the open panel as by MapleTech", async () => {
    await renderServer(<Nav />);
    expect(within(slot("footer")).getByText("by MapleTech")).toBeInTheDocument();
  });
});
