import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { EMAIL, PHONE_DISPLAY, PHONE_E164 } from "../../../lib/contact";
import { AnnouncementBar } from "../AnnouncementBar";

/**
 * The contact bar above the nav. The one-row layout from md and the snap
 * scrolling below it are CSS; e2e/announcement-bar.spec.ts covers them in a
 * browser. Here: the three links, their targets, and the arrows' stepping.
 */

const viewport = () => screen.getByRole("list").parentElement as HTMLElement;

/** jsdom has no layout: give the scroller the sizes a phone would. */
function sizeViewport(el: HTMLElement, width: number, items: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: width });
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: width * items });
  el.scrollTo = jest.fn(({ left }: ScrollToOptions) => {
    el.scrollLeft = left ?? 0;
  }) as unknown as typeof el.scrollTo;
}

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

describe("AnnouncementBar", () => {
  it("is a named landmark", () => {
    render(<AnnouncementBar />);
    expect(screen.getByRole("complementary", { name: "Contact Smarthaus" })).toBeInTheDocument();
  });

  it("lists three ways to reach us, in the Figma order", () => {
    render(<AnnouncementBar />);
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      `call us at ${PHONE_DISPLAY}`,
      `mail us at ${EMAIL}`,
      `whatsapp at ${PHONE_DISPLAY}`,
    ]);
  });

  it("dials the E.164 number, never the grouped one", () => {
    render(<AnnouncementBar />);
    const call = screen.getByRole("link", { name: /call us/ });
    expect(call).toHaveAttribute("href", `tel:${PHONE_E164}`);
    expect(call.getAttribute("href")).not.toMatch(/\s/);
  });

  it("mails the published address", () => {
    render(<AnnouncementBar />);
    expect(screen.getByRole("link", { name: /mail us/ })).toHaveAttribute(
      "href",
      `mailto:${EMAIL}`,
    );
  });

  it("opens WhatsApp on the same number, unprefilled", () => {
    render(<AnnouncementBar />);
    const href = screen.getByRole("link", { name: /whatsapp/ }).getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+$/);
    expect(href).toContain(PHONE_E164.slice(1));
  });

  it("puts each link in its own list item", () => {
    render(<AnnouncementBar />);
    for (const item of within(screen.getByRole("list")).getAllByRole("listitem")) {
      expect(within(item).getAllByRole("link")).toHaveLength(1);
    }
  });

  it("has a named arrow either side of the items", () => {
    render(<AnnouncementBar />);
    const prev = screen.getByRole("button", { name: "Previous contact" });
    const next = screen.getByRole("button", { name: "Next contact" });
    const list = screen.getByRole("list");
    expect(prev.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const arrow of [prev, next]) {
      expect(arrow).toHaveAttribute("type", "button");
      expect(arrow.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("serves every link in the HTML, before any script runs", () => {
    const markup = renderToStaticMarkup(<AnnouncementBar />);
    expect(markup).toContain(`href="tel:${PHONE_E164}"`);
    expect(markup).toContain(`href="mailto:${EMAIL}"`);
    expect(markup).toContain('href="https://wa.me/');
  });

  describe("the arrows", () => {
    it("step forward one item at a time", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      const next = screen.getByRole("button", { name: "Next contact" });
      fireEvent.click(next);
      expect(el.scrollLeft).toBe(300);
      fireEvent.click(next);
      expect(el.scrollLeft).toBe(600);
    });

    it("wrap from the last item to the first", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      el.scrollLeft = 600;
      fireEvent.click(screen.getByRole("button", { name: "Next contact" }));
      expect(el.scrollLeft).toBe(0);
    });

    it("wrap from the first item back to the last", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      fireEvent.click(screen.getByRole("button", { name: "Previous contact" }));
      expect(el.scrollLeft).toBe(600);
    });

    it("step back one item from the middle", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      el.scrollLeft = 300;
      fireEvent.click(screen.getByRole("button", { name: "Previous contact" }));
      expect(el.scrollLeft).toBe(0);
    });

    it("tolerate a scroll position a fraction off an item", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      el.scrollLeft = 599.5;
      fireEvent.click(screen.getByRole("button", { name: "Next contact" }));
      expect(el.scrollLeft).toBe(0);
    });

    it("glide by default", () => {
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      fireEvent.click(screen.getByRole("button", { name: "Next contact" }));
      expect(el.scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "smooth" });
    });

    it("jump under reduced motion", () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });
      render(<AnnouncementBar />);
      const el = viewport();
      sizeViewport(el, 300, 3);
      fireEvent.click(screen.getByRole("button", { name: "Next contact" }));
      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
      expect(el.scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "auto" });
    });
  });

  it("contains no em dash", () => {
    expect(renderToStaticMarkup(<AnnouncementBar />)).not.toContain("—");
  });
});
