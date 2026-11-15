import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { getImageProps } from "next/image";

import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { SOLUTION_SLUGS } from "../../../sanity/content";
import { solutionLinks } from "../Nav";
import { SOLUTION_PICTURE_SIZES } from "../../../lib/solution-picture";
import { OPENING, OPENING_WAIT_MS, SWIPE_MIN_PX, SolutionsMenu } from "../SolutionsMenu";

const mockPreload = jest.fn();
jest.mock("react-dom", () => ({
  ...jest.requireActual<typeof import("react-dom")>("react-dom"),
  preload: (...args: unknown[]) => mockPreload(...args),
}));

const mockPush = jest.fn();
let mockPathname = "/";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

const SOLUTIONS_MENU_HREF = SITE_SETTINGS.solutionsMenu.href;
const SOLUTIONS_MENU_ITEMS = SITE_SETTINGS.solutionsMenu.items;
const MENU = solutionLinks(SITE_SETTINGS.solutionsMenu);
// Every solution has a page since 2026-11-15. What one without a page does is
// still the menu's behaviour, so these tests take Lighting's away.
const UNPAGED = {
  ...MENU,
  items: MENU.items.map((item, index) =>
    index === 1 ? { ...item, href: SOLUTIONS_MENU_HREF, page: false } : item,
  ),
};

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

function setup({ swipe = false, menu = MENU } = {}) {
  const utils = render(<SolutionsMenu menu={menu} classes={CLASSES} sizes="21rem" swipe={swipe} />);
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

/**
 * A click that a handler may cancel, and whether one did. Cancelled last
 * either way, on the window, so jsdom never tries to follow the link: its
 * "not implemented" lands in whichever test is running when it gets there.
 */
function click(target: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  let prevented = false;
  const last = (e: Event) => {
    prevented = e.defaultPrevented;
    e.preventDefault();
  };
  window.addEventListener("click", last);
  act(() => {
    target.dispatchEvent(event);
  });
  window.removeEventListener("click", last);
  return prevented;
}

describe("SolutionsMenu", () => {
  describe("the list", () => {
    it("names the eight solutions, in order", () => {
      const { links } = setup();
      expect(links.map((link) => link.textContent)).toEqual(
        SOLUTIONS_MENU_ITEMS.map((item) => item.label),
      );
    });

    it("links a solution with a page to it, and the rest to /solutions", () => {
      const { links } = setup();
      links.forEach((link, index) => {
        const { id } = SOLUTIONS_MENU_ITEMS[index]!;
        expect(link).toHaveAttribute(
          "href",
          SOLUTION_SLUGS.includes(id) ? `/solutions/${id}` : SOLUTIONS_MENU_HREF,
        );
      });
    });

    // Shivanshu, 2026-11-15: every solution in the menu has a page.
    it("has a page for every solution", () => {
      const { links } = setup();
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        SOLUTIONS_MENU_ITEMS.map(({ id }) => `/solutions/${id}`),
      );
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
          SOLUTIONS_MENU_ITEMS[index]!.image.src,
        ),
      );
    });

    it("fills its box at the size it is told", () => {
      const { images } = setup();
      for (const image of images) expect(image).toHaveAttribute("sizes", "21rem");
    });

    it("is a link to the solution showing, for a pointer, out of the tab order and hidden from AT", () => {
      const { media, links } = setup();
      expect(media.tagName).toBe("A");
      expect(media).toHaveAttribute("href", "/solutions/cameras");
      fireEvent.pointerEnter(links[1]!, { pointerType: "mouse" });
      expect(media).toHaveAttribute("href", "/solutions/lighting");
      expect(media).toHaveAttribute("tabindex", "-1");
      expect(media).toHaveAttribute("aria-hidden", "true");
      expect(screen.getAllByRole("link")).toHaveLength(8);
    });

    it("goes to the menu's own address for a solution with no page", () => {
      const { media, links } = setup({ menu: UNPAGED });
      fireEvent.pointerEnter(links[1]!, { pointerType: "mouse" });
      expect(media).toHaveAttribute("href", SOLUTIONS_MENU_HREF);
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
      expect(click(media)).toBe(true);
    });

    it("opens it on a plain tap", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 200, 205);
      expect(click(media)).toBe(false);
    });

    it("opens it on the next tap after a swipe", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 300, 100);
      click(media);
      swipe(media, 200, 200);
      expect(click(media)).toBe(false);
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
      expect(click(media)).toBe(false);
    });
  });
});

