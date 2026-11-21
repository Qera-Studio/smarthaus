import { getImageProps } from "next/image";

import { SITE_SETTINGS } from "../../../sanity/seed/site-settings";
import {
  SOLUTION_COPY_NAME,
  SOLUTION_PICTURE_NAME,
  SOLUTION_PICTURE_SIZES,
  solutionPictureProps,
} from "../solution-picture";

/**
 * The one description of a solution's picture that the page draws and the
 * menu warms. If the two asked for different files, the warm-up would load a
 * picture the opening never uses, and the page's would load in view.
 */

const PICTURE = SITE_SETTINGS.solutionsMenu.items[0]!.image;

describe("a solution's picture", () => {
  it("is half the screen from lg, all of it below", () => {
    expect(SOLUTION_PICTURE_SIZES).toBe("(min-width: 64rem) 50vw, 100vw");
  });

  it("breaks at lg, 64rem, as the stylesheet does", () => {
    expect(SOLUTION_PICTURE_SIZES).toContain(`(min-width: ${1024 / 16}rem)`);
  });

  it("is the menu picture's own file, at its own size", () => {
    expect(solutionPictureProps(PICTURE)).toMatchObject({
      src: PICTURE.src,
      width: PICTURE.width,
      height: PICTURE.height,
    });
  });

  it("is decoration: the page's h1 says what it shows", () => {
    expect(solutionPictureProps(PICTURE).alt).toBe("");
  });

  it("asks for the page's sizes", () => {
    expect(solutionPictureProps(PICTURE).sizes).toBe(SOLUTION_PICTURE_SIZES);
  });

  it("drops the picture's other fields, which next/image would pass to the img", () => {
    expect(Object.keys(solutionPictureProps(PICTURE)).sort()).toEqual(
      ["alt", "height", "sizes", "src", "width"].sort(),
    );
  });

  it("gives the same files every time it is asked, so a warmed file is the page's", () => {
    const first = getImageProps(solutionPictureProps(PICTURE)).props;
    const second = getImageProps(solutionPictureProps({ ...PICTURE })).props;
    expect(second.srcSet).toBe(first.srcSet);
    expect(second.src).toBe(first.src);
    expect(first.srcSet).toContain(encodeURIComponent(PICTURE.src));
  });
});

describe("the opening's names", () => {
  it("are the ones globals.scss animates", () => {
    expect(SOLUTION_PICTURE_NAME).toBe("solution-picture");
    expect(SOLUTION_COPY_NAME).toBe("solution-copy");
  });

  it("are valid view-transition names: idents, not none or auto", () => {
    for (const name of [SOLUTION_PICTURE_NAME, SOLUTION_COPY_NAME]) {
      expect(name).toMatch(/^[a-z][a-z-]*$/);
      expect(["none", "auto"]).not.toContain(name);
    }
  });
});
