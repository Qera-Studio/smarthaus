// Stale IntersectionObserver entries, found by the nav-shrink e2e test in CI.
//
// A callback can receive several queued entries for one target at once, oldest
// first. Six components read only the first, so when two arrived together they
// applied the stale state and dropped the current one, with no later crossing
// to correct it. The back-to-top button's dark-ground observer had the
// many-target form of the same mistake.
//
// Every component test below delivers the batch that broke it and asserts the
// NEWEST state wins. Each fails against the code before the fix.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { latestEntry } from "@/lib/observer";
import { NavShell } from "@/components/Nav/NavShell";
import { ScrollToTop } from "@/components/ScrollToTop/ScrollToTop";
import { HardwareStage } from "@/components/Hardware/HardwareStage";
import { ProcessFallback } from "@/components/Process/ProcessFallback";
import { ProcessHandoff } from "@/components/Process/ProcessHandoff";
import { VillaCanvas } from "@/components/Hero/VillaCanvas";
import { ConsentShell } from "@/components/Consent/ConsentShell";
import { HARDWARE_ITEMS } from "@/content/hardware";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

// --- The Hero's dynamic imports, faked just far enough to reach the observer.
jest.mock("three", () => ({
  PerspectiveCamera: class {
    aspect = 1;
    fov = 32;
    updateProjectionMatrix() {}
  },
  Scene: class {
    add() {}
  },
  Vector3: class {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}
  },
  WebGLRenderer: class {
    domElement = document.createElement("canvas");
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  },
}));
jest.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    setDRACOLoader() {}
    loadAsync() {
      return Promise.resolve({ scene: { traverse() {} } });
    }
  },
}));
jest.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: class {
    setDecoderPath() {}
    dispose() {}
  },
}));
jest.mock("../../components/Hero/villa", () => ({ addLighting() {}, configureRenderer() {} }));
jest.mock("../../components/Hero/automations", () => ({ bindAnimation: () => null }));
jest.mock("../../components/Hero/tour", () => ({
  ShotResolver: class {
    pivot = {};
  },
  ShellFader: class {
    dispose() {}
  },
  Flight: class {},
  applyState() {},
  restState: () => ({ position: { distanceTo: () => 10 }, target: { x: 0, y: 0, z: 0 } }),
}));

// --- A controllable IntersectionObserver ------------------------------------

class FakeObserver {
  static all: FakeObserver[] = [];
  targets: Element[] = [];
  disconnected = false;
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeObserver.all.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
}

type Sample = { target: Element; isIntersecting: boolean; top?: number; time?: number };

function entry({ target, isIntersecting, top = 0, time = 0 }: Sample) {
  return {
    target,
    isIntersecting,
    time,
    intersectionRatio: isIntersecting ? 1 : 0,
    boundingClientRect: { top },
  } as unknown as IntersectionObserverEntry;
}

function observerOf(target: Element) {
  const found = FakeObserver.all
    .filter((o) => !o.disconnected && o.targets.includes(target))
    .at(-1);
  if (!found) throw new Error(`no live observer for ${target.outerHTML.slice(0, 60)}`);
  return found;
}

// One callback carrying every sample, in the order given: oldest first.
function deliver(target: Element, ...samples: Omit<Sample, "target">[]) {
  const observer = observerOf(target);
  act(() => {
    observer.callback(
      samples.map((s) => entry({ target, ...s })),
      observer as unknown as IntersectionObserver,
    );
  });
}

function stubMatchMedia(matching: (query: string) => boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matching(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const originalIO = window.IntersectionObserver;
const originalRO = window.ResizeObserver;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  FakeObserver.all = [];
  window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  stubMatchMedia(() => false);
});

afterEach(() => {
  window.IntersectionObserver = originalIO;
  window.ResizeObserver = originalRO;
  window.matchMedia = originalMatchMedia;
  document.body.innerHTML = "";
  document.cookie = "smarthaus_consent=; Max-Age=0; Path=/";
});

const SEEN = { isIntersecting: true };
const GONE = { isIntersecting: false };

// --- The helper -------------------------------------------------------------

describe("latestEntry", () => {
  const el = document.createElement("div");

  it("returns the last entry of a batch", () => {
    const [a, b, c] = [SEEN, GONE, SEEN].map((s) => entry({ target: el, ...s }));
    expect(latestEntry([a!, b!, c!])).toBe(c);
  });

  it("returns the only entry of a batch of one", () => {
    const only = entry({ target: el, ...GONE });
    expect(latestEntry([only])).toBe(only);
  });

  it("returns undefined for an empty batch rather than throwing", () => {
    expect(latestEntry([])).toBeUndefined();
  });
});

// --- Nav --------------------------------------------------------------------

