import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Splash } from "../Splash";

describe("Splash", () => {
  it("renders the hooks the boot script drives, by stable id", () => {
    const { container } = render(<Splash />);
    expect(container.querySelector("#splash")).toBeInTheDocument();
    expect(container.querySelector("#splash-pct")).toHaveTextContent("0");
  });

  it("is hidden from assistive technology and holds nothing focusable", () => {
    const { container } = render(<Splash />);
    expect(container.querySelector("#splash")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("a, button, input, [tabindex]")).toBeNull();
  });

  it("renders no script of its own: the boot script in <head> drives it", () => {
    const { container } = render(<Splash />);
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("Splash.module.scss", () => {
  // jsdom applies no CSS; e2e/splash.spec.ts checks what a browser shows.
  const scss = readFileSync(join(__dirname, "..", "Splash.module.scss"), "utf8");

  it("is hidden by default and shown only while the boot script says so", () => {
    expect(scss).toMatch(/\.splash \{[\s\S]*?display: none;\s*position: fixed;/);
    expect(scss).toMatch(/html\[data-splash="show"\]\) \.splash,/);
    expect(scss).toMatch(/html\[data-splash="leaving"\]\) \.splash \{\s*display: grid;/);
  });

  it("draws the bar from the progress the script writes, not from a timer", () => {
    expect(scss).toMatch(/scale: var\(--splash-progress, 0\) 1;/);
    expect(scss).not.toMatch(/animation|@keyframes/);
  });
});
