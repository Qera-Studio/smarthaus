import { test, expect } from "./fixtures";

/**
 * Every internal link on every real page lands somewhere, and every fragment
 * lands on an element. The homepage crawl in coming-soon.spec.ts strips the
 * fragment before it asks, which is how seven footer links to ids that did not
 * exist on /solutions shipped (fixed 2026-09-27, src/lib/nav-links.ts).
 *
 * Desktop Chrome only: the link set is the same markup on every device.
 */
const PAGES = ["/", "/contact", "/pricing", "/faq", "/privacy", "/terms", "/accessibility"];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "Desktop Chrome", "the links are identical on every device");
});

for (const from of PAGES) {
  test(`${from}: every internal link and fragment resolves`, async ({ page }) => {
    await page.goto(from);
    const hrefs = await page
      .locator('a[href^="/"], a[href^="#"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.getAttribute("href") ?? "")
          .filter((href) => href && !href.startsWith("//")),
      );
    expect(hrefs.length, `${from} has no internal links at all`).toBeGreaterThan(0);

    const dead: string[] = [];
    const idsOn = new Map<string, Set<string>>();
    const idsFor = async (path: string) => {
      if (!idsOn.has(path)) {
        const other = path === from ? page : await page.context().newPage();
        if (other !== page) await other.goto(path);
        idsOn.set(
          path,
          new Set(await other.locator("[id]").evaluateAll((els) => els.map((el) => el.id))),
        );
        if (other !== page) await other.close();
      }
      return idsOn.get(path)!;
    };

    for (const href of new Set(hrefs)) {
      const [rawPath, id] = href.split("#") as [string, string | undefined];
      const path = rawPath || from;
      if (rawPath) {
        const response = await page.request.get(rawPath);
        if (response.status() >= 400) dead.push(`${href}: ${response.status()}`);
      }
      // A bare "#" and the skip link's target are both real; anything else
      // after a # must be an element on that page.
      if (id && !(await idsFor(path)).has(id)) dead.push(`${href}: no element with id "${id}"`);
    }
    expect(dead).toEqual([]);
  });
}
