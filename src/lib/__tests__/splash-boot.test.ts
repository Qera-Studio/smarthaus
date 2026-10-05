import { createHash } from "node:crypto";

import {
  SPLASH_BOOT_HASH,
  SPLASH_BOOT_SCRIPT,
  SPLASH_EXIT_MS,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  SPLASH_SEEN_KEY,
} from "../splash-boot";

/**
 * The loader's boot script, run as the real string it ships as (the same way
 * consent-boot.test.ts runs its script: the string is a constant authored in
 * this repo, not input). jsdom has no document.fonts and reports the document
 * complete, so each test sets up the load state it needs; the fake clock
 * drives Date.now, timers and frames.
 */

const html = document.documentElement;
const state = () => html.getAttribute("data-splash");
const progress = () => Number(html.style.getPropertyValue("--splash-progress"));
const pct = () => document.getElementById("splash-pct")!.textContent;
const run = () => new Function(SPLASH_BOOT_SCRIPT)();

type Load = { fontsPending?: boolean; loadPending?: boolean; reducedMotion?: boolean };

/** Runs the script, and returns the levers for whatever it was told is pending. */
function boot({ fontsPending = false, loadPending = false, reducedMotion = false }: Load = {}) {
  let fontsDone: () => void = () => {};
  const fonts = fontsPending
    ? { ready: new Promise<void>((resolve) => (fontsDone = resolve)) }
    : { ready: Promise.resolve() };
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: loadPending ? "loading" : "complete",
  });
  window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
  run();
  return {
    fontsReady: async () => {
      fontsDone();
      await Promise.resolve();
      await Promise.resolve();
    },
    load: () => window.dispatchEvent(new Event("load")),
  };
}

/** Lets resolved promises settle, then advances the clock. */
async function wait(ms: number) {
  await Promise.resolve();
  await Promise.resolve();
  jest.advanceTimersByTime(ms);
}

beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
  html.removeAttribute("data-splash");
  html.removeAttribute("style");
  document.body.innerHTML = '<span id="splash-pct">0</span>';
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("whether this load gets the splash", () => {
  it("shows it on the first load in a tab, and remembers that it has", () => {
    boot();
    expect(state()).toBe("show");
    expect(sessionStorage.getItem(SPLASH_SEEN_KEY)).toBe("1");
  });

  it("skips it on any later load in the same tab, before anything moves", () => {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    boot();
    expect(state()).toBe("skip");
    expect(html.style.getPropertyValue("--splash-progress")).toBe("");
    jest.advanceTimersByTime(SPLASH_MAX_MS * 2);
    expect(state()).toBe("skip");
  });

  it("leaves it hidden when storage is blocked, rather than showing it on every load", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    boot();
    expect(state()).toBeNull();
  });
});

describe("when it leaves", () => {
  it("never sooner than the floor, even on a page that was ready at once", async () => {
    boot();
    await wait(SPLASH_MIN_MS - 1);
    expect(state()).toBe("show");
    await wait(1);
    expect(state()).toBe("leaving");
  });

  it("fades, then hides itself once the fade is over", async () => {
    boot();
    await wait(SPLASH_MIN_MS);
    expect(state()).toBe("leaving");
    jest.advanceTimersByTime(SPLASH_EXIT_MS - 1);
    expect(state()).toBe("leaving");
    jest.advanceTimersByTime(1);
    expect(state()).toBe("done");
  });

  it("waits for both the fonts and the load event, and goes as soon as both are in", async () => {
    const page = boot({ fontsPending: true, loadPending: true });
    await wait(1500);
    expect(state()).toBe("show");
    page.load();
    await wait(100);
    expect(state()).toBe("show");
    await page.fontsReady();
    await wait(0);
    expect(state()).toBe("leaving");
  });

  it("does not take the load event alone as ready", async () => {
    const page = boot({ fontsPending: true, loadPending: true });
    page.load();
    await wait(SPLASH_MAX_MS - 1);
    expect(state()).toBe("show");
  });

  it("leaves at the cap however the page is doing", async () => {
    boot({ fontsPending: true, loadPending: true });
    await wait(SPLASH_MAX_MS - 1);
    expect(state()).toBe("show");
    await wait(1);
    expect(state()).toBe("leaving");
    jest.advanceTimersByTime(SPLASH_EXIT_MS);
    expect(state()).toBe("done");
  });

  it("takes itself down at once if anything after showing it throws", () => {
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    window.matchMedia = jest.fn(() => {
      throw new Error("broken");
    });
    run();
    expect(state()).toBe("done");
  });
});

describe("the bar and the count", () => {
  it("start at zero and rise with time, but never past 90% before the page is ready", async () => {
    boot({ fontsPending: true, loadPending: true });
    expect(progress()).toBe(0);
    expect(pct()).toBe("0");
    await wait(500);
    const early = progress();
    expect(early).toBeGreaterThan(0);
    await wait(1700);
    expect(progress()).toBeGreaterThan(early);
    expect(progress()).toBeLessThanOrEqual(0.9);
    expect(pct()).toBe(String(Math.round(progress() * 100)));
  });

  it("read 100 as it leaves", async () => {
    boot();
    await wait(SPLASH_MIN_MS);
    expect(progress()).toBe(1);
    expect(pct()).toBe("100");
  });

  it("stop moving once it has left", async () => {
    boot();
    await wait(SPLASH_MIN_MS + SPLASH_EXIT_MS + 500);
    expect(progress()).toBe(1);
  });

  it("show complete from the start under reduced motion, and still wait for the page", async () => {
    const page = boot({ reducedMotion: true, loadPending: true });
    expect(progress()).toBe(1);
    expect(pct()).toBe("100");
    await wait(1000);
    expect(progress()).toBe(1);
    expect(state()).toBe("show");
    page.load();
    await wait(0);
    expect(state()).toBe("leaving");
  });
});

describe("the script itself", () => {
  it("is allowed by exactly its own hash", () => {
    const digest = createHash("sha256").update(SPLASH_BOOT_SCRIPT).digest("base64");
    expect(SPLASH_BOOT_HASH).toBe(`'sha256-${digest}'`);
  });

  it("is ES5, since it runs before any bundle", () => {
    expect(SPLASH_BOOT_SCRIPT).not.toMatch(/=>|`|\?\.|\?\?|\b(let|const|class)\b/);
  });

  it("keeps the floor below the cap", () => {
    expect(SPLASH_MIN_MS).toBeLessThan(SPLASH_MAX_MS);
  });
});
