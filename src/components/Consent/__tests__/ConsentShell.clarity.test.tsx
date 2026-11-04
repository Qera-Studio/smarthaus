// What the consent mechanism tells Clarity. The rules for each state are
// src/lib/__tests__/clarity.test.ts; this holds the wiring, because a shell that
// stopped calling applyClarity would leave a declined visitor being recorded
// with every other test still green.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConsentShell } from "../ConsentShell";
import { applyClarity } from "../../../lib/clarity";
import { CONSENT_COPY } from "../../../content/consent";
import { buildConsentRecord, serialiseConsentCookie } from "../../../lib/consent";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));
jest.mock("../../../lib/clarity", () => ({ applyClarity: jest.fn() }));

const apply = jest.mocked(applyClarity);
const originalRO = window.ResizeObserver;
const NO_CHOICE = { ask: true, analytics: false };
const ACCEPTED = { ask: false, analytics: true };
const DECLINED = { ask: false, analytics: false };

function clearCookie() {
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
}

function store(analytics: boolean) {
  document.cookie = serialiseConsentCookie(buildConsentRecord(analytics, "explicit"), {
    secure: false,
  });
}

function renderShell(standalone = false) {
  render(
    <ConsentShell
      intro={<p>intro</p>}
      panelIntro={<p>panel</p>}
      essential={<p>essential</p>}
      analytics={<p>analytics</p>}
      withdraw={<p>withdraw</p>}
      idPrefix="c"
      standalone={standalone}
    />,
  );
}

const lastState = () => {
  const { ask, analytics } = apply.mock.lastCall![0];
  return { ask, analytics };
};

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  clearCookie();
  apply.mockClear();
});

afterEach(() => {
  window.ResizeObserver = originalRO;
  clearCookie();
  delete (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl;
});

describe("what the shell tells Clarity", () => {
  it("reports no choice on a first visit", () => {
    renderShell();
    expect(lastState()).toEqual(NO_CHOICE);
  });

  it("reports a stored accept on a return visit", () => {
    store(true);
    renderShell();
    expect(lastState()).toEqual(ACCEPTED);
  });

  it("reports a stored decline on a return visit", () => {
    store(false);
    renderShell();
    expect(lastState()).toEqual(DECLINED);
  });

  it("reports a decline, never no choice, when the browser sends an opt-out signal", () => {
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    renderShell();
    expect(apply).not.toHaveBeenCalledWith(expect.objectContaining({ ask: true }));
    expect(lastState()).toEqual(DECLINED);
  });

  it("reports the banner's Accept at once", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: CONSENT_COPY.banner.accept }));
    expect(lastState()).toEqual(ACCEPTED);
  });

  it("reports the banner's Decline at once", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: CONSENT_COPY.banner.decline }));
    expect(lastState()).toEqual(DECLINED);
  });

  it("reports a withdrawal saved in the panel", () => {
    store(true);
    renderShell(true);
    const analytics = screen
      .getAllByRole("switch")
      .find((element) => !(element as HTMLInputElement).disabled)!;
    fireEvent.click(analytics);
    fireEvent.click(screen.getByRole("button", { name: CONSENT_COPY.prefs.save }));
    expect(lastState()).toEqual(DECLINED);
  });

  it("follows a choice made in another tab when this one regains focus", () => {
    renderShell();
    store(false);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(lastState()).toEqual(DECLINED);
  });
});
