/**
 * @jest-environment node
 */
import { isCurrentPath, NAV_LINKS } from "../nav-links";

describe("isCurrentPath", () => {
  it.each([
    ["/pricing", "/pricing", true],
    ["/pricing/", "/pricing", true],
    ["/pricing", "/pricing/", true],
    ["/pricing?plan=care", "/pricing", true],
    ["/pricing#faq", "/pricing", true],
    ["/solutions/lighting", "/solutions", true],
    ["/solutions/lighting/dali", "/solutions", true],
    ["/solutionsx", "/solutions", false],
    ["/pricing-old", "/pricing", false],
    ["/", "/pricing", false],
    ["/about", "/pricing", false],
    ["/", "/", true],
    ["", "/", true],
    ["/pricing", "/", false],
    ["/contact", "/", false],
  ])("on %j, a link to %j is current: %s", (pathname, href, expected) => {
    expect(isCurrentPath(pathname, href)).toBe(expected);
  });

  it("marks exactly one primary nav link current on each primary page", () => {
    for (const { href } of NAV_LINKS) {
      expect(NAV_LINKS.filter((link) => isCurrentPath(href, link.href))).toEqual([
        expect.objectContaining({ href }),
      ]);
    }
  });

  it("marks no primary nav link current on pages outside it", () => {
    for (const pathname of ["/", "/contact", "/privacy", "/faq", "/nope"]) {
      expect(NAV_LINKS.filter((link) => isCurrentPath(pathname, link.href))).toEqual([]);
    }
  });
});