describe("NavShell", () => {
  function renderNav() {
    const footer = document.createElement("footer");
    document.body.append(footer);
    render(
      <NavShell
        brandMark={<span>mark</span>}
        brandFull={<span>full</span>}
        links={<ul />}
        cta={<a href="/contact">Book</a>}
        footer={<span>foot</span>}
      />,
    );
    const header = document.querySelector("header")!;
    const sentinel = header.previousElementSibling!;
    return { header, sentinel, footer };
  }

  it("forms the capsule when the sentinel leaves in the same batch it was seen in", () => {
    const { header, sentinel } = renderNav();
    deliver(sentinel, SEEN, GONE);
    expect(header).toHaveAttribute("data-stuck");
  });

  it("drops the capsule when the sentinel returns in the same batch it left in", () => {
    const { header, sentinel } = renderNav();
    deliver(sentinel, GONE);
    deliver(sentinel, GONE, SEEN);
    expect(header).not.toHaveAttribute("data-stuck");
  });

  it("hides over the footer when the footer arrives in a batch with its earlier absence", () => {
    const { header, footer } = renderNav();
    deliver(footer, GONE, SEEN);
    expect(header).toHaveAttribute("data-at-footer");
    expect(header).toHaveAttribute("inert");
  });

  it("comes back when the footer leaves in a batch with its earlier arrival", () => {
    const { header, footer } = renderNav();
    deliver(footer, SEEN);
    deliver(footer, SEEN, GONE);
    expect(header).not.toHaveAttribute("data-at-footer");
    expect(header).not.toHaveAttribute("inert");
  });

  it("ignores an empty batch", () => {
    const { header, footer } = renderNav();
    deliver(footer, SEEN);
    deliver(footer);
    expect(header).toHaveAttribute("data-at-footer");
  });
});

// --- Back to top ------------------------------------------------------------

describe("ScrollToTop", () => {
  function renderButton(darkSections = 0) {
    const sections = Array.from({ length: darkSections }, () => {
      const s = document.createElement("section");
      s.dataset["ground"] = "dark";
      document.body.append(s);
      return s;
    });
    render(<ScrollToTop />);
    const button = screen.getByRole("button", { hidden: true });
    const sentinel = button.previousElementSibling!;
    return { button, sentinel, sections };
  }

  it("appears when the page top leaves in the same batch it was seen in", () => {
    const { button, sentinel } = renderButton();
    deliver(sentinel, SEEN, GONE);
    expect(button).toHaveAttribute("data-visible");
  });

  it("hides when the page top returns in the same batch it left in", () => {
    const { button, sentinel } = renderButton();
    deliver(sentinel, GONE);
    deliver(sentinel, GONE, SEEN);
    expect(button).not.toHaveAttribute("data-visible");
  });

  it("stays on the dark style while one dark section remains under it and another leaves", () => {
    const { button, sections } = renderButton(2);
    const [first, second] = sections as [HTMLElement, HTMLElement];
    deliver(first, SEEN);
    deliver(second, SEEN);
    deliver(first, GONE);
    expect(button).toHaveAttribute("data-on-dark");
  });

  it("drops the dark style once every dark section has left", () => {
    const { button, sections } = renderButton(2);
    const [first, second] = sections as [HTMLElement, HTMLElement];
    deliver(first, SEEN);
    deliver(second, SEEN);
    deliver(first, GONE);
    deliver(second, GONE);
    expect(button).not.toHaveAttribute("data-on-dark");
  });

  it("applies the newest state of one dark section within a batch", () => {
    const { button, sections } = renderButton(1);
    deliver(sections[0]!, SEEN, GONE);
    expect(button).not.toHaveAttribute("data-on-dark");
  });
});

// --- Hardware carousel ------------------------------------------------------

describe("HardwareStage", () => {
  function renderStage() {
    const { container } = render(<HardwareStage items={HARDWARE_ITEMS} />);
    const root = container.firstElementChild!;
    const bar = () => container.querySelector("[data-running]")!;
    return { root, bar };
  }

  it("runs autoplay when the carousel comes into view in a batch with its earlier absence", () => {
    const { root, bar } = renderStage();
    deliver(root, GONE, SEEN);
    expect(bar()).toHaveAttribute("data-running", "true");
  });

  it("stops autoplay when the carousel leaves in a batch with its earlier presence", () => {
    const { root, bar } = renderStage();
    deliver(root, SEEN);
    deliver(root, SEEN, GONE);
    expect(bar()).toHaveAttribute("data-running", "false");
  });
});

// --- Process rail -----------------------------------------------------------

