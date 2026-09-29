// The panel's Analytics switch against the stored record. The record decides
// what the switch shows until the visitor moves it; after that their unsaved
// choice does, so a re-read (on mount, on tab focus) cannot quietly undo it.
// A save hands control back to the record.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConsentShell } from "../ConsentShell";
import { buildConsentRecord, serialiseConsentCookie } from "../../../lib/consent";

jest.mock("next/navigation", () => ({ usePathname: () => "/cookie-preferences" }));

const originalRO = window.ResizeObserver;

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
});

afterEach(() => {
  window.ResizeObserver = originalRO;
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
});

function store(analytics: boolean) {
  document.cookie = serialiseConsentCookie(buildConsentRecord(analytics, "explicit"), {
    secure: false,
  });
}

function renderPanel() {
  render(
    <ConsentShell
      intro={<p>intro</p>}
      panelIntro={<p>panel</p>}
      essential={<p>essential</p>}
      analytics={<p>analytics</p>}
      withdraw={<p>withdraw</p>}
      idPrefix="p"
      standalone
    />,
  );
  return screen.getAllByRole("switch").find((element) => !(element as HTMLInputElement).disabled)!;
}

const refocus = () =>
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });

describe("the Analytics switch and the stored record", () => {
  it("opens showing the stored choice when the visitor has not touched it", () => {
    store(true);
    expect(renderPanel()).toBeChecked();
  });

  it("follows the record on a re-read while untouched, as when another tab saved", () => {
    const analytics = renderPanel();
    expect(analytics).not.toBeChecked();
    store(true);
    refocus();
    expect(analytics).toBeChecked();
  });

  it("keeps the visitor's unsaved choice through a re-read of the record", () => {
    const analytics = renderPanel();
    fireEvent.click(analytics);
    expect(analytics).toBeChecked();
    // The record still says off, and a focus re-reads it.
    refocus();
    expect(analytics).toBeChecked();
  });

  it("keeps an unsaved 'off' too, over a record that says on", () => {
    store(true);
    const analytics = renderPanel();
    fireEvent.click(analytics);
    expect(analytics).not.toBeChecked();
    refocus();
    expect(analytics).not.toBeChecked();
  });

  it("saves the visitor's choice, then follows the record again", () => {
    const analytics = renderPanel();
    fireEvent.click(analytics);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(decodeURIComponent(document.cookie)).toContain('"analytics":true');

    // Another tab changes the record after the save: this tab follows it,
    // because saving handed control back to the record.
    store(false);
    refocus();
    expect(analytics).not.toBeChecked();
  });
});
