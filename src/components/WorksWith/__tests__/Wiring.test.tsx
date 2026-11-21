import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { stubBrowser, type FakeBrowser } from "../../../__tests__/helpers/browser";
import { ENTRANCE_RATIO, Wiring, type WiringNode } from "../Wiring";

/**
 * The diagram's client island (Shivanshu, 2026-11-16). jsdom draws no CSS, so
 * the geometry is styles.test.ts's and e2e/works-with.spec.ts's; what is
 * here is behaviour: which row each tab and wire takes, what is picked and
 * what the panel says, which wire carries the bar, what a reader is told and
 * when, the cycle and its pause, and what reduced motion leaves out.
 */

const node = (id: string, name: string, title: string): WiringNode => ({
  id,
  name,
  href: `/solutions/${id}`,
  pair: {
    with: id,
    title,
    trigger: `${title} trigger`,
    action: `${title} action`,
    body: `${title} body`,
  },
});

const NODES = [
  node("smart-lock", "Smart lock", "Let them in"),
  node("garage", "Garage", "At the gate"),
  node("lighting", "Lighting", "Light the path"),
];

const CENTRE = {
  id: "cameras",
  name: "Cameras",
  line: "See home from anywhere",
  body: "Works with Smart lock, Garage and Lighting, in the same app.",
};

let browser: FakeBrowser;
let below = false;

