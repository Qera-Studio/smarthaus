import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { SOLUTIONS_MENU_HREF, SOLUTIONS_MENU_ITEMS } from "../../../content/solutions-menu";
import { SWIPE_MIN_PX, SolutionsMenu } from "../SolutionsMenu";

/**
 * The eight solutions and the picture of the one in hand. jsdom runs no CSS,
 * so what is asserted is the state the stylesheet reads: data-shown on one
 * link and one picture.
 */

// jsdom has no PointerEvent; without one fireEvent drops clientX and
// pointerType. Same shim as StripControls.test.tsx.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? "";
  }
}

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
});

const CLASSES = {
  root: "root",
  list: "list",
  item: "item",
  link: "link",
  media: "media",
  image: "image",
};

function setup({ swipe = false } = {}) {
  const utils = render(<SolutionsMenu classes={CLASSES} sizes="21rem" swipe={swipe} />);
  const root = utils.container.firstElementChild as HTMLElement;
  const media = root.querySelector<HTMLElement>("[data-solutions-media]")!;
  return {
    ...utils,
    root,
    media,
    links: within(root.querySelector("ul")!).getAllByRole("link"),
    images: Array.from(media.querySelectorAll("img")),
  };
}

const activeLink = (links: HTMLElement[]) => links.findIndex((l) => l.hasAttribute("data-shown"));
const activeImage = (images: HTMLElement[]) =>
  images.findIndex((i) => i.hasAttribute("data-shown"));

/** A finger pressed at `from` and lifted at `to`, across the picture. */
function swipe(media: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(media, { pointerType: "touch", clientX: from });
  fireEvent.pointerUp(media, { pointerType: "touch", clientX: to });
}

