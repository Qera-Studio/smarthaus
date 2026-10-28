import { act, fireEvent, render, screen } from "@testing-library/react";

import { MENU_CLOSE_DELAY_MS, NavShell } from "../NavShell";

/**
 * The Solutions menu's state, which NavShell holds: from lg the panel under
 * the bar (data-menu), and below lg the solutions shown in place of the
 * links (data-sub). The stylesheet does the moving; what is asserted here is
 * when each state is set, where focus goes, and what is inert.
 */

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

// jsdom has no PointerEvent; without one fireEvent drops pointerType.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? "";
  }
}

class FakeIO {
  static all: FakeIO[] = [];
  targets: Element[] = [];
  constructor(public callback: IntersectionObserverCallback) {
    FakeIO.all.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {}
  deliver(target: Element, isIntersecting: boolean) {
    this.callback(
      [{ target, isIntersecting } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let wide = true;
let noHover = false;
const breakpointListeners: Array<() => void> = [];

const originals = {
  io: window.IntersectionObserver,
  ro: window.ResizeObserver,
  mm: window.matchMedia,
};

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: FakePointerEvent });
});

beforeEach(() => {
  jest.useFakeTimers();
  wide = true;
  noHover = false;
  breakpointListeners.length = 0;
  FakeIO.all = [];
  window.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("hover: none") ? noHover : wide;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => breakpointListeners.push(listener),
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  jest.useRealTimers();
  window.IntersectionObserver = originals.io;
  window.ResizeObserver = originals.ro;
  window.matchMedia = originals.mm;
  document.body.replaceChildren();
});

function renderNav() {
  const footer = document.createElement("footer");
  document.body.append(footer);
  const utils = render(
    <>
      <NavShell
        brandMark={<span>mark</span>}
        brandFull={<span>full</span>}
        links={
          <ul>
            <li data-menu-zone>
              <a href="/solutions">Solutions</a>
              <div data-menu-panel>
                <a href="/solutions">Cameras</a>
                <a href="/solutions">Lighting</a>
              </div>
            </li>
            <li>
              <a href="/pricing">Pricing</a>
            </li>
          </ul>
        }
        solutions={<a href="/solutions">Garage</a>}
        cta={<a href="/contact">Book</a>}
        footer={<span>foot</span>}
      />
      <button type="button">elsewhere on the page</button>
    </>,
  );
  const header = document.querySelector("header")!;
  const zone = header.querySelector<HTMLElement>("[data-menu-zone]")!;
  const trigger = zone.querySelector<HTMLAnchorElement>(":scope > a")!;
  const panel = zone.querySelector<HTMLElement>("[data-menu-panel]")!;
  return { ...utils, header, zone, trigger, panel, footer };
}

const isOpen = (header: HTMLElement) => header.hasAttribute("data-menu");
const onSub = (header: HTMLElement) => header.hasAttribute("data-sub");

/** A click that a handler may cancel, and whether one did. */
function click(target: Element) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

describe("NavShell: the Solutions menu, from lg", () => {
  describe("by mouse", () => {
    it("is shut to begin with", () => {
      const { header } = renderNav();
      expect(isOpen(header)).toBe(false);
    });

    it("opens when the pointer enters the Solutions item", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(isOpen(header)).toBe(true);
    });

    it("says it was the hover, which the stylesheet animates", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(header).toHaveAttribute("data-menu", "hover");
    });

    it("waits MENU_CLOSE_DELAY_MS after the pointer leaves, then closes", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerLeave(zone, { pointerType: "mouse" });
      act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS - 1));
      expect(isOpen(header)).toBe(true);
      act(() => jest.advanceTimersByTime(1));
      expect(isOpen(header)).toBe(false);
    });

    it("stays open when the pointer comes back within the delay", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerLeave(zone, { pointerType: "mouse" });
      act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS / 2));
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS * 2));
      expect(isOpen(header)).toBe(true);
    });

    it("leaves a finger to the tap, not the hover", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "touch" });
      expect(isOpen(header)).toBe(false);
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerLeave(zone, { pointerType: "touch" });
      act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS));
      expect(isOpen(header)).toBe(true);
    });

    it("lets a click on the Solutions link through to /solutions", () => {
      const { zone, trigger } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(click(trigger)).toBe(false);
    });

    it("closes when one of its solutions is chosen", () => {
      const { header, zone, panel } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(click(panel.querySelector("a")!)).toBe(false);
      expect(isOpen(header)).toBe(false);
    });

    it("is untouched by a click on another link", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(click(screen.getByRole("link", { name: "Pricing" }))).toBe(false);
      expect(isOpen(header)).toBe(true);
    });

    it("closes on a press outside it", () => {
      const { header, zone } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerDown(screen.getByRole("button", { name: "elsewhere on the page" }));
      expect(isOpen(header)).toBe(false);
    });

    it("stays open on a press inside it", () => {
      const { header, zone, panel } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerDown(panel);
      expect(isOpen(header)).toBe(true);
    });
  });

  describe("by keyboard", () => {
    it("opens when focus reaches the Solutions link", () => {
      const { header, trigger } = renderNav();
      act(() => trigger.focus());
      expect(isOpen(header)).toBe(true);
    });

    it("says it was the keyboard, which the stylesheet shows at once", () => {
      const { header, trigger } = renderNav();
      act(() => trigger.focus());
      expect(header).toHaveAttribute("data-menu", "focus");
    });

    it("a hover never slows down a menu the keyboard has open", () => {
      const { header, zone, trigger } = renderNav();
      act(() => trigger.focus());
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(header).toHaveAttribute("data-menu", "focus");
    });

    it("focus arriving on a hovered menu shows it at once", () => {
      const { header, zone, trigger } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      act(() => trigger.focus());
      expect(header).toHaveAttribute("data-menu", "focus");
    });

    it("stays open while focus moves through its solutions", () => {
      const { header, trigger, panel } = renderNav();
      act(() => trigger.focus());
      act(() => panel.querySelector("a")!.focus());
      expect(isOpen(header)).toBe(true);
    });

    it("closes at once when focus leaves it, with no delay", () => {
      const { header, trigger } = renderNav();
      act(() => trigger.focus());
      act(() => screen.getByRole("link", { name: "Pricing" }).focus());
      expect(isOpen(header)).toBe(false);
    });

    it("cancels a pending close when focus arrives", () => {
      const { header, zone, trigger } = renderNav();
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      fireEvent.pointerLeave(zone, { pointerType: "mouse" });
      act(() => trigger.focus());
      act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS * 2));
      expect(isOpen(header)).toBe(true);
    });

    it("Escape closes it and puts focus back on the Solutions link", () => {
      const { header, trigger, panel } = renderNav();
      act(() => trigger.focus());
      act(() => panel.querySelector("a")!.focus());
      fireEvent.keyDown(document, { key: "Escape" });
      expect(isOpen(header)).toBe(false);
      expect(trigger).toHaveFocus();
    });

    it("Escape on the Solutions link itself keeps it shut, not reopened by the focus", () => {
      const { header, trigger } = renderNav();
      act(() => trigger.focus());
      fireEvent.keyDown(document, { key: "Escape" });
      expect(isOpen(header)).toBe(false);
      expect(trigger).toHaveFocus();
    });

    it("opens again when focus next arrives", () => {
      const { header, trigger, panel } = renderNav();
      act(() => trigger.focus());
      fireEvent.keyDown(document, { key: "Escape" });
      act(() => panel.querySelector("a")!.focus());
      expect(isOpen(header)).toBe(true);
    });

    it("ignores other keys", () => {
      const { header, trigger } = renderNav();
      act(() => trigger.focus());
      fireEvent.keyDown(document, { key: "Enter" });
      expect(isOpen(header)).toBe(true);
    });

    it("stops listening for Escape once closed", () => {
      const { header, trigger } = renderNav();
      const pricing = screen.getByRole("link", { name: "Pricing" });
      act(() => trigger.focus());
      act(() => pricing.focus());
      fireEvent.keyDown(document, { key: "Escape" });
      expect(isOpen(header)).toBe(false);
      expect(pricing).toHaveFocus();
    });
  });

  describe("on a screen with no hover", () => {
    beforeEach(() => {
      noHover = true;
    });

    it("the first tap on Solutions opens the menu instead of leaving the page", () => {
      const { header, trigger } = renderNav();
      expect(click(trigger)).toBe(true);
      expect(isOpen(header)).toBe(true);
      expect(header).toHaveAttribute("data-menu", "hover");
    });

    it("the second follows the link", () => {
      const { trigger } = renderNav();
      click(trigger);
      expect(click(trigger)).toBe(false);
    });
  });

  describe("what it tells the page", () => {
    it("is inert while shut and reachable while open", () => {
      const { zone, panel } = renderNav();
      expect(panel).toHaveAttribute("inert");
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(panel).not.toHaveAttribute("inert");
    });

    it("the Solutions link says whether it is open", () => {
      const { zone, trigger } = renderNav();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      fireEvent.pointerEnter(zone, { pointerType: "mouse" });
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("closes when the footer takes the screen", () => {
    const { header, zone, footer } = renderNav();
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    const observer = FakeIO.all.find((io) => io.targets.includes(footer))!;
    act(() => observer.deliver(footer, true));
    expect(isOpen(header)).toBe(false);
  });

  it("closes when the window narrows below lg", () => {
    const { header, zone } = renderNav();
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    wide = false;
    act(() => breakpointListeners.forEach((listener) => listener()));
    expect(isOpen(header)).toBe(false);
  });

  it("drops a pending close when it unmounts", () => {
    const { zone, unmount } = renderNav();
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    fireEvent.pointerLeave(zone, { pointerType: "mouse" });
    unmount();
    expect(() => act(() => jest.advanceTimersByTime(MENU_CLOSE_DELAY_MS))).not.toThrow();
  });
});

describe("NavShell: the solutions in the phone menu", () => {
  beforeEach(() => {
    wide = false;
  });

  function openMenu() {
    const nav = renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    return nav;
  }

  const back = () => screen.getByRole("button", { name: "Back", hidden: true });
  // Back's wrapper is the 0fr child; its parent is the side that goes inert.
  const sub = () => back().parentElement!.parentElement!;
  const linksNav = (header: HTMLElement) => header.querySelector("nav")!;
  const panelOf = (header: HTMLElement) => linksNav(header).closest<HTMLElement>("[id]")!;

  it("mounts no copy of the solutions until they are first asked for", () => {
    openMenu();
    expect(screen.queryByRole("link", { name: "Garage", hidden: true })).toBeNull();
  });

  it("keeps the copy once it has been shown, so Back has something to slide away", () => {
    const { trigger } = openMenu();
    click(trigger);
    fireEvent.click(back());
    expect(screen.getByRole("link", { name: "Garage", hidden: true })).toBeInTheDocument();
  });

  it("shows the links to begin with, the solutions inert", () => {
    const { header } = openMenu();
    expect(onSub(header)).toBe(false);
    expect(sub()).toHaveAttribute("inert");
    expect(linksNav(header)).not.toHaveAttribute("inert");
  });

  it("a tap on Solutions shows the solutions instead of leaving the page", () => {
    const { header, trigger } = openMenu();
    expect(click(trigger)).toBe(true);
    expect(onSub(header)).toBe(true);
  });

  it("and swaps which side is inert", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    expect(sub()).not.toHaveAttribute("inert");
    expect(linksNav(header)).toHaveAttribute("inert");
  });

  it("puts focus on Back, the first thing on the new side", () => {
    const { trigger } = openMenu();
    click(trigger);
    expect(back()).toHaveFocus();
  });

  it("the solutions are links to /solutions, reachable once shown", () => {
    const { trigger } = openMenu();
    click(trigger);
    expect(screen.getByRole("link", { name: "Garage" })).toHaveAttribute("href", "/solutions");
  });

  it("Back brings the links back and focus to Solutions", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    fireEvent.click(back());
    expect(onSub(header)).toBe(false);
    expect(trigger).toHaveFocus();
    expect(linksNav(header)).not.toHaveAttribute("inert");
  });

  it("the Solutions link says whether its solutions are showing", () => {
    const { trigger } = openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("never opens the desktop panel", () => {
    const { header, zone, trigger } = openMenu();
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    act(() => trigger.focus());
    expect(isOpen(header)).toBe(false);
  });

  it("leaves other links alone", () => {
    const { header } = openMenu();
    expect(click(screen.getByRole("link", { name: "Pricing" }))).toBe(false);
    expect(onSub(header)).toBe(false);
  });

  it("a menu closed on the solutions opens next time on the links, once it has folded", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(onSub(header)).toBe(true);
    fireEvent.transitionEnd(panelOf(header));
    expect(onSub(header)).toBe(false);
  });

  it("not while the menu is open", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    fireEvent.transitionEnd(panelOf(header));
    expect(onSub(header)).toBe(true);
  });

  it("nor on a transition inside it, which bubbles up", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    fireEvent.transitionEnd(linksNav(header));
    expect(onSub(header)).toBe(true);
  });

  it("moves no focus when it resets on its own", () => {
    const { header, trigger } = openMenu();
    click(trigger);
    const toggle = screen.getByRole("button", { name: "Close menu" });
    act(() => toggle.focus());
    fireEvent.click(toggle);
    fireEvent.transitionEnd(panelOf(header));
    expect(toggle).toHaveFocus();
  });
});
