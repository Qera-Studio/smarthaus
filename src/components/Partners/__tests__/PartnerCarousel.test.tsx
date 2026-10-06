import { act, fireEvent, render, screen } from "@testing-library/react";

import type { Partner } from "../../../content/partners";
import { PartnerCarousel } from "../PartnerCarousel";

/**
 * The toggle itself, against a list longer than today's two, so the wrapping
 * and the Home and End keys are tested where they differ from "the other
 * one". A third partner is a content change, not a component change, and this
 * is what makes that true.
 */

const partner = (id: string, name: string): Partner => ({
  id,
  name,
  title: `A ${name} partner`,
  body: `As a ${name} partner, Smarthaus installs and sets up ${name} systems.`,
  href: `https://${id}.example/`,
  logo: { src: `/hero/${id}.png`, width: 1152, height: 400 },
});

const THREE = [partner("one", "One"), partner("two", "Two"), partner("three", "Three")];

const tabs = () => screen.getAllByRole("tab");
const selected = () => tabs().findIndex((tab) => tab.getAttribute("aria-selected") === "true");
const activePanels = () =>
  screen.getAllByRole("tabpanel", { hidden: true }).filter((panel) => panel.dataset["active"]);

function press(key: string) {
  const focused = document.activeElement as HTMLElement;
  fireEvent.keyDown(focused, { key });
}

describe("PartnerCarousel with three partners", () => {
  beforeEach(() => {
    render(<PartnerCarousel partners={THREE} />);
    tabs()[0]!.focus();
  });

  it("renders a tab and a card for each, in order", () => {
    expect(tabs().map((tab) => tab.textContent)).toEqual(["One", "Two", "Three"]);
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(3);
  });

  it("names the tablist, so the toggle is announced as the partners' own", () => {
    expect(screen.getByRole("tablist")).toHaveAccessibleName("Partners");
  });

  it("keeps exactly one card active, and one tab stop, as it moves", () => {
    for (const key of ["ArrowRight", "ArrowRight", "ArrowLeft", "End", "Home"]) {
      press(key);
      expect(activePanels()).toHaveLength(1);
      expect(tabs().filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    }
  });

  it("steps forward through the middle, not just between two ends", () => {
    press("ArrowRight");
    expect(selected()).toBe(1);
    press("ArrowRight");
    expect(selected()).toBe(2);
    expect(tabs()[2]).toHaveFocus();
  });

  it("wraps from the last back to the first, and from the first to the last", () => {
    press("End");
    expect(selected()).toBe(2);
    press("ArrowRight");
    expect(selected()).toBe(0);
    press("ArrowLeft");
    expect(selected()).toBe(2);
  });

  it("takes the up and down arrows as the same moves, for a reader who tries them", () => {
    press("ArrowDown");
    expect(selected()).toBe(1);
    press("ArrowDown");
    expect(selected()).toBe(2);
    press("ArrowDown");
    expect(selected()).toBe(0);
    press("ArrowUp");
    expect(selected()).toBe(2);
    expect(tabs()[2]).toHaveFocus();
  });

  it("leaves the other cards inactive, not removed, so their copy stays in the HTML", () => {
    press("End");
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.hasAttribute("data-active"))).toEqual([false, false, true]);
    expect(panels[0]).toHaveTextContent("As a One partner");
  });

  it("jumps to either end from the middle with Home and End", () => {
    press("ArrowRight");
    expect(selected()).toBe(1);
    press("End");
    expect(selected()).toBe(2);
    press("Home");
    expect(selected()).toBe(0);
  });

  it("claims the keys it handles, so the page does not scroll as well", () => {
    for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      act(() => {
        (document.activeElement as HTMLElement).dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("shows the card of the tab that was clicked, wherever it is in the list", () => {
    fireEvent.click(tabs()[2]!);
    expect(activePanels()[0]).toHaveAttribute("id", "partner-panel-three");
    fireEvent.click(tabs()[1]!);
    expect(activePanels()[0]).toHaveAttribute("id", "partner-panel-two");
  });

  it("gives each card its own button to its own site", () => {
    for (const [index, id] of ["one", "two", "three"].entries()) {
      fireEvent.click(tabs()[index]!);
      const link = activePanels()[0]!.querySelector("a")!;
      expect(link).toHaveAttribute("href", `https://${id}.example/`);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });
});

describe("PartnerCarousel with one partner", () => {
  it("shows that card, and the arrows stay on it", () => {
    render(<PartnerCarousel partners={[partner("solo", "Solo")]} />);
    tabs()[0]!.focus();
    press("ArrowRight");
    press("ArrowLeft");
    expect(selected()).toBe(0);
    expect(activePanels()).toHaveLength(1);
  });
});
