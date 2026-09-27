/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_LINKS, LEGAL_LINKS, NAV_LINKS, PAGE_LINKS } from "../nav-links";

const solutionsPage = readFileSync(join(__dirname, "../../app/solutions/page.tsx"), "utf8");
const solutionsIsPlaceholder = solutionsPage.includes("<ComingSoon");

describe("the footer's install links", () => {
  it("lists the seven delivered service lines", () => {
    expect(INSTALL_LINKS.map((link) => link.label)).toEqual([
      "Smart home automation",
      "CCTV and cameras",
      "Video Intercom",
      "Smart locks and access",
      "Multiroom audio",
      "Cabling and networks",
      "Care plans",
    ]);
  });

  it("names a distinct, slug-shaped section for each", () => {
    const sections = INSTALL_LINKS.map((link) => link.section);
    expect(new Set(sections).size).toBe(sections.length);
    for (const section of sections) expect(section).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("points at no fragment while /solutions is a placeholder with no sections", () => {
    // The dead-fragment state this replaced: seven links to ids that did not
    // exist. If this fails because the page shipped, the next test says what
    // to do.
    if (!solutionsIsPlaceholder) return;
    for (const link of INSTALL_LINKS) expect(link.href).toBe("/solutions");
  });

  it("points at its section once /solutions is a real page", () => {
    // Fails the day <ComingSoon /> leaves src/app/solutions/page.tsx while the
    // links still land on the top of the page: restore the fragments, as
    // `/solutions#${section}`, in the same change that ships the sections.
    if (solutionsIsPlaceholder) return;
    for (const link of INSTALL_LINKS) expect(link.href).toBe(`/solutions#${link.section}`);
  });

  it("knows which state /solutions is in, so one of the two above always runs", () => {
    expect(solutionsPage).toMatch(/export default function SolutionsPage/);
    expect(typeof solutionsIsPlaceholder).toBe("boolean");
  });
});

describe("every link list", () => {
  const lists = { NAV_LINKS, PAGE_LINKS, LEGAL_LINKS, INSTALL_LINKS };

  it.each(Object.entries(lists))("%s has unique labels, which the footer keys on", (_, links) => {
    const labels = links.map((link) => link.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each(Object.entries(lists))("%s holds only site-relative hrefs", (_, links) => {
    for (const link of links) expect(link.href).toMatch(/^\/(?!\/)/);
  });
});
