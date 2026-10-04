import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render } from "@testing-library/react";

import { CLICKABLE, Cursor, FINE_POINTER, FORCED_COLORS } from "../Cursor";

/**
 * When the inverting cursor takes over, what shape it takes, and that it gives
 * the native dot back. jsdom applies no CSS, so the inversion itself and the
 * morph are e2e/cursor.spec.ts's.
 */

type Listener = () => void;
let media: Record<string, boolean>;
let listeners: Record<string, Listener[]>;

beforeEach(() => {
  media = { [FINE_POINTER]: true, [FORCED_COLORS]: false };
  listeners = {};
  window.matchMedia = jest.fn((query: string) => ({
    get matches() {
      return media[query] ?? false;
    },
    addEventListener: (_: string, fn: Listener) => (listeners[query] ??= []).push(fn),
    removeEventListener: (_: string, fn: Listener) => {
      listeners[query] = (listeners[query] ?? []).filter((l) => l !== fn);
    },
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  delete document.documentElement.dataset.cursor;
});

const box = () => document.querySelector<HTMLElement>('[aria-hidden="true"][data-shape]');

/** jsdom has no PointerEvent constructor; a MouseEvent carrying the fields will do. */
function pointer(
  type: string,
  init: { x?: number; y?: number; kind?: string; related?: Element | null } = {},
  target: EventTarget = document.body,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    relatedTarget: init.related ?? null,
  });
  Object.defineProperty(event, "pointerType", { value: init.kind ?? "mouse" });
  act(() => {
    target.dispatchEvent(event);
  });
}

function change(query: string, value: boolean) {
  media[query] = value;
  act(() => listeners[query]?.forEach((fn) => fn()));
}

describe("Cursor", () => {
  it("draws a hidden dot, kept from assistive technology, until the mouse moves", () => {
    render(<Cursor />);
    expect(box()).toHaveAttribute("aria-hidden", "true");
    expect(box()).toHaveAttribute("data-shape", "dot");
    expect(box()).toHaveAttribute("data-visible", "false");
    expect(document.documentElement.dataset.cursor).toBeUndefined();
  });

  it("follows the mouse and takes over from the native dot on the first move", () => {
    render(<Cursor />);
    pointer("pointermove", { x: 120, y: 48 });
    expect(box()!.style.translate).toBe("120px 48px");
    expect(box()).toHaveAttribute("data-visible", "true");
    expect(document.documentElement.dataset.cursor).toBe("custom");
  });

  it("ignores a pen or a finger, which have no cursor to replace", () => {
    render(<Cursor />);
    pointer("pointermove", { x: 10, y: 10, kind: "touch" });
    pointer("pointermove", { x: 10, y: 10, kind: "pen" });
    expect(box()).toHaveAttribute("data-visible", "false");
    expect(document.documentElement.dataset.cursor).toBeUndefined();
  });

  it.each([
    ["a link", '<a href="/contact">Book</a>'],
    ["a button", "<button>Go</button>"],
    ["a tab", '<div role="tab">Lock</div>'],
    ["a summary", "<details><summary>More</summary></details>"],
    ["a label", "<label>Name</label>"],
    ["a text field", "<input />"],
  ])("turns square over %s", (_name, html) => {
    render(<Cursor />);
    document.body.insertAdjacentHTML("beforeend", `<div id="host">${html}</div>`);
    const control = document.getElementById("host")!.firstElementChild!;
    pointer("pointerover", {}, control.querySelector("summary") ?? control);
    expect(box()).toHaveAttribute("data-shape", "square");
    document.getElementById("host")!.remove();
  });

  it("stays square over the text and icons inside a control", () => {
    render(<Cursor />);
    document.body.insertAdjacentHTML("beforeend", '<a id="host" href="/"><span>Home</span></a>');
    pointer("pointerover", {}, document.querySelector("#host span")!);
    expect(box()).toHaveAttribute("data-shape", "square");
    document.getElementById("host")!.remove();
  });

  it("turns back into a dot over plain content", () => {
    render(<Cursor />);
    document.body.insertAdjacentHTML("beforeend", '<button id="b">Go</button><p id="p">Text</p>');
    pointer("pointerover", {}, document.getElementById("b")!);
    pointer("pointerover", {}, document.getElementById("p")!);
    expect(box()).toHaveAttribute("data-shape", "dot");
    document.getElementById("b")!.remove();
    document.getElementById("p")!.remove();
  });

  it("stays a dot over a disabled control, which a click does nothing to", () => {
    render(<Cursor />);
    document.body.insertAdjacentHTML("beforeend", '<button id="b" disabled>Go</button>');
    pointer("pointerover", {}, document.getElementById("b")!);
    expect(box()).toHaveAttribute("data-shape", "dot");
    document.getElementById("b")!.remove();
  });

  it("hides when the mouse leaves the window, not when it crosses an element", () => {
    render(<Cursor />);
    pointer("pointermove", { x: 5, y: 5 });
    pointer("pointerout", { related: document.body });
    expect(box()).toHaveAttribute("data-visible", "true");
    pointer("pointerout", { related: null });
    expect(box()).toHaveAttribute("data-visible", "false");
  });

  it("renders nothing for a touch screen, where the native dot stays", () => {
    media[FINE_POINTER] = false;
    render(<Cursor />);
    expect(box()).toBeNull();
    pointer("pointermove", { x: 1, y: 1 });
    expect(document.documentElement.dataset.cursor).toBeUndefined();
  });

  it("renders nothing in forced colours, where the system cursor must win", () => {
    media[FORCED_COLORS] = true;
    render(<Cursor />);
    expect(box()).toBeNull();
  });

  it("gives the native dot back when forced colours switch on mid-visit", () => {
    render(<Cursor />);
    pointer("pointermove", { x: 1, y: 1 });
    change(FORCED_COLORS, true);
    expect(box()).toBeNull();
    expect(document.documentElement.dataset.cursor).toBeUndefined();
  });

  it("takes over when a mouse is plugged in mid-visit", () => {
    media[FINE_POINTER] = false;
    render(<Cursor />);
    change(FINE_POINTER, true);
    pointer("pointermove", { x: 2, y: 3 });
    expect(box()!.style.translate).toBe("2px 3px");
  });

  it("gives the native dot back and stops listening when unmounted", () => {
    const { unmount } = render(<Cursor />);
    pointer("pointermove", { x: 1, y: 1 });
    unmount();
    expect(document.documentElement.dataset.cursor).toBeUndefined();
    pointer("pointermove", { x: 1, y: 1 });
    expect(document.documentElement.dataset.cursor).toBeUndefined();
    expect(Object.values(listeners).flat()).toHaveLength(0);
  });

  it("counts every kind of control the native rules make inherit", () => {
    // globals.scss lists the controls that inherit the dot; each of them is
    // clickable here too, so none keeps the dot by being forgotten.
    for (const control of [
      "a[href]",
      "button",
      '[role="button"]',
      "summary",
      "label",
      "select",
      "input",
      "textarea",
    ]) {
      expect(CLICKABLE).toContain(control);
    }
  });
  it("stays a dot when the event's target is the document, not an element", () => {
    // pointerover can fire with the document as target; it has no closest().
    render(<Cursor />);
    pointer("pointerover", {}, document);
    expect(box()).toHaveAttribute("data-shape", "dot");
  });
});

describe("Cursor.module.scss", () => {
  // jsdom applies no CSS, so the decisions that live in the stylesheet are
  // checked on its source; e2e/cursor.spec.ts checks the pixels.
  const scss = readFileSync(join(__dirname, "..", "Cursor.module.scss"), "utf8");

  it("inverts and turns the hue back, so bone goes brown, not navy", () => {
    expect(scss).toMatch(/backdrop-filter:\s*invert\(1\)\s+hue-rotate\(180deg\);/);
  });

  it("never takes a click meant for what is underneath", () => {
    expect(scss).toMatch(/pointer-events:\s*none;/);
  });

  it("draws the dot and the square at one size, so only the corners change", () => {
    // 24px both (2026-10-03). No scale anywhere: a size change between the
    // shapes is what the client asked to remove.
    expect(scss).toMatch(/--cursor-size:\s*#\{\$space-6\};/);
    expect(scss).not.toMatch(/^\s*scale:/m);
    expect(scss).toMatch(/transition-property:\s*border-radius, opacity;/);
  });
});
