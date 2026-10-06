import { fireEvent, render, screen } from "@testing-library/react";

import { PARTNERS } from "../../../content/partners";
import { PartnerCarousel } from "../PartnerCarousel";
import { env, installEnv } from "./helpers/env";

/**
 * The timer and the slide. jsdom runs no CSS animation, so the timer's
 * `animationend` is fired by hand: that event is the whole contract between
 * the stylesheet and the component.
 */

beforeEach(installEnv);

const tabs = () => screen.getAllByRole("tab");
const selected = () => tabs().findIndex((tab) => tab.getAttribute("aria-selected") === "true");
const panel = (id: string) => document.getElementById(`partner-panel-${id}`)!;
// The root: the tablist sits in the controls row, which sits in the root.
const carousel = () => screen.getByRole("tablist").parentElement!.parentElement!;
const timer = () => document.querySelector<HTMLElement>("span[data-running]");
const pause = () => screen.queryByRole("button", { name: "Pause the partner cards" });

function mount() {
  const utils = render(<PartnerCarousel partners={PARTNERS} />);
  env.inView(true);
  return utils;
}

describe("the timer", () => {
  it("runs while the cards are on screen", () => {
    mount();
    expect(timer()).toHaveAttribute("data-running", "true");
  });

  it("holds while they are off screen", () => {
    mount();
    env.inView(false);
    expect(timer()).toHaveAttribute("data-running", "false");
  });

  it("is not running before the observer has reported anything", () => {
    render(<PartnerCarousel partners={PARTNERS} />);
    expect(timer()).toHaveAttribute("data-running", "false");
  });

  it("advances to the next card when it runs out, and wraps", () => {
    mount();
    fireEvent.animationEnd(timer()!);
    expect(selected()).toBe(1);
    fireEvent.animationEnd(timer()!);
    expect(selected()).toBe(0);
  });

  it("starts again from empty for each card", () => {
    mount();
    const first = timer();
    fireEvent.animationEnd(first!);
    expect(timer()).not.toBe(first);
  });

  it("does not exist under reduced motion, and neither does its pause button", () => {
    env.reduced = true;
    mount();
    expect(timer()).toBeNull();
    expect(pause()).toBeNull();
  });

  it("follows the preference if it changes while the page is open", () => {
    mount();
    env.setReduced(true);
    expect(timer()).toBeNull();
    env.setReduced(false);
    expect(timer()).not.toBeNull();
  });

  it("lets go of its observer and its listener on unmount", () => {
    const { unmount } = mount();
    unmount();
    expect(env.disconnected).toBe(1);
    expect(env.mediaRemoved).toBe(1);
  });
});

describe("the pause button (WCAG 2.2.2)", () => {
  it("stops the timer, and says so through aria-pressed", () => {
    mount();
    fireEvent.click(pause()!);
    expect(pause()).toHaveAttribute("aria-pressed", "true");
    expect(timer()).toHaveAttribute("data-running", "false");
  });

  it("starts it again on a second press", () => {
    mount();
    fireEvent.click(pause()!);
    fireEvent.click(pause()!);
    expect(pause()).toHaveAttribute("aria-pressed", "false");
    expect(timer()).toHaveAttribute("data-running", "true");
  });

  it("stays paused when the reader switches cards by hand", () => {
    mount();
    fireEvent.click(pause()!);
    fireEvent.click(tabs()[1]!);
    expect(timer()).toHaveAttribute("data-running", "false");
  });

  it("is named for these cards, not the hardware carousel's own pause", () => {
    mount();
    expect(pause()).toHaveAccessibleName("Pause the partner cards");
  });

  it("sits outside the tablist, so the tabs stay one tab stop", () => {
    mount();
    expect(screen.getByRole("tablist")).not.toContainElement(pause());
  });
});

describe("the slide", () => {
  it("does not slide the first card in on page load", () => {
    mount();
    expect(carousel()).not.toHaveAttribute("data-direction");
    expect(panel("tis")).toHaveAttribute("data-state", "active");
  });

  it("slides forward when the timer advances", () => {
    mount();
    fireEvent.animationEnd(timer()!);
    expect(carousel()).toHaveAttribute("data-direction", "next");
    expect(panel("fibaro")).toHaveAttribute("data-state", "active");
    expect(panel("tis")).toHaveAttribute("data-state", "leaving");
  });

  it("slides backward when the reader goes back", () => {
    mount();
    fireEvent.click(tabs()[1]!);
    fireEvent.animationEnd(panel("fibaro"));
    fireEvent.click(tabs()[0]!);
    expect(carousel()).toHaveAttribute("data-direction", "prev");
  });

  it("takes the arrow's direction, even where it wraps", () => {
    mount();
    tabs()[0]!.focus();
    fireEvent.keyDown(tabs()[0]!, { key: "ArrowLeft" });
    expect(selected()).toBe(1);
    expect(carousel()).toHaveAttribute("data-direction", "prev");
  });

  it("hides the outgoing card from assistive technology while it slides away", () => {
    mount();
    fireEvent.click(tabs()[1]!);
    expect(panel("tis")).toHaveAttribute("aria-hidden", "true");
    expect(panel("fibaro")).not.toHaveAttribute("aria-hidden");
    // And out of the tab order: aria-hidden alone left its button focusable.
    expect(panel("tis")).toHaveAttribute("inert");
    expect(panel("fibaro")).not.toHaveAttribute("inert");
  });

  it("releases the outgoing card when the incoming one lands", () => {
    mount();
    fireEvent.click(tabs()[1]!);
    fireEvent.animationEnd(panel("fibaro"));
    expect(panel("tis")).not.toHaveAttribute("data-state");
    expect(panel("tis")).not.toHaveAttribute("aria-hidden");
    expect(panel("tis")).not.toHaveAttribute("inert");
  });

  it("ignores the outgoing card's own animation end, and a child's", () => {
    mount();
    fireEvent.click(tabs()[1]!);
    fireEvent.animationEnd(panel("tis"));
    expect(panel("tis")).toHaveAttribute("data-state", "leaving");
    fireEvent.animationEnd(panel("fibaro").querySelector("h3")!);
    expect(panel("tis")).toHaveAttribute("data-state", "leaving");
  });

  it("does nothing when the selected tab is pressed again", () => {
    mount();
    fireEvent.click(tabs()[0]!);
    expect(carousel()).not.toHaveAttribute("data-direction");
    expect(panel("tis")).toHaveAttribute("data-state", "active");
    expect(panel("fibaro")).not.toHaveAttribute("data-state");
  });
});
