import { act, render } from "@testing-library/react";

import { SheetSnap, SNAP_AT, STACK_QUERY } from "../SheetSnap";

/**
 * The Process stack's one island. It renders nothing; it tells the
 * stylesheet the held section's height, and marks the first sheet waiting or
 * in as its top edge crosses a fifth of the way down the screen. What fails
 * silently: the gate (motion for a visitor who asked for less), a stale
 * height, and observers left running after the page has gone.
 */

type Observed = { callback: (entries: unknown[]) => void; targets: Element[]; options?: unknown };

let resize: Observed[] = [];
let intersect: Observed[] = [];
let disconnected = 0;
let stack: boolean;

beforeEach(() => {
  resize = [];
  intersect = [];
  disconnected = 0;
  stack = true;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query === STACK_QUERY && stack }),
  });
  class RO {
    entry: Observed;
    constructor(callback: Observed["callback"]) {
      this.entry = { callback, targets: [] };
      resize.push(this.entry);
    }
    observe(el: Element) {
      this.entry.targets.push(el);
    }
    disconnect() {
      disconnected += 1;
    }
  }
  class IO {
    entry: Observed;
    constructor(callback: Observed["callback"], options: unknown) {
      this.entry = { callback, targets: [], options };
      intersect.push(this.entry);
    }
    observe(el: Element) {
      this.entry.targets.push(el);
    }
    disconnect() {
      disconnected += 1;
    }
  }
  Object.defineProperty(window, "ResizeObserver", { configurable: true, value: RO });
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: IO });
});

/** The stack as Process renders it, with or without a held section. */
function mount(held = true) {
  const page = document.createElement("div");
  page.innerHTML = `
    <div data-process-stack>
      ${held ? '<div data-process-held><section aria-labelledby="hardware"></section></div>' : ""}
      <section data-process><ol><li id="first"></li><li id="second"></li></ol></section>
    </div>`;
  document.body.append(page);
  const held_ = page.querySelector<HTMLElement>("[data-process-held]");
  if (held_) Object.defineProperty(held_, "offsetHeight", { configurable: true, value: 1029 });
  const view = render(<SheetSnap />);
  return {
    stack: page.querySelector<HTMLElement>("[data-process-stack]")!,
    first: page.querySelector<HTMLElement>("#first")!,
    second: page.querySelector<HTMLElement>("#second")!,
    held: held_,
    view,
    page,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SheetSnap", () => {
  it("renders nothing", () => {
    const { view } = mount();
    expect(view.container).toBeEmptyDOMElement();
  });

  it("asks for exactly the stack's own gate", () => {
    expect(STACK_QUERY).toBe("(prefers-reduced-motion: no-preference) and (min-height: 32rem)");
  });

  it("snaps once a fifth of the screen is left to cover", () => {
    expect(SNAP_AT).toBe(0.2);
  });

  describe("where the stack runs", () => {
    it("watches the held section's size, and only that", () => {
      const { held } = mount();
      expect(resize).toHaveLength(1);
      expect(resize[0]!.targets).toEqual([held]);
    });

    it("tells the stylesheet the held section's height", () => {
      const { stack } = mount();
      act(() => resize[0]!.callback([]));
      expect(stack.style.getPropertyValue("--held-block")).toBe("1029px");
    });

    it("tells it again when the height changes", () => {
      const { stack, held } = mount();
      act(() => resize[0]!.callback([]));
      Object.defineProperty(held!, "offsetHeight", { configurable: true, value: 880 });
      act(() => resize[0]!.callback([]));
      expect(stack.style.getPropertyValue("--held-block")).toBe("880px");
    });

    it("watches the first sheet alone, against the screen's top fifth", () => {
      const { first } = mount();
      expect(intersect).toHaveLength(1);
      expect(intersect[0]!.targets).toEqual([first]);
      expect(intersect[0]!.options).toEqual({ rootMargin: "0px 0px -80% 0px" });
    });

    it("marks the first sheet waiting while its top edge is below the line", () => {
      const { first, second } = mount();
      act(() => intersect[0]!.callback([{ isIntersecting: false }]));
      expect(first).toHaveAttribute("data-snap", "waiting");
      expect(second).not.toHaveAttribute("data-snap");
    });

    it("marks it in once its top edge crosses the line, and waiting again on the way back", () => {
      const { first } = mount();
      act(() => intersect[0]!.callback([{ isIntersecting: false }]));
      act(() => intersect[0]!.callback([{ isIntersecting: true }]));
      expect(first).toHaveAttribute("data-snap", "in");
      act(() => intersect[0]!.callback([{ isIntersecting: false }]));
      expect(first).toHaveAttribute("data-snap", "waiting");
    });

    it("takes the newest of several queued entries", () => {
      const { first } = mount();
      act(() => intersect[0]!.callback([{ isIntersecting: false }, { isIntersecting: true }]));
      expect(first).toHaveAttribute("data-snap", "in");
    });

    it("leaves the first sheet whole until the observer has spoken", () => {
      const { first } = mount();
      expect(first).not.toHaveAttribute("data-snap");
    });

    it("snaps the sheet even when it holds nothing, and measures nothing", () => {
      const { first, stack } = mount(false);
      expect(resize[0]!.targets).toEqual([]);
      act(() => resize[0]!.callback([]));
      expect(stack.style.getPropertyValue("--held-block")).toBe("");
      act(() => intersect[0]!.callback([{ isIntersecting: false }]));
      expect(first).toHaveAttribute("data-snap", "waiting");
    });

    it("undoes everything when the page goes", () => {
      const { view, first, stack } = mount();
      act(() => resize[0]!.callback([]));
      act(() => intersect[0]!.callback([{ isIntersecting: false }]));
      view.unmount();
      expect(disconnected).toBe(2);
      expect(stack.style.getPropertyValue("--held-block")).toBe("");
      expect(first).not.toHaveAttribute("data-snap");
    });
  });

  describe("where the stack does not run", () => {
    it("does nothing under reduced motion or on a short screen", () => {
      stack = false;
      const { first, stack: box } = mount();
      expect(resize).toHaveLength(0);
      expect(intersect).toHaveLength(0);
      expect(first).not.toHaveAttribute("data-snap");
      expect(box.style.getPropertyValue("--held-block")).toBe("");
    });

    it("does nothing on a page with no stack", () => {
      render(<SheetSnap />);
      expect(resize).toHaveLength(0);
      expect(intersect).toHaveLength(0);
    });

    it("does nothing when the stack has no sheets", () => {
      const page = document.createElement("div");
      page.innerHTML = "<div data-process-stack><section data-process></section></div>";
      document.body.append(page);
      render(<SheetSnap />);
      expect(intersect).toHaveLength(0);
    });
  });
});
