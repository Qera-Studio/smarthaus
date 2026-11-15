import type { Picture } from "../sanity/localize";

/**
 * A solution's picture, as its page draws it: half the screen from lg, all of
 * it below. The Solutions menu warms the same file on hover with these props
 * (SolutionsMenu.tsx), so the opening finds it already loaded.
 */
export const SOLUTION_PICTURE_SIZES = "(min-width: 64rem) 50vw, 100vw";

/** The view-transition name the menu's picture and the page's share. */
export const SOLUTION_PICTURE_NAME = "solution-picture";
/** The title and its line, which arrive once the picture has. */
export const SOLUTION_COPY_NAME = "solution-copy";

/** Decoration: the page's h1 says what it shows, as the menu's label does. */
export function solutionPictureProps(picture: Picture) {
  return {
    src: picture.src,
    width: picture.width,
    height: picture.height,
    alt: "",
    sizes: SOLUTION_PICTURE_SIZES,
  };
}