beforeEach(() => {
  browser = stubBrowser();
  below = false;
  // Above or below the screen's foot on mount, for the entrance.
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(() => ({ top: below ? window.innerHeight + 100 : 0 }) as DOMRect);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function draw(nodes = NODES) {
  return render(<Wiring centre={CENTRE} nodes={nodes} />);
}

const buttons = () => Array.from(document.querySelectorAll<HTMLButtonElement>("[data-node]"));
const shown = () => document.querySelector("[data-shown]")!;
const live = () => document.querySelector("[aria-live]")!;
const pauseButton = () => screen.queryByRole("button", { name: "Pause the animation" });
const tab = (name: string) => screen.getByRole("button", { name: `${name}, works with Cameras` });
const wires = () => Array.from(document.querySelector(".wires")!.children);
const wire = (slot: string) => document.querySelector(`.wire[data-slot="${slot}"]`)!;
const bars = (el: Element) => Array.from(el.children).map((c) => c.className);
const onScreen = () => act(() => browser.intersect({ isIntersecting: true }));
const running = () => document.querySelector("[data-running]");

describe("Wiring", () => {
  describe("the middle and the tabs", () => {
    it("puts the page's own solution first, named by its menu label", () => {
      draw();
      expect(buttons()[0]).toBe(screen.getByRole("button", { name: "Cameras" }));
      expect(buttons()[0]).toHaveClass("centre");
    });

    it("lists the solutions it pairs with as tabs, in the order given, one list item each", () => {
      draw();
      const list = screen.getByRole("list");
      expect(within(list).getAllByRole("listitem")).toHaveLength(NODES.length);
      expect(
        buttons()
          .slice(1)
          .map((n) => n.textContent),
      ).toEqual(["Smart lock", "Garage", "Lighting"]);
      for (const button of buttons().slice(1)) expect(button).toHaveClass("tab");
    });

    it("names each tab for what it does with the middle, its visible label first (WCAG 2.5.3)", () => {
      draw();
      for (const button of buttons().slice(1)) {
        expect(button.getAttribute("aria-label")).toBe(`${button.textContent}, works with Cameras`);
      }
    });

    it("gives every button a pressed state, and one only is pressed", () => {
      draw();
      for (const button of buttons()) expect(button).toHaveAttribute("aria-pressed");
      expect(buttons().filter((n) => n.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    });

    it("draws each icon from the solution's own id, hidden from a screen reader", () => {
      draw();
      const icons = Array.from(document.querySelectorAll("[data-icon]"));
      expect(icons.map((i) => i.getAttribute("data-icon"))).toEqual([
        "cameras",
        "smart-lock",
        "garage",
        "lighting",
      ]);
      for (const icon of icons) expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    // Shivanshu, 2026-11-16: no glowing ring or circle on a component, and no dot.
    it("puts nothing on a tab but its icon and its name", () => {
      draw();
      for (const button of buttons().slice(1)) {
        expect(Array.from(button.children).map((c) => c.className)).toEqual(["icon", "label"]);
      }
      expect(Array.from(buttons()[0]!.children).map((c) => c.className)).toEqual([
        "icon",
        "centreName",
      ]);
      expect(document.querySelector(".halo")).toBeNull();
    });

    it.each([
      [1, ["middle"]],
      [2, ["top", "bottom"]],
      [3, ["top", "middle", "bottom"]],
    ])("sets %i tab(s) in the rows that keep it symmetrical: %j", (count, rows) => {
      draw(NODES.slice(0, count));
      const places = Array.from(document.querySelectorAll("li"));
      expect(places.map((li) => li.getAttribute("data-slot"))).toEqual(rows);
      expect(wires().map((w) => w.getAttribute("data-slot"))).toEqual(rows);
    });
  });

  describe("the wires", () => {
    it("are decoration, one per tab, hidden from a screen reader", () => {
      draw();
      expect(document.querySelector(".wires")).toHaveAttribute("aria-hidden", "true");
      expect(wires()).toHaveLength(NODES.length);
    });

    // Shivanshu, 2026-11-16: the line itself a glowing progress bar.
    it("carry the progress bar on the picked tab's wire only while it cycles: up, then across", () => {
      draw();
      expect(bars(wire("top"))).toEqual(["rise", "run"]);
      expect(bars(wire("middle"))).toEqual([]);
      expect(bars(wire("bottom"))).toEqual([]);
      for (const w of wires()) expect(w).not.toHaveAttribute("data-lit");
    });

    it("move the bar to the next wire with the panel, straight across on the middle one", () => {
      draw();
      onScreen();
      fireEvent.animationEnd(running()!);
      expect(bars(wire("top"))).toEqual([]);
      expect(bars(wire("middle"))).toEqual(["run"]);
      fireEvent.animationEnd(running()!);
      expect(bars(wire("bottom"))).toEqual(["rise", "run"]);
    });

    it("light the picked wire end to end, with no bar, once a tab is picked by hand", () => {
      draw();
      fireEvent.click(tab("Lighting"));
      expect(wire("bottom")).toHaveAttribute("data-lit");
      expect(document.querySelectorAll("[data-lit]")).toHaveLength(1);
      expect(document.querySelector(".rise, .run")).toBeNull();
    });

    it("light none of them when the middle is picked", () => {
      draw();
      fireEvent.click(buttons()[0]!);
      expect(document.querySelector("[data-lit]")).toBeNull();
      expect(document.querySelector(".rise, .run")).toBeNull();
    });

    it("light the one wire there is, with nothing to cycle", () => {
      draw(NODES.slice(0, 1));
      expect(wire("middle")).toHaveAttribute("data-lit");
      expect(bars(wire("middle"))).toEqual([]);
    });
  });

  describe("the panel", () => {
    it("opens on the first pair", () => {
      draw();
      expect(tab("Smart lock")).toHaveAttribute("aria-pressed", "true");
      expect(shown()).toHaveAttribute("data-panel", "smart-lock");
      expect(within(shown() as HTMLElement).getByRole("heading", { level: 3 })).toHaveTextContent(
        "Let them in",
      );
    });

    it("opens on the middle when nothing is paired", () => {
      draw([]);
      expect(buttons()[0]).toHaveAttribute("aria-pressed", "true");
      expect(shown()).toHaveAttribute("data-panel", "cameras");
    });

    it("has every panel in the page, one shown: the box is as tall as the longest", () => {
      draw();
      expect(document.querySelectorAll("[data-panel]")).toHaveLength(NODES.length + 1);
      expect(document.querySelectorAll("[data-shown]")).toHaveLength(1);
    });

    it("says what a pair does: its title, when, then, what it means, and where to read more", () => {
      draw();
      fireEvent.click(tab("Garage"));
      const panel = shown() as HTMLElement;
      expect(panel).toHaveAttribute("data-panel", "garage");
      expect(within(panel).getByText("Garage")).toBeInTheDocument();
      expect(within(panel).getByRole("heading", { level: 3 })).toHaveTextContent("At the gate");
      expect(panel).toHaveTextContent("When At the gate trigger");
      expect(panel).toHaveTextContent("Then At the gate action");
      expect(within(panel).getByText("At the gate body")).toBeInTheDocument();
      expect(within(panel).getByRole("link", { name: "Explore Garage" })).toHaveAttribute(
        "href",
        "/solutions/garage",
      );
    });

    // Shivanshu, 2026-11-16: the link pinned to the card's bottom left.
    it("puts each link in a box of its own, last in its card, for the stylesheet to pin to the foot", () => {
      draw();
      for (const id of ["smart-lock", "garage", "lighting"]) {
        const card = document.querySelector(`[data-panel="${id}"]`)!;
        const foot = card.lastElementChild!;
        expect(foot).toHaveClass("cta");
        expect(foot.children).toHaveLength(1);
        expect(foot.firstElementChild!.tagName).toBe("A");
      }
    });

    it("draws each link as the light button made for a dark ground", () => {
      draw();
      for (const link of document.querySelectorAll("[data-panel] a")) {
        expect(link).toHaveAttribute("data-variant", "inverse");
        expect(link).toHaveAttribute("data-size", "sm");
      }
    });

    it("bolds When and Then, the chips' own words, and hides the arrow between them", () => {
      draw();
      const strong = Array.from(shown().querySelectorAll("strong")).map((s) => s.textContent);
      expect(strong).toEqual(["When", "Then"]);
      expect(shown().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });

    it("shows the middle's own line and what it pairs with, with no link", () => {
      draw();
      fireEvent.click(buttons()[0]!);
      const panel = shown() as HTMLElement;
      expect(panel).toHaveAttribute("data-panel", "cameras");
      expect(within(panel).getByRole("heading", { level: 3 })).toHaveTextContent(CENTRE.line);
      expect(within(panel).getByText(CENTRE.body)).toBeInTheDocument();
      expect(within(panel).queryByRole("link")).toBeNull();
    });

    it("moves the pressed state with the pick", () => {
      draw();
      fireEvent.click(tab("Lighting"));
      expect(tab("Lighting")).toHaveAttribute("aria-pressed", "true");
      expect(tab("Smart lock")).toHaveAttribute("aria-pressed", "false");
    });

    it("holds the pause button in the card, after every card's content", () => {
      draw();
      const panel = pauseButton()!.parentElement!;
      expect(panel).toHaveClass("panel");
      for (const card of panel.querySelectorAll("[data-panel]")) {
        expect(card.compareDocumentPosition(pauseButton()!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      }
    });
  });

  describe("what a screen reader hears", () => {
    it("has one polite live region, empty until someone picks", () => {
      draw();
      expect(document.querySelectorAll("[aria-live]")).toHaveLength(1);
      expect(live()).toHaveAttribute("aria-live", "polite");
      expect(live()).toHaveTextContent("");
    });

    it("announces a picked pair: who, what, when and then", () => {
      draw();
      fireEvent.click(tab("Smart lock"));
      expect(live()).toHaveTextContent(
        "Smart lock: Let them in. When Let them in trigger. Then Let them in action.",
      );
    });

    it("announces the middle by its own line", () => {
      draw();
      fireEvent.click(buttons()[0]!);
      expect(live()).toHaveTextContent("Cameras: See home from anywhere");
    });

    it("announces nothing when the cycle moves the panel on: it would talk every few seconds", () => {
      draw();
      onScreen();
      fireEvent.animationEnd(running()!);
      expect(shown()).toHaveAttribute("data-panel", "garage");
      expect(live()).toHaveTextContent("");
    });
  });

  describe("the keyboard", () => {
    it("walks the middle and the tabs with the arrows, in order, wrapping both ways", () => {
      draw();
      const all = buttons();
      act(() => all[0]!.focus());
      fireEvent.keyDown(all[0]!, { key: "ArrowDown" });
      expect(document.activeElement).toBe(all[1]);
      fireEvent.keyDown(all[1]!, { key: "ArrowRight" });
      expect(document.activeElement).toBe(all[2]);
      fireEvent.keyDown(all[2]!, { key: "ArrowUp" });
      expect(document.activeElement).toBe(all[1]);
      fireEvent.keyDown(all[1]!, { key: "ArrowLeft" });
      expect(document.activeElement).toBe(all[0]);
      fireEvent.keyDown(all[0]!, { key: "ArrowUp" });
      expect(document.activeElement).toBe(all.at(-1));
      fireEvent.keyDown(all.at(-1)!, { key: "ArrowDown" });
      expect(document.activeElement).toBe(all[0]);
    });

    it("moves focus without picking: Enter and Space are the buttons' own", () => {
      draw();
      fireEvent.keyDown(buttons()[0]!, { key: "ArrowDown" });
      expect(buttons()[0]).toHaveAttribute("aria-pressed", "false");
      expect(tab("Smart lock")).toHaveAttribute("aria-pressed", "true");
    });

    it("leaves every other key to the page", () => {
      draw();
      const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      act(() => {
        buttons()[0]!.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    });

    it("keeps an arrow from scrolling the page", () => {
      draw();
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        buttons()[0]!.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("the cycle", () => {
    it("waits until the diagram is on screen", () => {
      draw();
      const waiting = document.querySelectorAll(".timer");
      expect(waiting).toHaveLength(1);
      expect(waiting[0]).not.toHaveAttribute("data-running");
      onScreen();
      expect(running()).not.toBeNull();
    });

    it("moves down the column when its timer runs out, and wraps to the top", () => {
      draw();
      onScreen();
      fireEvent.animationEnd(running()!);
      expect(shown()).toHaveAttribute("data-panel", "garage");
      fireEvent.animationEnd(running()!);
      expect(shown()).toHaveAttribute("data-panel", "lighting");
      fireEvent.animationEnd(running()!);
      expect(shown()).toHaveAttribute("data-panel", "smart-lock");
    });

    it("gives each pair a fresh timer", () => {
      draw();
      onScreen();
      const first = running();
      fireEvent.animationEnd(first!);
      expect(running()).not.toBe(first);
    });

    it("stops off screen", () => {
      draw();
      onScreen();
      act(() => browser.intersect({ isIntersecting: false }));
      expect(running()).toBeNull();
    });

    it("stops for good once a tab is picked", () => {
      draw();
      onScreen();
      fireEvent.click(tab("Lighting"));
      expect(document.querySelector(".timer")).toBeNull();
    });

    it("stops for good once a tab has focus", () => {
      draw();
      onScreen();
      fireEvent.focus(tab("Lighting"));
      expect(document.querySelector(".timer")).toBeNull();
      expect(shown()).toHaveAttribute("data-panel", "smart-lock");
      // And the pair it stopped on stays lit.
      expect(wire("top")).toHaveAttribute("data-lit");
    });

    it("stops for good once a mouse is over a tab, but not for a finger passing", () => {
      draw();
      onScreen();
      fireEvent.pointerEnter(tab("Lighting"), { pointerType: "touch" });
      expect(document.querySelector(".timer")).not.toBeNull();
      fireEvent.pointerEnter(tab("Lighting"), { pointerType: "mouse" });
      expect(document.querySelector(".timer")).toBeNull();
    });

    it("has nothing to cycle through with one pair", () => {
      draw(NODES.slice(0, 1));
      onScreen();
      expect(document.querySelector(".timer")).toBeNull();
    });
  });

  describe("the pause button (WCAG 2.2.2)", () => {
    it("is shown once motion is allowed, and starts unpressed", () => {
      draw();
      expect(pauseButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("stops the cycle and the bar, and starts them again", () => {
      const { container } = draw();
      onScreen();
      expect(container.firstElementChild).not.toHaveAttribute("data-paused");
      fireEvent.click(pauseButton()!);
      expect(pauseButton()).toHaveAttribute("aria-pressed", "true");
      expect(container.firstElementChild).toHaveAttribute("data-paused");
      expect(running()).toBeNull();
      // Held where it is, not taken away.
      expect(bars(wire("top"))).toEqual(["rise", "run"]);
      fireEvent.click(pauseButton()!);
      expect(container.firstElementChild).not.toHaveAttribute("data-paused");
      expect(running()).not.toBeNull();
    });

    it("holds the bar off screen too, without being pressed", () => {
      const { container } = draw();
      expect(container.firstElementChild).toHaveAttribute("data-paused");
      expect(pauseButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("carries both glyphs, hidden from a screen reader: the stylesheet shows one", () => {
      draw();
      const glyphs = pauseButton()!.querySelectorAll("svg");
      expect(glyphs).toHaveLength(2);
      for (const glyph of glyphs) expect(glyph).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("the entrance", () => {
    it("waits, unseen, when the diagram is below the screen", () => {
      below = true;
      const { container } = draw();
      expect(container.firstElementChild).toHaveAttribute("data-entrance", "waiting");
    });

    it(`draws in once ${ENTRANCE_RATIO * 100}% of it is on screen, not before`, () => {
      below = true;
      const { container } = draw();
      act(() => browser.intersect({ isIntersecting: true, intersectionRatio: 0.1 }));
      expect(container.firstElementChild).toHaveAttribute("data-entrance", "waiting");
      act(() => browser.intersect({ isIntersecting: true, intersectionRatio: ENTRANCE_RATIO }));
      expect(container.firstElementChild).toHaveAttribute("data-entrance", "in");
    });

    it("stays drawn in when it leaves the screen and comes back", () => {
      below = true;
      const { container } = draw();
      act(() => browser.intersect({ isIntersecting: true, intersectionRatio: 1 }));
      act(() => browser.intersect({ isIntersecting: false, intersectionRatio: 0 }));
      act(() => browser.intersect({ isIntersecting: true, intersectionRatio: 1 }));
      expect(container.firstElementChild).toHaveAttribute("data-entrance", "in");
    });

    it("never hides a diagram already on screen: it stays as the server drew it", () => {
      const { container } = draw();
      act(() => browser.intersect({ isIntersecting: true, intersectionRatio: 1 }));
      expect(container.firstElementChild).not.toHaveAttribute("data-entrance");
    });

    it("watches the whole stage, at the two thresholds it needs", () => {
      const { container } = draw();
      const [observer] = browser.observers;
      expect(observer!.observed).toEqual([container.firstElementChild]);
      expect(observer!.options).toEqual({ threshold: [0, ENTRANCE_RATIO] });
    });

    it("lets its observer go on unmount", () => {
      const { unmount } = draw();
      unmount();
      expect(browser.observers[0]!.disconnected).toBe(true);
    });
  });

  describe("under reduced motion", () => {
    beforeEach(() => {
      browser.reduced = true;
    });

    it("never cycles, never shows the pause button, and never hides anything to draw it in", () => {
      below = true;
      const { container } = draw();
      expect(document.querySelector(".timer")).toBeNull();
      expect(pauseButton()).toBeNull();
      expect(container.firstElementChild).not.toHaveAttribute("data-entrance");
    });

    it("lights the first pair's wire, still, with no bar", () => {
      draw();
      expect(wire("top")).toHaveAttribute("data-lit");
      expect(document.querySelector(".rise, .run")).toBeNull();
    });

    it("watches nothing", () => {
      draw();
      expect(browser.observers).toHaveLength(0);
    });

    it("still picks, and still tells a screen reader", () => {
      draw();
      fireEvent.click(tab("Garage"));
      expect(shown()).toHaveAttribute("data-panel", "garage");
      expect(wire("middle")).toHaveAttribute("data-lit");
      expect(live()).toHaveTextContent("Garage: At the gate. When At the gate trigger.");
    });
  });
});
