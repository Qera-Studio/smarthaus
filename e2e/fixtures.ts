import { createHash } from "node:crypto";
import { test as base, type Page } from "@playwright/test";

import { SPLASH_SEEN_KEY } from "../src/lib/splash-boot";

export { expect, devices, type Locator, type Page } from "@playwright/test";

/**
 * Every spec imports `test` from here, never from @playwright/test. ESLint
 * enforces it (eslint.config.mjs) and so does scripts/__tests__/e2e-fixtures.test.ts.
 *
 * ## The villa is off unless a spec asks for it
 *
 * The hero's three.js villa renders every animation frame while the hero is on
 * screen. In a headless browser the GPU is software-emulated, so each frame of
 * the model is expensive, and under parallel load it blocked the main thread
 * for up to 3s: the back-to-top button's smooth scroll stalled at 687px and
 * failed its test (measured 2026-09-26: 1.0s to the top with the model
 * blocked, 1.5s with it, multi-second stalls under contention).
 *
 * Decided 2026-09-26: switch the villa off in e2e rather than change how the
 * hero renders. It is switched off through the product's own gate, not a test
 * hook: every page reports Save-Data, which VillaCanvas already honours by
 * keeping the poster and loading no three.js. Nothing else on the site reads
 * Save-Data (checked). A spec that tests the villa opts back in with
 *   test.use({ villa: true });
 *
 * The recorded cost: e2e no longer measures what the villa does to scrolling
 * and input on a slow machine. That is a known gap, not a fixed one.
 *
 * Contexts a test creates itself (browser.newContext) do not get this; none of
 * them load the homepage today.
 *
 * 2026-09-28: the homepage now mounts the fluid hero (FluidHero/FluidCanvas),
 * which honours the same Save-Data gate, so this fixture keeps it off in the
 * same way and `villa: true` opts back in to whichever hero canvas is mounted.
 * The option keeps its name: renaming it touches every spec for no behaviour.
 *
 * 2026-10-28: HomeHero replaced the fluid hero and has no canvas, so the
 * option currently changes nothing on the homepage. infra.spec.ts pins that.
 */
type Options = {
  villa: boolean;
  cardBlur: boolean;
  intro: boolean;
  reveal: boolean;
  splash: boolean;
  clientAddress: string | undefined;
};

/*
 * ## In WebKit the hero cards are not blurred unless a spec asks for it
 *
 * Each card in the homepage strip blurs what is behind its foot with
 * backdrop-filter, and on a touch screen every card shows it at all times.
 * WebKit on the Linux runner, which paints without a GPU, cannot: with those
 * blurs on the page it never draws a frame at all, so requestAnimationFrame
 * never fires and Playwright's wait for a stable box, before every click and
 * scroll, never ends. On PR #65 (2026-11-01) that timed out 29 iPhone 17
 * tests on `/`. Measured on the runner (draft PR #66): 0 frames as shipped,
 * 63 a second with the cards' blur removed or with their ::before removed;
 * removing their mask, their isolation, their images, the drift, or the
 * pixel density changed nothing. macOS WebKit and Chromium draw it, and a
 * phone has a GPU.
 *
 * Decided 2026-11-01: take the cards' blur off in WebKit only, before first
 * paint, by an unlayered stylesheet that outranks the component layer.
 * Chromium keeps it, so the mouse spec still asserts it. A spec that needs it
 * in WebKit opts back in with
 *   test.use({ cardBlur: true });
 * which will stall on the Linux runner.
 *
 * The recorded cost: no e2e run checks the card blur in WebKit.
 */
/**
 * The card-blur hold, for a page or for a context a test creates itself,
 * which the fixture never sees (rate-limit.spec.ts's second visitor stalled
 * on `/` without it). Before first paint: the stall begins with the first
 * frame, so a stylesheet added at DOMContentLoaded comes too late (measured).
 */
export async function takeCardBlurOff(target: Pick<Page, "addInitScript">) {
  await target.addInitScript((css) => {
    const add = () => {
      const style = document.createElement("style");
      style.dataset.e2eCardBlurOff = "";
      style.textContent = css;
      (document.head ?? document.documentElement).append(style);
    };
    if (document.documentElement) add();
    else
      new MutationObserver((_, observer) => {
        if (!document.documentElement) return;
        observer.disconnect();
        add();
      }).observe(document, { childList: true });
  }, CARD_BLUR_OFF_CSS);
}

export const CARD_BLUR_OFF_CSS =
  "[data-hero-strip] *::before { -webkit-backdrop-filter: none; backdrop-filter: none; }";

