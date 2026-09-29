// The two legal pages as rendered. src/content/__tests__/legal.test.ts checks
// their source against the markdown; this renders them, so every published
// fact is asserted in the DOM a visitor and a crawler actually get.
import { render, screen, within } from "@testing-library/react";
import PrivacyPolicy, { metadata as privacyMetadata } from "../privacy/page";
import TermsAndConditions, { metadata as termsMetadata } from "../terms/page";
import { ADDRESS, EMAIL, PHONE_DISPLAY } from "../../lib/contact";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "../../content/legal/versions";

jest.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));

const originals = {
  io: window.IntersectionObserver,
  ro: window.ResizeObserver,
  matchMedia: window.matchMedia,
};

beforeEach(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.IntersectionObserver = originals.io;
  window.ResizeObserver = originals.ro;
  window.matchMedia = originals.matchMedia;
});

/** The value cell beside a row header, wherever the table renders it. */
function valuesFor(label: string): string[] {
  return screen
    .getAllByRole("rowheader", { name: label })
    .map((header) => header.closest("tr")!.textContent!.replace(header.textContent!, "").trim());
}

describe("/privacy", () => {
  beforeEach(() => {
    render(<PrivacyPolicy />);
  });

  it("renders one h1", () => {
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("prints the shared policy version", () => {
    expect(document.body).toHaveTextContent(PRIVACY_POLICY_VERSION);
    expect(PRIVACY_POLICY_VERSION).toBe("0.2.0-draft");
  });

  it("states the registered address from the one shared source", () => {
    expect(valuesFor("Registered address")).toEqual([ADDRESS]);
    expect(valuesFor("Post")).toEqual([ADDRESS]);
  });

  it("states the contact email and phone from the shared source", () => {
    expect(valuesFor("Privacy contact")).toEqual([EMAIL]);
    expect(valuesFor("General contact")).toEqual([EMAIL]);
    expect(valuesFor("Privacy and data protection")).toEqual([EMAIL]);
    expect(valuesFor("General enquiries")).toEqual([EMAIL]);
    expect(valuesFor("Phone")).toEqual([PHONE_DISPLAY, PHONE_DISPLAY]);
  });

  it("tells a visitor to exercise a right, and to complain first, at the shared email", () => {
    const text = document.body.textContent!;
    expect(text).toContain(`email ${EMAIL} and tell us what you`);
    expect(text).toContain(`Contact ${EMAIL}, and we will`);
  });

  it("lists Resend among the providers processing information now", () => {
    const current = screen.getByRole("table", { name: /currently processing/i });
    const row = within(current).getByRole("rowheader", { name: "Resend" }).closest("tr")!;
    expect(row).toHaveTextContent("Delivers each enquiry you send to our mailbox");
    expect(row).toHaveTextContent("Everything you submit in an enquiry form");
  });

  it("no longer lists Resend as planned", () => {
    const planned = screen.getByRole("table", { name: /planned but not yet/i });
    expect(within(planned).queryByRole("rowheader", { name: "Resend" })).toBeNull();
    expect(within(planned).getByRole("rowheader", { name: "Sanity" })).toBeInTheDocument();
  });

  it("says the one essential cookie remembers the cookie choice, and nothing about spam", () => {
    const text = document.body.textContent!.replace(/\s+/g, " ");
    expect(text).toContain("There is one: it remembers your cookie choice. It is always active.");
    expect(text).not.toMatch(/reject spam/i);
  });

  it("says the needed fields are marked required", () => {
    const text = document.body.textContent!.replace(/\s+/g, " ");
    expect(text).toContain("The fields we need are marked required");
    expect(text).not.toContain("marked optional");
  });

  it("describes the phone number as required, on consent and steps toward a contract", () => {
    const row = screen.getByRole("rowheader", { name: "Phone number" }).closest("tr")!;
    expect(row).toHaveTextContent("Every enquiry form requires it");
    expect(row).toHaveTextContent("Consent, and steps toward a contract");
    expect(row).not.toHaveTextContent("where you provide it");
  });

  it("is noindex while it is a draft", () => {
    expect(privacyMetadata.robots).toEqual({ index: false, follow: true });
  });
});

describe("/terms", () => {
  beforeEach(() => {
    render(<TermsAndConditions />);
  });

  it("renders one h1", () => {
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("prints the shared terms version", () => {
    expect(document.body).toHaveTextContent(TERMS_VERSION);
  });

  it("states the registered and postal address from the shared source", () => {
    expect(valuesFor("Registered address")).toEqual([ADDRESS]);
    expect(valuesFor("Post")).toEqual([ADDRESS]);
  });

  it("states the email and phone from the shared source", () => {
    expect(valuesFor("Contact")).toEqual([EMAIL]);
    expect(valuesFor("Email")).toEqual([EMAIL]);
    expect(valuesFor("Phone")).toEqual([PHONE_DISPLAY, PHONE_DISPLAY]);
  });

  it("is noindex while it is a draft", () => {
    expect(termsMetadata.robots).toEqual({ index: false, follow: true });
  });
});
