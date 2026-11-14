import { screen, within } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { Process } from "../Process";
import { renderServer } from "../../../__tests__/helpers/server";

const PROCESS_PAGES = HOME_PAGE.process.pages;

const dir = join(__dirname, "..");

function sheets() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

// SheetSnap, the stack's one island, asks for the stack's own gate. jsdom has
// no matchMedia; answering "no stack" keeps it out of these tests, which are
// about the markup. SheetSnap.test.tsx tests it.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

describe("Process", () => {
  it("is a region named by its own heading", async () => {
    await renderServer(<Process />);
    const heading = screen.getByRole("heading", { level: 2, name: "Our Process" });
    expect(heading).toHaveAttribute("id", "our-process");
    expect(heading.closest("section")).toHaveAttribute("aria-labelledby", "our-process");
    expect(heading.closest("section")).toHaveAttribute("data-process", "");
  });

  it("renders one sheet per page, in order", async () => {
    await renderServer(<Process />);
    expect(sheets()).toHaveLength(PROCESS_PAGES.length);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(PROCESS_PAGES.map((page) => page.title));
  });

  it("puts the section's title on the first sheet, in the slot the steps use", async () => {
    await renderServer(<Process />);
    const [intro, ...steps] = sheets();
    expect(within(intro!).getByRole("heading", { level: 2 })).toHaveTextContent("Our Process");
    expect(within(intro!).queryByText(/^Step /)).toBeNull();
    steps.forEach((sheet, index) => {
      expect(within(sheet).queryByRole("heading", { level: 2 })).toBeNull();
      expect(within(sheet).getByText(`Step ${PROCESS_PAGES[index + 1]!.step}`)).toBeInTheDocument();
    });
  });

  it("marks every sheet as a dark ground, for the light cursor dot", async () => {
    await renderServer(<Process />);
    sheets().forEach((sheet) => expect(sheet).toHaveAttribute("data-ground", "dark"));
  });

  it("renders every paragraph, duration and image of every page", async () => {
    await renderServer(<Process />);
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

  it("shares one box with the section it holds, that section first", async () => {
    // 2026-11-14: the homepage hands it the hardware, which holds still while
    // the first sheet rises over it.
    const { container } = await renderServer(<Process held={<p>The held section</p>} />);
    const stack = container.querySelector("[data-process-stack]")!;
    const [held, section] = Array.from(stack.children);
    expect(held).toHaveAttribute("data-process-held", "");
    expect(held).toHaveTextContent("The held section");
    expect(section!.tagName).toBe("SECTION");
    expect(section).toHaveAttribute("data-process", "");
  });

  it("draws no held box when it holds nothing", async () => {
    const { container } = await renderServer(<Process />);
    expect(container.querySelector("[data-process-held]")).toBeNull();
    expect(container.querySelector("[data-process-stack] > section[data-process]")).not.toBeNull();
  });

  it("no longer offers a scroll region: nothing scrolls sideways", async () => {
    const { container } = await renderServer(<Process />);
    expect(screen.queryByRole("group")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });
});

describe("the stack's mechanism", () => {
  // jsdom applies no CSS; e2e/process.spec.ts measures the stack in a browser.
  const scss = readFileSync(join(dir, "Process.module.scss"), "utf8");

  it("is a sticky sheet per page: the stack itself needs no timeline", async () => {
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

    it("only in the stack, on a browser with scroll timelines", async () => {
      const block = stack();
      const at = block.indexOf("@supports (animation-timeline: view())");
      expect(at).toBeGreaterThan(-1);
      expect(block.slice(at)).toMatch(/animation-name:\s*process-parallax/);
    });

    it("runs on each frame's own way onto the screen", async () => {
      expect(stack()).toMatch(/animation-timeline:\s*view\(\)/);
      expect(stack()).toMatch(/animation-range:\s*entry 0% entry 100svh/);
      expect(stack()).toMatch(/animation-timing-function:\s*linear/);
    });

    it("has neither sheet nor frame be a scroll container, or view() would watch them", async () => {
      // overflow: hidden is a scroll container. Both clip, in the stack.
      const rules = stack().replace(/\/\/.*$/gm, "");
      expect(rules).not.toMatch(/overflow:\s*hidden/);
      expect(rules.match(/overflow:\s*clip/g)).toHaveLength(2);
    });

    it("keeps the sheets' shadows faint, and off the page either side of the stack", async () => {
      expect(scss).toMatch(/box-shadow:\s*0 \(-\$space-2\) \$space-8 rgba\(\$brown-950, 0\.2\)/);
      expect(scss.match(/\.sheets\s*\{[^}]*\}/)?.[0]).toMatch(/overflow:\s*clip/);
    });

    it("is a tenth shallower than the hero strip's", async () => {
      const hero = readFileSync(join(__dirname, "../../HomeHero/HomeHero.module.scss"), "utf8");
      const spare = (source: string, name: string) =>
        source.match(new RegExp(`\\$${name}:\\s*([\\d.]+)%`))?.[1];
      expect(spare(scss, "parallax-spare")).toBe("22.5");
      expect(Number(spare(scss, "parallax-spare"))).toBeCloseTo(
        Number(spare(hero, "hero-parallax-spare")) * 0.9,
      );
    });

    it("travels exactly the spare, so no frame ever shows past its picture", async () => {
      expect(stack()).toMatch(/block-size:\s*calc\(100% \+ #\{\$parallax-spare\}\)/);
      expect(scss).toMatch(
        /translate:\s*0 math\.div\(\$parallax-spare, 100% \+ \$parallax-spare\) \* -100%/,
      );
    });
  });

  it("pins only with motion allowed and a screen tall enough to hold a sheet", async () => {
    expect(scss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) and \(min-height: \$stack-min-block\)/,
    );
  });

  it("no longer reaches into the section before it", async () => {
    expect(scss).not.toMatch(/:has\(\+/);
    expect(scss).not.toMatch(/margin-block-start:\s*calc\(-1/);
  });

  it("holds the section before it with its foot above the banner and the floating nav", async () => {
    // Pinned at the very foot, a button near it sat under the cookie banner
    // where no scroll could bring it out (WCAG 2.4.11, found 2026-11-14).
    const held = scss.slice(scss.indexOf(".held {"), scss.indexOf(".stack {"));
    expect(held).toMatch(/position:\s*sticky/);
    expect(held).toMatch(/var\(--held-block, 1000000px\) - var\(--held-foot\)/);
    expect(held).toMatch(
      /--held-foot:\s*calc\(\s*var\(--nav-float-inset\) \+ var\(--nav-bar-block-size\) \+ var\(--consent-block-size, 0px\)/,
    );
    expect(held).toMatch(/@include bp-lg \{\s*--held-foot:\s*var\(--consent-block-size, 0px\);/);
  });

  it("ships one client island, SheetSnap, which renders nothing", async () => {
    // No client code until 2026-11-14: the first sheet's snap needs to know
    // when it has covered four fifths of the screen, which CSS cannot tell.
    const client = readdirSync(dir)
      .filter((name) => /\.tsx?$/.test(name) && !/ \d+\./.test(name))
      .filter((file) => /["']use client["']/.test(readFileSync(join(dir, file), "utf8")));
    expect(client).toEqual(["SheetSnap.tsx"]);
    expect(readFileSync(join(dir, "SheetSnap.tsx"), "utf8")).toMatch(/return null;\s*\}\s*$/);
  });
});
