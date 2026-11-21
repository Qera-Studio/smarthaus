import type { ConsentState } from "../consent";

const NO_CHOICE: ConsentState = { ask: true, analytics: false };
const ACCEPTED: ConsentState = { ask: false, analytics: true };
const DECLINED: ConsentState = { ask: false, analytics: false };
const ID = "testproject";

// The module remembers the current mode, so each test gets a fresh copy.
function fresh() {
  let mod!: typeof import("../clarity");
  jest.isolateModules(() => {
    mod = jest.requireActual("../clarity");
  });
  return mod;
}

const scripts = () =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>("script")).map((s) => s.src);
const queued = () => window.clarity?.q ?? [];
const storage = (value: string) => [
  "consentv2",
  { ad_Storage: "denied", analytics_Storage: value },
];

// jsdom has no requestIdleCallback; each test decides which path it takes.
const win = window as unknown as { requestIdleCallback?: (fn: () => void) => void };

beforeEach(() => {
  jest.useFakeTimers();
  delete window.clarity;
  delete win.requestIdleCallback;
  document.head.innerHTML = "";
});

afterEach(() => {
  jest.useRealTimers();
});

describe("clarityMode", () => {
  it("runs without cookies while no choice is on file", () => {
    expect(fresh().clarityMode(NO_CHOICE)).toBe("cookieless");
  });

  it("uses cookies only after an accept", () => {
    expect(fresh().clarityMode(ACCEPTED)).toBe("cookies");
  });

  it("stays off after a decline, which is also what an opt-out signal records", () => {
    expect(fresh().clarityMode(DECLINED)).toBe("off");
  });
});

describe("applyClarity", () => {
  it("does nothing at all without a project id", () => {
    fresh().applyClarity(NO_CHOICE, "");
    jest.runAllTimers();
    expect(window.clarity).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it("reads the id from the environment by default, so an unset one loads nothing", () => {
    fresh().applyClarity(ACCEPTED);
    jest.runAllTimers();
    expect(window.clarity).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it("loads nothing for a visitor who has declined", () => {
    fresh().applyClarity(DECLINED, ID);
    jest.runAllTimers();
    expect(window.clarity).toBeUndefined();
    expect(scripts()).toEqual([]);
  });

  it("denies storage before the script arrives when no choice is on file", () => {
    fresh().applyClarity(NO_CHOICE, ID);
    expect(queued()).toEqual([storage("denied")]);
    expect(scripts()).toEqual([]);
    jest.runAllTimers();
    expect(scripts()).toEqual([`https://www.clarity.ms/tag/${ID}`]);
  });

  it("grants analytics storage, and never ad storage, after an accept", () => {
    fresh().applyClarity(ACCEPTED, ID);
    expect(queued()).toEqual([storage("granted")]);
  });

  it("acts once per mode, because the consent read repeats on every tab focus", () => {
    const { applyClarity } = fresh();
    applyClarity(NO_CHOICE, ID);
    applyClarity(NO_CHOICE, ID);
    jest.runAllTimers();
    expect(queued()).toHaveLength(1);
    expect(scripts()).toHaveLength(1);
  });

  it("moves from cookieless to cookies on an accept without loading twice", () => {
    const { applyClarity } = fresh();
    applyClarity(NO_CHOICE, ID);
    jest.runAllTimers();
    applyClarity(ACCEPTED, ID);
    jest.runAllTimers();
    expect(queued()).toEqual([storage("denied"), ["start"], storage("granted")]);
    expect(scripts()).toHaveLength(1);
  });

  it("erases and stops on a decline, then can start again on a later accept", () => {
    const { applyClarity } = fresh();
    applyClarity(ACCEPTED, ID);
    jest.runAllTimers();
    applyClarity(DECLINED, ID);
    expect(queued().slice(1)).toEqual([["consent", false], ["stop"]]);
    applyClarity(ACCEPTED, ID);
    jest.runAllTimers();
    expect(queued().slice(3)).toEqual([["start"], storage("granted")]);
    expect(scripts()).toHaveLength(1);
  });

  it("never adds the script if the visitor declines before the browser is idle", () => {
    const { applyClarity } = fresh();
    applyClarity(NO_CHOICE, ID);
    applyClarity(DECLINED, ID);
    jest.runAllTimers();
    expect(scripts()).toEqual([]);
  });

  it("uses the browser's idle callback where there is one", () => {
    const idle = jest.fn((fn: () => void) => fn());
    win.requestIdleCallback = idle;
    fresh().applyClarity(NO_CHOICE, ID);
    expect(idle).toHaveBeenCalledTimes(1);
    expect(scripts()).toHaveLength(1);
  });
});
