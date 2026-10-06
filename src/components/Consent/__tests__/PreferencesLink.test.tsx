import { fireEvent, render, screen } from "@testing-library/react";

import { OPEN_PREFERENCES_EVENT, PREFERENCES_ROUTE } from "../../../lib/consent";
import { PreferencesLink } from "../PreferencesLink";

function setup() {
  const opened = jest.fn();
  window.addEventListener(OPEN_PREFERENCES_EVENT, opened);
  render(<PreferencesLink className="chip">Cookie Preferences</PreferencesLink>);
  const link = screen.getByRole("link", { name: "Cookie Preferences" });
  return { link, opened, done: () => window.removeEventListener(OPEN_PREFERENCES_EVENT, opened) };
}

describe("PreferencesLink", () => {
  it("is a real link to the withdrawal route, the no-JS path", () => {
    const { link, done } = setup();
    expect(link).toHaveAttribute("href", PREFERENCES_ROUTE);
    expect(link).toHaveClass("chip");
    done();
  });

  it("opens the panel in place on a plain click, without leaving the page", () => {
    const { link, opened, done } = setup();
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(opened).toHaveBeenCalledTimes(1);
    done();
  });

  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"])(
    "leaves a click with %s to the browser",
    (modifier) => {
      const { link, opened, done } = setup();
      const proceeded = fireEvent.click(link, { [modifier]: true });
      expect(proceeded).toBe(true);
      expect(opened).not.toHaveBeenCalled();
      done();
    },
  );
});