describe("ProcessFallback", () => {
  const originalCSS = globalThis.CSS;
  let raf: jest.SpyInstance;
  let caf: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as { CSS?: unknown }).CSS = { supports: () => false };
    raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => 7);
    caf = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as { CSS?: unknown }).CSS = originalCSS;
    raf.mockRestore();
    caf.mockRestore();
  });

  function mount() {
    const section = document.createElement("section");
    section.dataset["process"] = "";
    document.body.append(section);
    render(<ProcessFallback />);
    return section;
  }

  it("starts the loop when the rail enters in a batch with its earlier absence", () => {
    const section = mount();
    deliver(section, GONE, SEEN);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("stops the loop when the rail leaves in a batch with its earlier presence", () => {
    const section = mount();
    deliver(section, SEEN);
    deliver(section, SEEN, GONE);
    expect(caf).toHaveBeenCalledWith(7);
    expect(raf).toHaveBeenCalledTimes(1);
  });
});

describe("ProcessHandoff", () => {
  function mount() {
    const section = document.createElement("section");
    section.dataset["process"] = "";
    section.style.setProperty("--process-portal-handoff", "0.5");
    section.style.setProperty("--process-portal-scale", "0.1");
    document.body.append(section);
    render(<ProcessHandoff />, { container: section });
    const marker = section.querySelector("[aria-hidden]")!;
    return { section, marker };
  }

  it("applies the newest state when the marker scrolls past and back in one batch", () => {
    const { section, marker } = mount();
    deliver(
      marker,
      { isIntersecting: false, top: -10, time: 1 },
      { isIntersecting: true, top: 10, time: 2 },
    );
    expect(section).not.toHaveAttribute("data-portal-open");
  });

  it("opens when the last entry of a batch is past the viewport", () => {
    const { section, marker } = mount();
    deliver(
      marker,
      { isIntersecting: true, top: 10, time: 1 },
      { isIntersecting: false, top: -10, time: 2 },
    );
    expect(section).toHaveAttribute("data-portal-open");
  });

  it("measures speed from consecutive entries within one batch", () => {
    // Before the fix only the first entry was read, so a batch never produced
    // a speed sample and the grow duration was never set from it.
    const { section, marker } = mount();
    deliver(
      marker,
      { isIntersecting: true, top: 100, time: 10 },
      { isIntersecting: true, top: 50, time: 20 },
    );
    expect(section.style.getPropertyValue("--process-grow-duration")).toMatch(/^\d+ms$/);
  });

  it("ignores an empty batch", () => {
    const { section, marker } = mount();
    deliver(marker);
    expect(section).not.toHaveAttribute("data-portal-open");
    expect(section.style.getPropertyValue("--process-grow-duration")).toBe("");
  });
});

// --- Hero villa canvas ------------------------------------------------------

describe("VillaCanvas", () => {
  let add: jest.SpyInstance;
  let remove: jest.SpyInstance;
  let raf: jest.SpyInstance;

  beforeEach(() => {
    stubMatchMedia((q) => q === "(hover: hover) and (pointer: fine)");
    add = jest.spyOn(window, "addEventListener");
    remove = jest.spyOn(window, "removeEventListener");
    raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  });

  afterEach(() => {
    add.mockRestore();
    remove.mockRestore();
    raf.mockRestore();
  });

  const listensForPointer = (spy: jest.SpyInstance) =>
    spy.mock.calls.some(([type]) => type === "pointermove");

  async function mountReady() {
    const { container } = render(<VillaCanvas poster={<span data-poster />} />);
    const host = container.firstElementChild!;
    await waitFor(() => expect(host).toHaveAttribute("data-ready"));
    return host;
  }

  it("starts following the pointer when the hero enters in a batch with its earlier absence", async () => {
    const host = await mountReady();
    deliver(host, GONE, SEEN);
    expect(listensForPointer(add)).toBe(true);
  });

  it("stops following the pointer when the hero leaves in a batch with its earlier presence", async () => {
    const host = await mountReady();
    deliver(host, SEEN);
    add.mockClear();
    deliver(host, SEEN, GONE);
    expect(listensForPointer(remove)).toBe(true);
    expect(listensForPointer(add)).toBe(false);
  });
});

// --- Consent Escape listener --------------------------------------------------

describe("ConsentShell Escape", () => {
  function renderBanner() {
    render(
      <ConsentShell
        intro={<p>intro</p>}
        panelIntro={<p>panel</p>}
        essential={<p>essential</p>}
        analytics={<p>analytics</p>}
        withdraw={<p>withdraw</p>}
        idPrefix="t"
      />,
    );
  }

  it("dismisses the banner on Escape and stores nothing", async () => {
    renderBanner();
    const region = await screen.findByRole("region", { name: "Cookie preferences" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(region).not.toBeInTheDocument();
    expect(document.cookie).not.toContain("smarthaus_consent=");
  });

  it("ignores other keys", async () => {
    renderBanner();
    await screen.findByRole("region", { name: "Cookie preferences" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByRole("region", { name: "Cookie preferences" })).toBeInTheDocument();
  });
});