/**
 * The opening: a click on a solution with a page grows its picture into the
 * page's in a view transition. jsdom has no view transitions and draws
 * nothing, so the browser's part is a stand-in that runs the update the way
 * the browser does, after the old screen is taken; what is asserted is what
 * the menu names, when, and that it leaves nothing behind. e2e/solutions.spec.ts
 * runs the real thing.
 */
describe("the opening", () => {
  type Run = { ran: Promise<void>; finish: () => void; nameAtStart: string };
  let runs: Run[];
  let reduced: boolean;

  const pictureOf = (images: HTMLElement[], index: number) => images[index]!;

  /** The page the router would render: its picture and its copy. */
  function arriveOnPush(slug = "cameras") {
    mockPush.mockImplementation(() => {
      const page = document.createElement("div");
      page.dataset.testPage = "";
      page.innerHTML = `<div data-solution-picture="${slug}"><img alt=""></div><div data-solution-copy=""></div>`;
      document.body.append(page);
    });
  }

  const pagePicture = () => document.querySelector<HTMLElement>("[data-solution-picture]");
  const pageCopy = () => document.querySelector<HTMLElement>("[data-solution-copy]");

  beforeEach(() => {
    runs = [];
    reduced = false;
    mockPush.mockReset();
    mockPathname = "/";
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: jest.fn((update: () => Promise<void>) => {
        // The browser takes the old screen first, then runs the update.
        const nameAtStart =
          document.querySelector<HTMLElement>(
            "[data-solutions-media] img[style*='view-transition-name']",
          )?.style.viewTransitionName ?? "";
        let finish!: () => void;
        const finished = new Promise<void>((resolve) => (finish = resolve));
        const ran = Promise.resolve().then(update);
        runs.push({ ran, finish, nameAtStart });
        return { finished, ready: Promise.resolve(), updateCallbackDone: ran, skipTransition() {} };
      }),
    });
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce") ? reduced : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    // On screen: jsdom lays nothing out, so every element has no boxes.
    jest.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: jest.fn(() => Promise.resolve()),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
    Reflect.deleteProperty(window, "matchMedia");
    Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
    jest.restoreAllMocks();
    jest.useRealTimers();
    document.querySelectorAll("[data-test-page]").forEach((node) => node.remove());
    document.documentElement.removeAttribute(OPENING);
  });

  /** Runs the update and lets the page's picture decode. */
  async function update(run = runs[0]!) {
    await act(async () => {
      await run.ran;
    });
  }

  async function finish(run = runs[0]!) {
    run.finish();
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("opens a solution with a page in one view transition, and cancels the plain navigation", () => {
    arriveOnPush();
    const { links } = setup();
    expect(click(links[0]!)).toBe(true);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
  });

  it("names the menu's picture before the old screen is taken", () => {
    arriveOnPush();
    const { links } = setup();
    click(links[0]!);
    expect(runs[0]!.nameAtStart).toBe("solution-picture");
  });

  it("shows the picture as it is, whatever its fade was doing", () => {
    arriveOnPush();
    const { links, images } = setup();
    click(links[0]!);
    expect(pictureOf(images, 0).style.opacity).toBe("1");
    expect(pictureOf(images, 0).style.transition).toBe("none");
  });

  it("navigates inside the transition, to the solution's page", async () => {
    arriveOnPush();
    const { links } = setup();
    click(links[0]!);
    expect(mockPush).not.toHaveBeenCalled();
    await update();
    expect(mockPush).toHaveBeenCalledWith("/solutions/cameras");
  });

  it("hands the name from the menu's picture to the page's, with the copy's", async () => {
    arriveOnPush();
    const { links, images } = setup();
    click(links[0]!);
    await update();
    expect(pictureOf(images, 0).style.viewTransitionName).toBe("");
    expect(pagePicture()!.style.viewTransitionName).toBe("solution-picture");
    expect(pageCopy()!.style.viewTransitionName).toBe("solution-copy");
  });

  it("waits for the page's picture to decode before the new screen is taken", async () => {
    arriveOnPush();
    const { links } = setup();
    click(links[0]!);
    await update();
    expect(HTMLImageElement.prototype.decode).toHaveBeenCalledTimes(1);
  });

  it("marks the document while it runs, for the stylesheet, and only then", async () => {
    arriveOnPush();
    const { links } = setup();
    click(links[0]!);
    // Not on the old screen: the panel must still be in its snapshot.
    expect(document.documentElement.hasAttribute(OPENING)).toBe(false);
    await update();
    expect(document.documentElement.hasAttribute(OPENING)).toBe(true);
    await finish();
    expect(document.documentElement.hasAttribute(OPENING)).toBe(false);
  });

  it("leaves no name and no style behind once it ends", async () => {
    arriveOnPush();
    const { links, images } = setup();
    click(links[0]!);
    await update();
    await finish();
    const picture = pictureOf(images, 0);
    expect(picture.style.viewTransitionName).toBe("");
    expect(picture.style.opacity).toBe("");
    expect(picture.style.transition).toBe("");
    expect(pagePicture()!.style.viewTransitionName).toBe("");
    expect(pageCopy()!.style.viewTransitionName).toBe("");
  });

  it("shows the clicked solution, even one a finger never hovered", async () => {
    arriveOnPush();
    const { links, images } = setup();
    fireEvent.pointerEnter(links[3]!, { pointerType: "mouse" });
    click(links[0]!);
    expect(activeLink(links)).toBe(0);
    expect(activeImage(images)).toBe(0);
  });

  it("opens the solution showing from its picture too", async () => {
    arriveOnPush();
    const { media } = setup();
    expect(click(media)).toBe(true);
    await update();
    expect(mockPush).toHaveBeenCalledWith("/solutions/cameras");
  });

  it("names the page's copy only if there is one", async () => {
    mockPush.mockImplementation(() => {
      const page = document.createElement("div");
      page.dataset.testPage = "";
      page.innerHTML = `<div data-solution-picture="cameras"><img alt=""></div>`;
      document.body.append(page);
    });
    const { links } = setup();
    click(links[0]!);
    await update();
    expect(pagePicture()!.style.viewTransitionName).toBe("solution-picture");
    expect(pageCopy()).toBeNull();
  });

  it("finds a page that is already in the document", async () => {
    const page = document.createElement("div");
    page.dataset.testPage = "";
    page.innerHTML = `<div data-solution-picture="cameras"><img alt=""></div>`;
    document.body.append(page);
    const { links } = setup();
    click(links[0]!);
    await update();
    expect(pagePicture()!.style.viewTransitionName).toBe("solution-picture");
  });

  it("ignores another solution's picture", async () => {
    arriveOnPush("lighting");
    const { links } = setup();
    jest.useFakeTimers();
    click(links[0]!);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(OPENING_WAIT_MS);
      await runs[0]!.ran;
    });
    expect(pagePicture()!.style.viewTransitionName).toBe("");
  });

  describe("lets a slow page arrive without it", () => {
    it("gives up after OPENING_WAIT_MS, naming nothing", async () => {
      jest.useFakeTimers();
      const { links } = setup();
      click(links[0]!);
      let done = false;
      void runs[0]!.ran.then(() => (done = true));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(OPENING_WAIT_MS - 1);
      });
      expect(done).toBe(false);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
        await runs[0]!.ran;
      });
      expect(done).toBe(true);
    });

    it("does not name a picture that decodes after the wait", async () => {
      let decoded!: () => void;
      Object.defineProperty(HTMLImageElement.prototype, "decode", {
        configurable: true,
        value: () => new Promise<void>((resolve) => (decoded = resolve)),
      });
      arriveOnPush();
      jest.useFakeTimers();
      const { links } = setup();
      click(links[0]!);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(OPENING_WAIT_MS);
        await runs[0]!.ran;
      });
      await act(async () => {
        decoded();
        await Promise.resolve();
      });
      expect(pagePicture()!.style.viewTransitionName).toBe("");
      expect(pageCopy()!.style.viewTransitionName).toBe("");
    });

    it("names a picture that fails to decode, rather than holding the screen", async () => {
      Object.defineProperty(HTMLImageElement.prototype, "decode", {
        configurable: true,
        value: () => Promise.reject(new Error("EncodingError")),
      });
      arriveOnPush();
      const { links } = setup();
      click(links[0]!);
      await update();
      expect(pagePicture()!.style.viewTransitionName).toBe("solution-picture");
    });
  });

  describe("is a plain link instead", () => {
    it("without view transitions in the browser", () => {
      Reflect.deleteProperty(document, "startViewTransition");
      const { links } = setup();
      expect(click(links[0]!)).toBe(false);
    });

    it("under reduced motion", () => {
      reduced = true;
      const { links } = setup();
      expect(click(links[0]!)).toBe(false);
      expect(document.startViewTransition).not.toHaveBeenCalled();
    });

    it.each([["metaKey"], ["ctrlKey"], ["shiftKey"], ["altKey"]])(
      "for a click with %s, which the browser opens elsewhere",
      (key) => {
        const { links } = setup();
        expect(click(links[0]!, { [key]: true })).toBe(false);
        expect(document.startViewTransition).not.toHaveBeenCalled();
      },
    );

    it("for a middle click", () => {
      const { links } = setup();
      expect(click(links[0]!, { button: 1 })).toBe(false);
    });

    it("for a solution with no page yet", () => {
      const { links } = setup({ menu: UNPAGED });
      expect(click(links[1]!)).toBe(false);
      expect(document.startViewTransition).not.toHaveBeenCalled();
    });

    it("on the solution's own page", () => {
      mockPathname = "/solutions/cameras";
      const { links } = setup();
      expect(click(links[0]!)).toBe(false);
    });

    it("from a copy of the menu that is not on screen", () => {
      jest.spyOn(Element.prototype, "getClientRects").mockReturnValue([] as unknown as DOMRectList);
      const { links } = setup();
      expect(click(links[0]!)).toBe(false);
    });

    it("never for the click a swipe ends in", () => {
      const { media } = setup({ swipe: true });
      swipe(media, 300, 100);
      expect(click(media)).toBe(true);
      expect(document.startViewTransition).not.toHaveBeenCalled();
    });
  });

  it("opens from the phone's picture on a plain tap", async () => {
    arriveOnPush();
    const { media } = setup({ swipe: true });
    swipe(media, 200, 205);
    expect(click(media)).toBe(true);
    await update();
    expect(mockPush).toHaveBeenCalledWith("/solutions/cameras");
  });
});

