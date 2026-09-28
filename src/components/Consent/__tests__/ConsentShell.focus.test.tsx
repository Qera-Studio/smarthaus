// Where focus goes as the banner and the panel replace each other, rendered
// under React Strict Mode, which runs every effect twice on mount as the dev
// server does. The focus effect once kept a one-shot "first run" flag that
// the second run found already set, so it focused "Choose what to share" on
// every page load in development (reported 2026-09-29). Production runs
// effects once and never showed it, which is why these render in StrictMode.
import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConsentShell } from "../ConsentShell";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

const originalRO = window.ResizeObserver;

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // No record on file, so the banner asks.
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
});

afterEach(() => {
  window.ResizeObserver = originalRO;
  document.cookie = "smarthaus_consent=; max-age=0; path=/";
});

function renderBanner() {
  render(
    <StrictMode>
      <ConsentShell
        intro={<p>intro</p>}
        panelIntro={<p>panel</p>}
        essential={<p>essential</p>}
        analytics={<p>analytics</p>}
        withdraw={<p>withdraw</p>}
        idPrefix="b"
      />
    </StrictMode>,
  );
  return screen.getByRole("button", { name: "Choose what to share" });
}

describe("focus as the stages switch, in Strict Mode", () => {
  it("takes no focus when the banner appears on page load (WCAG 3.2.5)", () => {
    const customise = renderBanner();
    expect(customise).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus into the panel when the panel replaces the banner", () => {
    fireEvent.click(renderBanner());
    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(document.body);
    expect(focused.getAttribute("tabindex")).toBe("-1");
    expect(focused).toContainElement(screen.getByRole("button", { name: "Save preferences" }));
  });

  it("hands focus back to the banner's button when Escape closes the panel", () => {
    fireEvent.click(renderBanner());
    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });
    expect(screen.getByRole("button", { name: "Choose what to share" })).toHaveFocus();
  });
});
