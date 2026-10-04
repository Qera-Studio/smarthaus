import { render, screen, within } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PROCESS_PAGES } from "../../../content/process";
import { Process } from "../Process";

const dir = join(__dirname, "..");

function sheets() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

describe("Process", () => {
  it("is a region named by its own heading", () => {
    render(<Process />);
    const heading = screen.getByRole("heading", { level: 2, name: "Our Process" });
    expect(heading).toHaveAttribute("id", "our-process");
    expect(heading.closest("section")).toHaveAttribute("aria-labelledby", "our-process");
    expect(heading.closest("section")).toHaveAttribute("data-process", "");
  });

  it("renders one sheet per page, in order", () => {
    render(<Process />);
    expect(sheets()).toHaveLength(PROCESS_PAGES.length);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(PROCESS_PAGES.map((page) => page.title));
  });

  it("puts the section's title on the first sheet, in the slot the steps use", () => {
    render(<Process />);
    const [intro, ...steps] = sheets();
    expect(within(intro!).getByRole("heading", { level: 2 })).toHaveTextContent("Our Process");
    expect(within(intro!).queryByText(/^Step /)).toBeNull();
    steps.forEach((sheet, index) => {
      expect(within(sheet).queryByRole("heading", { level: 2 })).toBeNull();
      expect(within(sheet).getByText(`Step ${PROCESS_PAGES[index + 1]!.step}`)).toBeInTheDocument();
    });
  });

  it("marks every sheet as a dark ground, for the light cursor dot", () => {
    render(<Process />);
    sheets().forEach((sheet) => expect(sheet).toHaveAttribute("data-ground", "dark"));
  });

  it("renders every paragraph, duration and image of every page", () => {
    render(<Process />);
    const items = sheets();
    PROCESS_PAGES.forEach((page, index) => {
      const sheet = within(items[index]!);
      page.body.forEach((paragraph) => expect(sheet.getByText(paragraph)).toBeInTheDocument());
      expect(sheet.getByText(page.duration)).toBeInTheDocument();
      expect(sheet.queryAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(
        page.images.map((image) => image.alt),
      );
    });
  });

  it("no longer offers a scroll region: nothing scrolls sideways", () => {
    const { container } = render(<Process />);
    expect(screen.queryByRole("group")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });
});

describe("the stack's mechanism", () => {
  // jsdom applies no CSS; e2e/process.spec.ts measures the stack in a browser.
  const scss = readFileSync(join(dir, "Process.module.scss"), "utf8");

  it("is a sticky sheet per page, with no scroll timeline or animation", () => {
    expect(scss).toMatch(/position:\s*sticky/);
    expect(scss).not.toMatch(/animation|view-timeline|timeline-scope|@keyframes/);
  });

  it("pins only with motion allowed and a screen tall enough to hold a sheet", () => {
    expect(scss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) and \(min-height: \$stack-min-block\)/,
    );
  });

  it("no longer reaches into the section before it", () => {
    expect(scss).not.toMatch(/:has\(\+/);
    expect(scss).not.toMatch(/margin-block-start:\s*calc\(-1/);
  });

  it("ships no client code", () => {
    for (const file of readdirSync(dir).filter((name) => /\.tsx?$/.test(name))) {
      expect(readFileSync(join(dir, file), "utf8")).not.toMatch(/["']use client["']/);
    }
  });
});
