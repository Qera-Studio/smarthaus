import type { ConsentState } from "../consent";

const NO_CHOICE: ConsentState = { ask: true, analytics: false };
const ACCEPTED: ConsentState = { ask: false, analytics: true };
const DECLINED: ConsentState = { ask: false, analytics: false };
const ID = "G-TEST123";
const FLAG = `ga-disable-${ID}`;

// The module remembers the current choice, so each test gets a fresh copy.
function fresh() {
  let mod!: typeof import("../ga4");
  jest.isolateModules(() => {
    mod = jest.requireActual("../ga4");
  });
  return mod;
}

const scripts = () =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>("script")).map((s) => s.src);
// Each entry is an `arguments` object, which is what gtag.js requires.
const calls = () =>
  (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
const flag = () => (window as unknown as Record<string, unknown>)[FLAG];
const win = window as unknown as { requestIdleCallback?: (fn: () => void) => void };

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]!.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  delete window.dataLayer;
  delete window.gtag;
  delete win.requestIdleCallback;
  delete (window as unknown as Record<string, unknown>)[FLAG];
  document.head.innerHTML = "";
  clearCookies();
});

afterEach(() => {
  jest.useRealTimers();
  clearCookies();
});

describe("applyGa4", () => {
  it("does nothing without a measurement id", () => {
    fresh().applyGa4(ACCEPTED, "");
    jest.runAllTimers();
    expect(window.gtag).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it("reads the id from the environment by default, so an unset one loads nothing", () => {
    fresh().applyGa4(ACCEPTED);
    jest.runAllTimers();
    expect(window.gtag).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it.each([
    ["no choice on file", NO_CHOICE],
    ["a decline", DECLINED],
  ])("loads nothing on %s: it has no cookieless mode here", (_name, state) => {
    fresh().applyGa4(state, ID);
    jest.runAllTimers();
    expect(window.gtag).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it("loads the script at idle after an accept, directly rather than through GTM", () => {
    fresh().applyGa4(ACCEPTED, ID);
    expect(scripts()).toEqual([]);
    jest.runAllTimers();
    expect(scripts()).toEqual([`https://www.googletagmanager.com/gtag/js?id=${ID}`]);
  });

  it("uses the browser's idle callback where there is one", () => {
    const idle = jest.fn((fn: () => void) => fn());
    win.requestIdleCallback = idle;
    fresh().applyGa4(ACCEPTED, ID);
    expect(idle).toHaveBeenCalledTimes(1);
    expect(scripts()).toHaveLength(1);
  });

  it("queues real arguments objects, because gtag.js ignores arrays", () => {
    fresh().applyGa4(ACCEPTED, ID);
    expect(Array.isArray(window.dataLayer![0])).toBe(false);
    expect(Object.prototype.toString.call(window.dataLayer![0])).toBe("[object Arguments]");
  });

  it("sets consent first, and refuses every advertising use", () => {
    fresh().applyGa4(ACCEPTED, ID);
    expect(calls()[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(calls()[1]![0]).toBe("js");
    expect(calls()[2]).toEqual([
      "config",
      ID,
      { allow_google_signals: false, allow_ad_personalization_signals: false },
    ]);
  });

  it("acts once per choice, because the consent read repeats on every tab focus", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    const count = calls().length;
    applyGa4(ACCEPTED, ID);
    jest.runAllTimers();
    expect(calls()).toHaveLength(count);
    expect(scripts()).toHaveLength(1);
  });

  it("never adds the script if the visitor withdraws before the browser is idle", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    applyGa4(DECLINED, ID);
    jest.runAllTimers();
    expect(scripts()).toEqual([]);
  });

  it("on a withdrawal, sets the disable flag, denies storage and erases its cookies", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    jest.runAllTimers();
    document.cookie = "_ga=GA1.1.1; path=/";
    document.cookie = "_ga_TEST123=GS1.1.1; path=/";
    document.cookie = "smarthaus_consent=keep; path=/";
    applyGa4(DECLINED, ID);
    expect(flag()).toBe(true);
    expect(calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toContain("smarthaus_consent=keep");
  });

  it("erases only Google's cookies, not another cookie that merely starts alike", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    jest.runAllTimers();
    document.cookie = "_gamma=keep; path=/";
    document.cookie = "_ga=GA1.1.1; path=/";
    applyGa4(DECLINED, ID);
    expect(document.cookie).toContain("_gamma=keep");
    expect(document.cookie).not.toMatch(/(^|; )_ga=/);
  });

  it("withdraws cleanly when the script never ran, as on a page with no gtag yet", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    delete window.gtag;
    expect(() => applyGa4(DECLINED, ID)).not.toThrow();
    expect(flag()).toBe(true);
  });

  it("leaves the disable flag clear on an accept, so a visit that accepted is counted", () => {
    fresh().applyGa4(ACCEPTED, ID);
    expect(flag()).toBe(false);
  });

  it("starts again on a later accept without loading twice", () => {
    const { applyGa4 } = fresh();
    applyGa4(ACCEPTED, ID);
    jest.runAllTimers();
    applyGa4(DECLINED, ID);
    applyGa4(ACCEPTED, ID);
    jest.runAllTimers();
    expect(flag()).toBe(false);
    expect(calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(scripts()).toHaveLength(1);
  });
});
