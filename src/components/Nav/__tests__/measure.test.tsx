// The capsule's width and edge tracks come from two text widths that differ by
// platform. CI's Linux Chrome rendered the link row ~10px wider than the macOS
// value the stylesheet had hard-coded, and the gaps beside it shrank from 77px
// to 72px. These pin the measurement that replaced the constant.
import { render } from "@testing-library/react";
import { trackNavWidths } from "../measure";
import { NavShell } from "../NavShell";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

type Delivered = { target: Element; inlineSize: number };

class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(public callback: ResizeObserverCallback) {
    FakeResizeObserver.all.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  deliver(...batch: Delivered[]) {
    const entries = batch.map(
      ({ target, inlineSize }) =>
        ({
          target,
          borderBoxSize: [{ inlineSize, blockSize: 20 }],
        }) as unknown as ResizeObserverEntry,
    );
    this.callback(entries, this as unknown as ResizeObserver);
  }
}

const originalRO = window.ResizeObserver;
const originalIO = window.IntersectionObserver;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  FakeResizeObserver.all = [];
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = originalRO;
  window.IntersectionObserver = originalIO;
  window.matchMedia = originalMatchMedia;
  document.body.innerHTML = "";
});

function elements() {
  const header = document.createElement("header");
  const links = document.createElement("nav");
  const cta = document.createElement("span");
  header.append(links, cta);
  document.body.append(header);
  return { header, links, cta };
}

describe("trackNavWidths", () => {
  it("observes the link row and the CTA, and nothing else", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    expect(FakeResizeObserver.all).toHaveLength(1);
    expect(FakeResizeObserver.all[0]!.observed).toEqual([links, cta]);
  });

  it("writes nothing until the observer reports", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("");
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("");
  });

  it("writes the row's rendered width to --nav-links-row", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver({ target: links, inlineSize: 394 });
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("394px");
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("");
  });

  it("writes the CTA's rendered width to --nav-cta-width", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver({ target: cta, inlineSize: 131 });
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("131px");
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("");
  });

  it("writes both from one batch", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver(
      { target: links, inlineSize: 384 },
      { target: cta, inlineSize: 129 },
    );
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("384px");
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("129px");
  });

  it("keeps sub-pixel widths exact, so the two gaps stay equal to the pixel", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver(
      { target: links, inlineSize: 393.671875 },
      { target: cta, inlineSize: 129.5 },
    );
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("393.671875px");
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("129.5px");
  });

  it("lets the newest entry win when one target reports twice in a batch", () => {
    // The same stale-entry trap the IntersectionObservers fell into.
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver(
      { target: links, inlineSize: 380 },
      { target: links, inlineSize: 394 },
    );
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("394px");
  });

  it("re-writes when a width changes later, as when the web font lands", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    const observer = FakeResizeObserver.all[0]!;
    observer.deliver({ target: links, inlineSize: 360 });
    observer.deliver({ target: links, inlineSize: 384 });
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("384px");
  });

  it("disconnects on cleanup", () => {
    const { header, links, cta } = elements();
    const stop = trackNavWidths(header, links, cta);
    expect(FakeResizeObserver.all[0]!.disconnected).toBe(false);
    stop();
    expect(FakeResizeObserver.all[0]!.disconnected).toBe(true);
  });

  it("writes only to the header it was given", () => {
    const { header, links, cta } = elements();
    trackNavWidths(header, links, cta);
    FakeResizeObserver.all[0]!.deliver({ target: links, inlineSize: 394 });
    expect(links.style.getPropertyValue("--nav-links-row")).toBe("");
    expect(cta.style.getPropertyValue("--nav-links-row")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--nav-links-row")).toBe("");
  });
});

describe("NavShell measures its own row and CTA", () => {
  beforeEach(() => {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  function renderNav() {
    const result = render(
      <NavShell
        brandMark={<span>mark</span>}
        brandFull={<span>full</span>}
        links={
          <ul>
            <li>Solutions</li>
          </ul>
        }
        cta={<a href="/contact">Book a site visit</a>}
        footer={<span>foot</span>}
      />,
    );
    const header = document.querySelector("header")!;
    const observer = FakeResizeObserver.all.find((o) => o.observed.length === 2)!;
    return { ...result, header, observer };
  }

  it("observes the Primary nav and the slot that holds the CTA", () => {
    const { observer } = renderNav();
    const [links, cta] = observer.observed;
    expect(links).toHaveAttribute("aria-label", "Primary");
    expect(links!.tagName).toBe("NAV");
    expect(links).toContainElement(document.querySelector("ul"));
    expect(cta!.tagName).toBe("SPAN");
    expect(cta!.firstElementChild).toHaveAttribute("href", "/contact");
  });

  it("writes the measured widths onto the header, where the stylesheet reads them", () => {
    const { header, observer } = renderNav();
    const [links, cta] = observer.observed;
    observer.deliver({ target: links!, inlineSize: 394 }, { target: cta!, inlineSize: 131 });
    expect(header.style.getPropertyValue("--nav-links-row")).toBe("394px");
    expect(header.style.getPropertyValue("--nav-cta-width")).toBe("131px");
  });

  it("stops observing when the nav unmounts", () => {
    const { observer, unmount } = renderNav();
    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
