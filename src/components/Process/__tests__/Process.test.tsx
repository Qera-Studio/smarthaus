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

  it("is a sticky sheet per page: the stack itself needs no timeline", () => {
    expect(scss).toMatch(/position:\s*sticky/);
    expect(scss).not.toMatch(/view-timeline|timeline-scope/);
    // The one animation is the pictures' parallax.
    expect(scss.match(/animation-name:/g)).toHaveLength(1);
    expect(scss.match(/@keyframes/g)).toHaveLength(1);
  });

  describe("the pictures' parallax", () => {
    const stack = () => {
      const start = scss.indexOf("@media (prefers-reduced-motion: no-preference)");
      return scss.slice(start, scss.indexOf("// --- Sheet content"));
    };

    it("only in the stack, on a browser with scroll timelines", () => {
      const block = stack();
      const at = block.indexOf("@supports (animation-timeline: view())");
      expect(at).toBeGreaterThan(-1);
      expect(block.slice(at)).toMatch(/animation-name:\s*process-parallax/);
    });

    it("runs on each frame's own way onto the screen", () => {
      expect(stack()).toMatch(/animation-timeline:\s*view\(\)/);
      expect(stack()).toMatch(/animation-range:\s*entry 0% entry 100svh/);
      expect(stack()).toMatch(/animation-timing-function:\s*linear/);
    });

    it("has neither sheet nor frame be a scroll container, or view() would watch them", () => {
      // overflow: hidden is a scroll container. Both clip, in the stack.
      const rules = stack().replace(/\/\/.*$/gm, "");
      expect(rules).not.toMatch(/overflow:\s*hidden/);
      expect(rules.match(/overflow:\s*clip/g)).toHaveLength(2);
    });

    it("keeps the sheets' shadows faint, and off the page either side of the stack", () => {
      expect(scss).toMatch(/box-shadow:\s*0 \(-\$space-2\) \$space-8 rgba\(\$brown-950, 0\.2\)/);
      expect(scss.match(/\.sheets\s*\{[^}]*\}/)?.[0]).toMatch(/overflow:\s*clip/);
    });

    it("is a tenth shallower than the hero strip's", () => {
      const hero = readFileSync(join(__dirname, "../../HomeHero/HomeHero.module.scss"), "utf8");
      const spare = (source: string, name: string) =>
        source.match(new RegExp(`\\$${name}:\\s*([\\d.]+)%`))?.[1];
      expect(spare(scss, "parallax-spare")).toBe("22.5");
      expect(Number(spare(scss, "parallax-spare"))).toBeCloseTo(
        Number(spare(hero, "hero-parallax-spare")) * 0.9,
      );
    });

    it("travels exactly the spare, so no frame ever shows past its picture", () => {
      expect(stack()).toMatch(/block-size:\s*calc\(100% \+ #\{\$parallax-spare\}\)/);
      expect(scss).toMatch(
        /translate:\s*0 math\.div\(\$parallax-spare, 100% \+ \$parallax-spare\) \* -100%/,
      );
    });
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
