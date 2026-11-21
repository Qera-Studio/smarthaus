import { SOLUTION_PAGES } from "../../../../sanity/seed/solutions";
import { SOLUTION_ICONS } from "../../../sanity/schema/solution";
import { SOLUTION_ICON, solutionIcon } from "../icons";

/**
 * The icons an editor can pick, and Lucide's drawing of each. The Studio
 * offers SOLUTION_ICONS; the page draws SOLUTION_ICON. A name in one and not
 * the other is a feature drawn with nothing, or an option that fails a build.
 */
describe("the solution icons", () => {
  it("have a drawing for every name the Studio offers, and no more", () => {
    expect(Object.keys(SOLUTION_ICON).sort()).toEqual([...SOLUTION_ICONS].sort());
  });

  it("are Lucide's components, each its own", () => {
    const icons = Object.values(SOLUTION_ICON);
    expect(new Set(icons).size).toBe(icons.length);
    for (const icon of icons) expect(icon).toEqual(expect.anything());
  });

  it("are named as Lucide names them, so the drawing matches the option", () => {
    for (const [name, icon] of Object.entries(SOLUTION_ICON)) {
      const pascal = name.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());
      expect((icon as { displayName?: string }).displayName).toBe(pascal);
    }
  });

  it("give the drawing for a name", () => {
    expect(solutionIcon("globe-lock")).toBe(SOLUTION_ICON["globe-lock"]);
  });

  it("fail the build for a name the schema no longer offers, rather than draw nothing", () => {
    expect(() => solutionIcon("no-such-icon")).toThrow(/no icon "no-such-icon"/);
  });

  it("cover every icon the seeded pages use", () => {
    for (const page of Object.values(SOLUTION_PAGES)) {
      for (const { icon } of page.features.items) expect(() => solutionIcon(icon)).not.toThrow();
    }
  });

  it("start with the design's globe and lock, for the footage kept at home", () => {
    expect(SOLUTION_PAGES.cameras!.features.items[0]!.icon).toBe("globe-lock");
  });
});