/*
 * ## The homepage opening is off unless a spec asks for it
 *
 * On every full load the splash boot script sets data-intro on <html>, and
 * while it is there the homepage's copy, strip, nav and contact bar fade and
 * slide in over about 1.75s (HomeHero.module.scss, "The opening"). Axe reads
 * half-faded text as a contrast failure, and every click and screenshot would
 * wait out the slide. So the attribute is taken off as soon as it is set, in
 * the microtask after the boot script, before anything paints: the page is
 * the one a soft navigation back to the homepage shows. e2e/intro.spec.ts
 * opts back in with
 *   test.use({ intro: true });
 *
 * The recorded cost: no other spec sees the page while it arrives.
 */
export async function takeIntroOff(target: Pick<Page, "addInitScript">) {
  await target.addInitScript(() => {
    new MutationObserver(() => {
      document.documentElement?.removeAttribute("data-intro");
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-intro"],
    });
  });
}

/**
 * ## The scroll reveal is off unless a spec asks for it
 *
 * For the opening's reason: axe reads half-faded text as low contrast, and any
 * spec reading a section would be racing its arrival. The attribute is put back
 * to rest whenever ScrollReveal moves it. e2e/scroll-reveal.spec.ts opts back in
 * with test.use({ reveal: true }).
 */
export async function takeRevealOff(target: Pick<Page, "addInitScript">) {
  await target.addInitScript(() => {
    new MutationObserver((records) => {
      for (const { target: el } of records) {
        if ((el as Element).getAttribute("data-reveal")) {
          (el as Element).setAttribute("data-reveal", "");
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-reveal"] });
  });
}

/*
 * ## The splash is seen unless a spec asks for it
 *
 * The first full load in a tab shows the loading splash over the page for up
 * to 2.5s (src/lib/splash-boot.ts). Every test is a first load, so every test
 * would wait behind it, and any test that reads what is on screen by point or
 * by pixel would read the splash. Each page therefore starts with the splash
 * marked as seen in sessionStorage, through the same key the product reads.
 * e2e/splash.spec.ts opts back in with
 *   test.use({ splash: true });
 */

/**
 * ## Every test is its own visitor
 *
 * Enquiry sends are rate-limited per client address (src/lib/rate-limit.ts),
 * and every test reaches the server from loopback, so the whole suite would
 * share one bucket of five sends. Each test instead presents its own
 * x-forwarded-for, derived from the test, its retry and its repeat, so no two
 * runs of anything share a bucket. A spec that tests the limit itself pins one
 * address with test.use({ clientAddress: "…" }).
 *
 * Trusting the header is safe only because production runs on Vercel, which
 * overwrites x-forwarded-for with the real client address; the e2e server is
 * `next start` on loopback, which passes it through. See
 * docs/runbooks/vercel-firewall.md for the platform guarantee this relies on.
 */
export function addressFor(seed: string): string {
  const [a, b, c] = createHash("sha256").update(seed).digest();
  // 10.0.0.0/8, never 10.x.x.0 or .255, so it always reads as one host.
  return `10.${a}.${b}.${(c! % 254) + 1}`;
}

export const test = base.extend<
  Options & {
    villaGate: void;
    cardBlurGate: void;
    introGate: void;
    revealGate: void;
    clientGate: void;
    splashGate: void;
  }
>({
  cardBlur: [false, { option: true }],
  cardBlurGate: [
    async ({ page, browserName, cardBlur }, use) => {
      if (browserName === "webkit" && !cardBlur) await takeCardBlurOff(page);
      await use();
    },
    { auto: true },
  ],
  intro: [false, { option: true }],
  introGate: [
    async ({ page, intro }, use) => {
      if (!intro) await takeIntroOff(page);
      await use();
    },
    { auto: true },
  ],
  reveal: [false, { option: true }],
  revealGate: [
    async ({ page, reveal }, use) => {
      if (!reveal) await takeRevealOff(page);
      await use();
    },
    { auto: true },
  ],
  splash: [false, { option: true }],
  splashGate: [
    async ({ page, splash }, use) => {
      if (!splash) {
        await page.addInitScript((key) => {
          try {
            window.sessionStorage.setItem(key, "1");
          } catch {
            // Storage blocked: the product shows no splash either.
          }
        }, SPLASH_SEEN_KEY);
      }
      await use();
    },
    { auto: true },
  ],
  clientAddress: [undefined, { option: true }],
  clientGate: [
    async ({ context, clientAddress }, use, testInfo) => {
      const address =
        clientAddress ??
        addressFor(`${testInfo.testId}:${testInfo.retry}:${testInfo.repeatEachIndex}`);
      await context.setExtraHTTPHeaders({ "x-forwarded-for": address });
      await use();
    },
    { auto: true },
  ],
  villa: [false, { option: true }],
  villaGate: [
    async ({ page, villa }, use) => {
      if (!villa) {
        await page.addInitScript(() => {
          const connection = (navigator as Navigator & { connection?: object }).connection ?? {};
          Object.defineProperty(navigator, "connection", {
            configurable: true,
            value: { ...connection, saveData: true },
          });
        });
      }
      await use();
    },
    { auto: true },
  ],
});
