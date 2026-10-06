import { fireEvent, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PARTNERS } from "../../../content/partners";
import { Partners } from "../Partners";

/**
 * The partner cards make a claim about who Smarthaus works with, which puts
 * them under the AGENTS.md capability audit rather than ordinary copy. What
 * fails silently here: a link that hands the maker's page the opener, a logo
 * with no name, a tier or figure slipping into the copy, and a toggle that
 * leaves two cards announced at once.
 */

const tabs = () => screen.getAllByRole("tab");
const panelFor = (name: string) =>
  screen
    .getAllByRole("tabpanel", { hidden: true })
    .find((panel) => within(panel).queryByRole("img", { name, hidden: true }))!;

describe("Partners", () => {
  describe("structure", () => {
    it("is a region named by its h2, with one h3 per partner", () => {
      render(<Partners />);
      const region = screen.getByRole("region", { name: "Our partners" });
      expect(region.tagName).toBe("SECTION");
      expect(within(region).getByRole("heading", { level: 2 })).toHaveClass("visually-hidden");
      const titles = within(region)
        .getAllByRole("heading", { level: 3, hidden: true })
        .map((h) => h.textContent);
      expect(titles).toEqual(PARTNERS.map((partner) => partner.title));
    });

    it("renders every card's copy in the HTML, the inactive one included", () => {
      const { container } = render(<Partners />);
      for (const partner of PARTNERS) expect(container).toHaveTextContent(partner.body);
    });

    it("ties each tab to its card both ways", () => {
      render(<Partners />);
      tabs().forEach((tab, index) => {
        const id = PARTNERS[index]!.id;
        expect(tab).toHaveAttribute("id", `partner-tab-${id}`);
        expect(tab).toHaveAttribute("aria-controls", `partner-panel-${id}`);
        const panel = document.getElementById(`partner-panel-${id}`)!;
        expect(panel).toHaveAttribute("aria-labelledby", `partner-tab-${id}`);
      });
    });

    it("names every logo after its maker", () => {
      render(<Partners />);
      for (const partner of PARTNERS) {
        expect(screen.getByRole("img", { name: partner.name, hidden: true })).toBeInTheDocument();
      }
    });
  });

  describe("the toggle", () => {
    it("starts on the first partner, with one tab stop", () => {
      render(<Partners />);
      expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false"]);
      expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1]);
      expect(panelFor("TIS")).toHaveAttribute("data-active", "true");
      expect(panelFor("Fibaro")).not.toHaveAttribute("data-active");
    });

    it("switches the card on a click", () => {
      render(<Partners />);
      fireEvent.click(tabs()[1]!);
      expect(tabs()[1]).toHaveAttribute("aria-selected", "true");
      expect(panelFor("Fibaro")).toHaveAttribute("data-active", "true");
      expect(panelFor("TIS")).not.toHaveAttribute("data-active");
    });

    it.each([
      ["ArrowRight", 0, 1],
      ["ArrowDown", 0, 1],
      ["ArrowLeft", 1, 0],
      ["ArrowUp", 1, 0],
    ])("%s moves to the next card and its tab", (key, from, to) => {
      render(<Partners />);
      if (from !== 0) fireEvent.click(tabs()[from]!);
      fireEvent.keyDown(tabs()[from]!, { key });
      expect(tabs()[to]).toHaveFocus();
      expect(tabs()[to]).toHaveAttribute("aria-selected", "true");
    });

    it("wraps past either end, and jumps with Home and End", () => {
      render(<Partners />);
      fireEvent.keyDown(tabs()[0]!, { key: "ArrowLeft" });
      expect(tabs()[1]).toHaveFocus();
      fireEvent.keyDown(tabs()[1]!, { key: "ArrowRight" });
      expect(tabs()[0]).toHaveFocus();
      fireEvent.keyDown(tabs()[0]!, { key: "End" });
      expect(tabs()[1]).toHaveAttribute("aria-selected", "true");
      fireEvent.keyDown(tabs()[1]!, { key: "Home" });
      expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
    });

    it("leaves every other key to the browser", () => {
      render(<Partners />);
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
      tabs()[0]!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("the links out", () => {
    it.each(PARTNERS.map((partner) => [partner.name, partner.href]))(
      "sends %s's button to its own site, in a new tab without the opener",
      (name, href) => {
        render(<Partners />);
        const link = screen.getByRole("link", {
          name: `Visit ${name} (opens in a new tab)`,
          hidden: true,
        });
        expect(link).toHaveAttribute("href", href);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      },
    );
  });
});

describe("partner content", () => {
  it("lists TIS and Fibaro, at the links Shivanshu gave", () => {
    expect(PARTNERS.map((partner) => [partner.name, partner.href])).toEqual([
      ["TIS", "https://www.tiscontrol.com/"],
      ["Fibaro", "https://www.fibaro.com/en/"],
    ]);
  });

  it("claims a partnership and nothing more: no tier, no figure, no superlative", () => {
    for (const partner of PARTNERS) {
      const copy = `${partner.title} ${partner.body}`;
      expect(copy).not.toMatch(/certified|authori[sz]ed|official|exclusive|platinum|gold|premier/i);
      expect(copy).not.toMatch(/\d/);
      expect(copy).not.toMatch(/best|leading|world-class|unrivalled|revolutionary/i);
      expect(copy).not.toMatch(/!|—/);
    }
  });

  it("points every logo at a file that ships", () => {
    for (const partner of PARTNERS) {
      expect(existsSync(join(process.cwd(), "public", partner.logo.src))).toBe(true);
    }
  });
});

describe("partner logos", () => {
  // A PNG's width and height are the two big-endian words at bytes 16 and 20
  // of its IHDR chunk. Reading them here keeps the width and height the
  // component reserves (no layout shift) tied to the file that ships.
  const pngSize = (src: string) => {
    const bytes = readFileSync(join(process.cwd(), "public", src));
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  };

  it.each(PARTNERS.map((partner) => [partner.name, partner.logo] as const))(
    "reserves %s's logo at the file's own size",
    (_name, logo) => {
      expect(pngSize(logo.src)).toEqual({ width: logo.width, height: logo.height });
    },
  );

  it.each(PARTNERS.map((partner) => [partner.name, partner.logo.src] as const))(
    "keeps %s's logo a web-sized file, 3x its 384px display width at most",
    (_name, src) => {
      const { width } = pngSize(src);
      expect(width).toBeLessThanOrEqual(384 * 3);
      const bytes = readFileSync(join(process.cwd(), "public", src)).length;
      expect(bytes).toBeLessThan(200_000);
    },
  );

  it("gives every partner a unique id, a secure link, and copy that names them", () => {
    expect(new Set(PARTNERS.map((partner) => partner.id)).size).toBe(PARTNERS.length);
    for (const partner of PARTNERS) {
      expect(partner.href).toMatch(/^https:\/\//);
      expect(partner.title).toContain(partner.name);
      expect(partner.body).toContain(`As a ${partner.name} partner, Smarthaus`);
    }
  });
});