describe("SolutionsMenu", () => {
  describe("the list", () => {
    it("names the eight solutions, in order, each a link to /solutions", () => {
      const { links } = setup();
      expect(links.map((link) => link.textContent)).toEqual(
        SOLUTIONS_MENU_ITEMS.map((item) => item.label),
      );
      for (const link of links) expect(link).toHaveAttribute("href", SOLUTIONS_MENU_HREF);
    });

    it("is a real list, one item per solution", () => {
      const { root } = setup();
      expect(within(root).getAllByRole("listitem")).toHaveLength(8);
    });

    it("gives each item its index for the stagger", () => {
      const { root } = setup();
      within(root)
        .getAllByRole("listitem")
        .forEach((item, index) =>
          expect(item.style.getPropertyValue("--link-index")).toBe(String(index)),
        );
    });

    it("wears the classes it is given", () => {
      const { root, links, media, images } = setup();
      expect(root).toHaveClass("root");
      expect(root.querySelector("ul")).toHaveClass("list");
      expect(root.querySelector("li")).toHaveClass("item");
      for (const link of links) expect(link).toHaveClass("link");
      expect(media).toHaveClass("media");
      for (const image of images) expect(image).toHaveClass("image");
    });
  });

  describe("the solution in hand", () => {
    it("starts on the first", () => {
      const { links, images } = setup();
      expect(activeLink(links)).toBe(0);
      expect(activeImage(images)).toBe(0);
    });

    it("is only ever one", () => {
      const { links, images } = setup();
      fireEvent.pointerEnter(links[3]!, { pointerType: "mouse" });
      expect(links.filter((l) => l.hasAttribute("data-shown"))).toHaveLength(1);
      expect(images.filter((i) => i.hasAttribute("data-shown"))).toHaveLength(1);
    });

    it("follows the mouse, picture and highlight together", () => {
      const { links, images } = setup();
      fireEvent.pointerEnter(links[4]!, { pointerType: "mouse" });
      expect(activeLink(links)).toBe(4);
      expect(activeImage(images)).toBe(4);
    });

    it("follows a pen too", () => {
      const { links } = setup();
      fireEvent.pointerEnter(links[2]!, { pointerType: "pen" });
      expect(activeLink(links)).toBe(2);
    });

    it("stays where it is when the mouse leaves", () => {
      const { links } = setup();
      fireEvent.pointerEnter(links[6]!, { pointerType: "mouse" });
      fireEvent.pointerLeave(links[6]!, { pointerType: "mouse" });
      expect(activeLink(links)).toBe(6);
    });

    it("ignores a finger, which has no hover", () => {
      const { links } = setup();
      fireEvent.pointerEnter(links[5]!, { pointerType: "touch" });
      expect(activeLink(links)).toBe(0);
    });

    it("follows keyboard focus", () => {
      const { links, images } = setup();
      act(() => links[7]!.focus());
      expect(activeLink(links)).toBe(7);
      expect(activeImage(images)).toBe(7);
    });
  });

  describe("the picture", () => {
    it("has one image per solution, decoration with no alt of its own", () => {
      const { images } = setup();
      expect(images).toHaveLength(8);
      for (const image of images) expect(image).toHaveAttribute("alt", "");
    });

    it("draws each solution's own file from public/hero/navBar", () => {
      const { images } = setup();
      images.forEach((image, index) =>
        expect(decodeURIComponent(image.getAttribute("src")!)).toContain(
          `/hero/navBar/${SOLUTIONS_MENU_ITEMS[index]!.image}`,
        ),
      );
    });

    it("fills its box at the size it is told", () => {
      const { images } = setup();
      for (const image of images) expect(image).toHaveAttribute("sizes", "21rem");
    });

    it("is a link to /solutions for a pointer, out of the tab order and hidden from AT", () => {
      const { media } = setup();
      expect(media.tagName).toBe("A");
      expect(media).toHaveAttribute("href", SOLUTIONS_MENU_HREF);
      expect(media).toHaveAttribute("tabindex", "-1");
      expect(media).toHaveAttribute("aria-hidden", "true");
      expect(screen.getAllByRole("link")).toHaveLength(8);
    });

    it("cannot be dragged off as an image", () => {
      const { images } = setup();
      for (const image of images) expect(image).toHaveAttribute("draggable", "false");
    });
  });

  describe("swiped, on a phone", () => {
    it("left moves to the next solution", () => {
      const { media, links } = setup({ swipe: true });
      swipe(media, 200, 200 - SWIPE_MIN_PX);
      expect(activeLink(links)).toBe(1);
    });

    it("right moves to the previous one, wrapping from the first to the last", () => {
      const { media, links, images } = setup({ swipe: true });
      swipe(media, 100, 100 + SWIPE_MIN_PX);
      expect(activeLink(links)).toBe(7);
      expect(activeImage(images)).toBe(7);
    });

    it("wraps from the last to the first", () => {
      const { media, links } = setup({ swipe: true });
      act(() => links[7]!.focus());
      swipe(media, 300, 100);
      expect(activeLink(links)).toBe(0);
    });

    it("steps one solution per swipe, however long the swipe", () => {
      const { media, links } = setup({ swipe: true });
      swipe(media, 380, 0);
      expect(activeLink(links)).toBe(1);
      swipe(media, 380, 0);
      expect(activeLink(links)).toBe(2);
    });

    it("ignores a movement shorter than SWIPE_MIN_PX", () => {
      const { media, links } = setup({ swipe: true });
      swipe(media, 200, 200 - SWIPE_MIN_PX + 1);
      expect(activeLink(links)).toBe(0);
    });

    it("ignores a lift with no press before it", () => {
      const { media, links } = setup({ swipe: true });
      fireEvent.pointerUp(media, { pointerType: "touch", clientX: 0 });
      expect(activeLink(links)).toBe(0);
    });

    it("ignores a press the browser took over for scrolling", () => {
      const { media, links } = setup({ swipe: true });
      fireEvent.pointerDown(media, { pointerType: "touch", clientX: 300 });
      fireEvent.pointerCancel(media, { pointerType: "touch" });
      fireEvent.pointerUp(media, { pointerType: "touch", clientX: 0 });
      expect(activeLink(links)).toBe(0);
    });

    it("does not open the solution when the swipe ends in a click", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 300, 100);
      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      media.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    });

    it("opens it on a plain tap", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 200, 205);
      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      media.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
    });

    it("opens it on the next tap after a swipe", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 300, 100);
      media.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      swipe(media, 200, 200);
      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      media.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
    });

    it("keeps the browser's own image drag from taking the gesture", () => {
      const { media } = setup({ swipe: true });
      const drag = new Event("dragstart", { bubbles: true, cancelable: true });
      media.dispatchEvent(drag);
      expect(drag.defaultPrevented).toBe(true);
    });
  });

  describe("without swipe, on the desktop panel", () => {
    it("a swipe does nothing", () => {
      const { media, links } = setup();
      swipe(media, 300, 100);
      expect(activeLink(links)).toBe(0);
    });

    it("a click on the picture always opens it", () => {
      const { media } = setup();
      swipe(media, 300, 100);
      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      media.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
    });
  });
});