/**
 * Reaching a solution's link warms its page's picture at the size the page
 * asks for, so the opening finds it loaded. React's preload writes the link
 * into the head, and sends each file once however often it is asked.
 */
describe("the warm-up", () => {
  beforeEach(() => mockPreload.mockReset());

  /** The page's picture, as next/image would ask for it at the page's sizes. */
  const pageImage = () => {
    const { props } = getImageProps({
      src: SOLUTIONS_MENU_ITEMS[0]!.image.src,
      width: SOLUTIONS_MENU_ITEMS[0]!.image.width,
      height: SOLUTIONS_MENU_ITEMS[0]!.image.height,
      alt: "",
      sizes: SOLUTION_PICTURE_SIZES,
    });
    return props;
  };

  it("warms a solution's page picture when the mouse reaches its link", () => {
    const { links } = setup();
    fireEvent.pointerEnter(links[0]!, { pointerType: "mouse" });
    expect(mockPreload).toHaveBeenCalledTimes(1);
  });

  it("asks for the page's own file and sizes, so the browser picks what the page will", () => {
    const { links } = setup();
    fireEvent.pointerEnter(links[0]!, { pointerType: "mouse" });
    const props = pageImage();
    expect(mockPreload).toHaveBeenCalledWith(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: SOLUTION_PICTURE_SIZES,
    });
  });

  it("asks for the solution's own picture", () => {
    const { links } = setup();
    fireEvent.pointerEnter(links[0]!, { pointerType: "mouse" });
    const [, options] = mockPreload.mock.calls[0] as [string, { imageSrcSet: string }];
    expect(decodeURIComponent(options.imageSrcSet)).toContain(SOLUTIONS_MENU_ITEMS[0]!.image.src);
  });

  it("warms nothing for a solution with no page", () => {
    const { links } = setup({ menu: UNPAGED });
    fireEvent.pointerEnter(links[1]!, { pointerType: "mouse" });
    expect(mockPreload).not.toHaveBeenCalled();
  });

  it("warms each solution's own picture, every one of them a page", () => {
    const { links } = setup();
    links.forEach((link) => fireEvent.pointerEnter(link, { pointerType: "mouse" }));
    expect(mockPreload).toHaveBeenCalledTimes(SOLUTIONS_MENU_ITEMS.length);
  });

  it("warms on keyboard focus", () => {
    const { links } = setup();
    act(() => links[0]!.focus());
    expect(mockPreload).toHaveBeenCalledTimes(1);
  });

  it("warms as a finger lands, which has no hover", () => {
    const { links } = setup();
    fireEvent.pointerDown(links[0]!, { pointerType: "touch" });
    expect(mockPreload).toHaveBeenCalledTimes(1);
  });

  it("warms nothing as a mouse button goes down: the hover already did", () => {
    const { links } = setup();
    fireEvent.pointerDown(links[0]!, { pointerType: "mouse" });
    expect(mockPreload).not.toHaveBeenCalled();
  });

  it("warms a solution a swipe brings up", () => {
    const { media, links } = setup({ swipe: true, menu: UNPAGED });
    act(() => links[1]!.focus());
    swipe(media, 100, 100 + SWIPE_MIN_PX);
    expect(activeLink(links)).toBe(0);
    expect(mockPreload).toHaveBeenCalledTimes(1);
  });
});
