// The accessibility statement (Accessibility System §22): dated, with its
// method and its known gaps, never a blanket conformance badge.
import type { Metadata } from "next";
import { screen } from "@testing-library/react";
import AccessibilityStatement, { generateMetadata } from "../accessibility/page";
import sitemap from "../sitemap";
import { LEGAL } from "../../../sanity/seed/legal";
import { SITE_SETTINGS } from "../../../sanity/seed/site-settings";
import { renderServer } from "../../__tests__/helpers/server";

// The page's metadata is built from its document in Sanity; the seed stands in.
let metadata: Metadata;
beforeAll(async () => {
  metadata = await generateMetadata();
});

const ACCESSIBILITY_ASSESSED = LEGAL.accessibility.updated!;
const ACCESSIBILITY_SECTIONS = LEGAL.accessibility.sections;

jest.mock("next/navigation", () => ({ usePathname: () => "/accessibility" }));

const originals = { io: window.IntersectionObserver, mm: window.matchMedia };
beforeEach(async () => {
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
afterEach(() => {
  window.IntersectionObserver = originals.io;
  window.matchMedia = originals.mm;
});

const text = () => document.body.textContent!.replace(/\s+/g, " ");

describe("/accessibility", () => {
  beforeEach(async () => {
    await renderServer(<AccessibilityStatement />);
  });

  it("has one h1", async () => {
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("states the target standard", async () => {
    expect(text()).toContain("WCAG) 2.2 at Level AA");
  });

  it("claims partial conformance, never full", async () => {
    expect(text()).toContain("Partially conformant.");
    expect(text()).not.toMatch(/\bfully (conformant|compliant)\b/i);
    expect(text()).not.toMatch(/\bis (AA )?compliant\b/i);
  });

  it("names each known limitation", async () => {
    for (const limitation of [
      "The “Our process” section on the home page",
      "Screen readers.",
      "Keyboards on iPhone.",
      "Pages marked “Coming soon”",
    ]) {
      expect(text()).toContain(limitation);
    }
  });

  it("says what was tested and what was not", async () => {
    expect(text()).toContain("an automated accessibility scan (axe) of every page");
    expect(text()).toContain("Windows high-contrast mode, and the page at 200% zoom");
    expect(text()).toContain("It has not had an independent audit");
    expect(text()).toContain("We have not yet tested the site with VoiceOver, NVDA or TalkBack");
  });

  it("is dated, in the header and in the method section", async () => {
    expect(text()).toContain("Assessed 27 September 2026");
    expect(text()).toContain("Last assessed 27 September 2026.");
  });

  it("gives three ways to report a problem", async () => {
    expect(screen.getByRole("link", { name: "hello@smarthaus.ae" })).toHaveAttribute(
      "href",
      "mailto:hello@smarthaus.ae",
    );
    expect(screen.getByRole("link", { name: "+971 54 375 5150" })).toHaveAttribute(
      "href",
      "tel:+971543755150",
    );
    const whatsapp = screen.getByRole("link", { name: "message us on WhatsApp" });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a heading for every section, with the section's id", async () => {
    for (const section of ACCESSIBILITY_SECTIONS) {
      const heading = screen.getByRole("heading", { level: 2, name: section.title });
      expect(heading).toHaveAttribute("id", section.id);
    }
  });

  it("uses no em dash", async () => {
    expect(text()).not.toContain("—");
  });
});

describe("the statement's currency", () => {
  it("is a real calendar date", async () => {
    expect(new Date(`${ACCESSIBILITY_ASSESSED}T00:00:00Z`).toISOString().slice(0, 10)).toBe(
      ACCESSIBILITY_ASSESSED,
    );
  });

  it("was assessed within the last six months: re-assess and re-date it when this fails", async () => {
    const days = (Date.now() - Date.parse(`${ACCESSIBILITY_ASSESSED}T00:00:00Z`)) / 86_400_000;
    expect(days).toBeLessThan(183);
  });
});

describe("findability (WCAG 2.4.5 Multiple Ways)", () => {
  it("is linked from the footer's legal row", async () => {
    expect(SITE_SETTINGS.legalLinks).toContainEqual({
      href: "/accessibility",
      label: "Accessibility",
    });
  });

  it("is in the sitemap, as a finished page", async () => {
    expect((await sitemap()).map((entry) => entry.url)).toContain(
      "https://smarthaus.ae/accessibility",
    );
  });

  it("is indexable, with its own canonical", async () => {
    // Indexable in full: SEO System §2's large-preview line, not just "index".
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    });
    expect(metadata.alternates).toEqual({ canonical: "/accessibility" });
    expect(metadata.openGraph).toMatchObject({ url: "/accessibility" });
  });
});
