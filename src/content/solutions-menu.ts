/**
 * The Solutions menu in the nav: the eight things we install, each with a
 * picture that shows while it is hovered, focused or swiped to. Every entry
 * goes to /solutions for now (Shivanshu, 2026-10-28), which is one page and
 * has no sections yet.
 *
 * The labels are the Figma's (4678:50257), with "Lighting" for its
 * "Lightings". The pictures are decoration beside a link that already says what it is, so
 * they carry no alt text of their own.
 *
 * Images are in public/hero/navBar/. Licensed stock, used with the client's
 * agreement as a stand-in (Shivanshu, 2026-10-28), like the hero strip's; every
 * row carries `pendingImage` until they are replaced.
 */

export type SolutionsMenuItem = {
  id: string;
  label: string;
  /** Filename in public/hero/navBar/. */
  image: string;
  pendingImage: true;
};

export const SOLUTIONS_MENU_HREF = "/solutions";

export const SOLUTIONS_MENU_ITEMS: readonly SolutionsMenuItem[] = [
  { id: "cameras", label: "Cameras", image: "cameras.jpg", pendingImage: true },
  { id: "lighting", label: "Lighting", image: "lighting.jpg", pendingImage: true },
  { id: "audio", label: "Audio", image: "audio.jpg", pendingImage: true },
  { id: "ac", label: "AC", image: "ac.jpg", pendingImage: true },
  { id: "garage", label: "Garage", image: "garage.jpg", pendingImage: true },
  { id: "smart-lock", label: "Smart lock", image: "smart_lock.jpg", pendingImage: true },
  {
    id: "wall-controller",
    label: "Wall controller",
    image: "wall_controller.jpg",
    pendingImage: true,
  },
  { id: "curtains", label: "Curtains", image: "curtains.jpg", pendingImage: true },
];
