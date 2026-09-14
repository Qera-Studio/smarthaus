import { existsSync } from "node:fs";
import { join } from "node:path";

import { IMAGES_PER_LAYOUT, PROCESS_PAGES } from "../process";

/**
 * The process rail's content is data, and the component reads its images
 * POSITIONALLY — `images[0]` into one grid slot, `images[1]` into another. That
 * makes a wrong image count a silent failure: the page still builds, still
 * renders, and simply has a hole in it where a photograph should be. Same for a
 * path that does not resolve, which next/image turns into a broken box rather
 * than a build error.
 *
 * These are the invariants that fail quietly. The ones that fail loudly do not
 * need a test.
 */
describe("process content", () => {
  it("has six pages with unique ids", () => {
    expect(PROCESS_PAGES).toHaveLength(6);
    const ids = PROCESS_PAGES.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every page a title, a body and a duration", () => {
    for (const page of PROCESS_PAGES) {
      expect(page.title.trim()).not.toBe("");
      expect(page.duration.trim()).not.toBe("");
      expect(page.body.length).toBeGreaterThan(0);
      expect(page.body.every((paragraph) => paragraph.trim() !== "")).toBe(true);
    }
  });

  it("numbers the five steps and leaves the intro unnumbered", () => {
    const [intro, ...steps] = PROCESS_PAGES;
    expect(intro?.step).toBeUndefined();
    // "01".."05", in order. The number is visible copy, so a gap or a repeat is
    // a content bug rather than a rendering one.
    expect(steps.map((page) => page.step)).toEqual(["01", "02", "03", "04", "05"]);
  });

  it("carries exactly the number of images its layout consumes", () => {
    for (const page of PROCESS_PAGES) {
      expect(page.images).toHaveLength(IMAGES_PER_LAYOUT[page.layout]);
    }
  });

  it("resolves every image path to a real file", () => {
    for (const page of PROCESS_PAGES) {
      for (const image of page.images) {
        const path = join(process.cwd(), "public", "hero", "process", image.src);
        expect(existsSync(path)).toBe(true);
      }
    }
  });

  it("gives every image alt text, intrinsic dimensions and a sizes hint", () => {
    for (const page of PROCESS_PAGES) {
      for (const image of page.images) {
        // These photographs carry the meaning of each step, so none of them is
        // decorative and an empty alt would be wrong.
        expect(image.alt.trim()).not.toBe("");
        // Both are needed for the frame's aspect-ratio, which is what reserves
        // the box before decode. CLS is the binding constraint on this section.
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);
        // Without `sizes` the browser picks the largest candidate at every
        // viewport, which is the whole point of setting it.
        expect(image.sizes.trim()).not.toBe("");
      }
    }
  });

  it("has no em dashes in any visible string", () => {
    // The house rule, asserted at the data level so it fails in jest rather
    // than three minutes into a Playwright run.
    const copy = PROCESS_PAGES.flatMap((page) => [
      page.title,
      page.duration,
      ...page.body,
      ...page.images.map((image) => image.alt),
    ]);
    for (const text of copy) {
      expect(text).not.toContain("—");
    }
  });

  /**
   * Every photograph on disk today is placeholder stock that does not meet
   * AGENTS.md's photography constraint. This test is the reminder, and it is
   * written to FAIL once they are replaced: clearing the last `pendingImage`
   * should make someone come here and delete this test deliberately, rather
   * than the markers rotting in place after the real images land.
   */
  it("still marks every image as pending replacement", () => {
    const images = PROCESS_PAGES.flatMap((page) => page.images);
    const pending = images.filter((image) => image.pendingImage?.trim());
    expect(pending).toHaveLength(images.length);
  });
});
