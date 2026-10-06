import { fireEvent, render, screen } from "@testing-library/react";

import { SERVICE_SHOTS } from "../scenes";
import { ServiceTabs } from "../ServiceTabs";

/**
 * The villa's service rail. Unmounted while FluidHero holds the homepage, and
 * kept so the villa can come back: these pin the keyboard contract AGENTS.md
 * sets for it (a real tablist, roving tabindex, manual activation, Escape
 * leaves the tour) so it comes back working.
 */

function setup(active = "landing") {
  const onSelect = jest.fn();
  const onExit = jest.fn();
  render(<ServiceTabs active={active} onSelect={onSelect} onExit={onExit} />);
  const tabs = screen.getAllByRole("tab");
  return { onSelect, onExit, tabs };
}

const last = SERVICE_SHOTS.length - 1;

describe("ServiceTabs", () => {
  it("is a labelled vertical tablist with one tab per shot", () => {
    const { tabs } = setup();
    const list = screen.getByRole("tablist", { name: "Explore the villa's automation" });
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    expect(tabs.map((tab) => tab.textContent)).toEqual(SERVICE_SHOTS.map((shot) => shot.label));
  });

  it("ties each tab to its panel", () => {
    const { tabs } = setup();
    tabs.forEach((tab, index) => {
      const id = SERVICE_SHOTS[index]!.id;
      expect(tab).toHaveAttribute("id", `shot-tab-${id}`);
      expect(tab).toHaveAttribute("aria-controls", `shot-panel-${id}`);
    });
  });

  it("gives the first tab the only tab stop before anything is selected", () => {
    const { tabs } = setup();
    expect(tabs.map((tab) => tab.tabIndex)).toEqual(tabs.map((_, i) => (i === 0 ? 0 : -1)));
    tabs.forEach((tab) => expect(tab).toHaveAttribute("aria-selected", "false"));
  });

  it("moves the tab stop to the selected tab", () => {
    const selected = SERVICE_SHOTS[2]!.id;
    const { tabs } = setup(selected);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual(tabs.map((_, i) => (i === 2 ? 0 : -1)));
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
  });

  it("selects on click", () => {
    const { tabs, onSelect } = setup();
    fireEvent.click(tabs[1]!);
    expect(onSelect).toHaveBeenCalledWith(SERVICE_SHOTS[1]!.id);
  });

  it.each([
    ["ArrowDown", 0, 1],
    ["ArrowRight", 0, 1],
    ["ArrowUp", 1, 0],
    ["ArrowLeft", 1, 0],
  ])("%s moves focus one tab along", (key, from, to) => {
    const { tabs } = setup();
    fireEvent.keyDown(tabs[from]!, { key });
    expect(tabs[to]).toHaveFocus();
  });

  it("wraps past either end", () => {
    const { tabs } = setup();
    fireEvent.keyDown(tabs[last]!, { key: "ArrowDown" });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowUp" });
    expect(tabs[last]).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", () => {
    const { tabs } = setup();
    fireEvent.keyDown(tabs[2]!, { key: "End" });
    expect(tabs[last]).toHaveFocus();
    fireEvent.keyDown(tabs[last]!, { key: "Home" });
    expect(tabs[0]).toHaveFocus();
  });

  it("moves focus without selecting: activation is manual", () => {
    const { tabs, onSelect } = setup();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowDown" });
    fireEvent.keyDown(tabs[1]!, { key: "End" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("claims the keys it handles, so the page does not scroll as well", () => {
    const { tabs } = setup();
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      tabs[1]!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("leaves the tour on Escape", () => {
    const { tabs, onExit } = setup(SERVICE_SHOTS[1]!.id);
    fireEvent.keyDown(tabs[1]!, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("ignores every other key, leaving focus and its default alone", () => {
    const { tabs, onSelect, onExit } = setup();
    tabs[1]!.focus();
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    tabs[1]!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(tabs[1]).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });
});
