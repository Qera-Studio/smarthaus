import { createHash } from "node:crypto";
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  hasOptOutSignal,
  readConsentCookie,
  readConsentState,
} from "../consent";
import { CONSENT_BOOT_HASH, CONSENT_BOOT_SCRIPT } from "../consent-boot";

/**
 * The boot script restates readConsentState() and hasOptOutSignal() in ES5,
 * because it runs before any bundle. This runs the real script string against
 * every case those two handle and requires the same answer, so a change to
 * one without the other fails here.
 */

const NOW = Date.parse("2026-09-27T12:00:00Z");
const DAY = 86_400_000;

function record(overrides: Record<string, unknown> = {}) {
  return {
    version: CONSENT_VERSION,
    timestamp: new Date(NOW - 10 * DAY).toISOString(),
    analytics: false,
    basis: "explicit",
    ...overrides,
  };
}

const enc = (value: unknown) => encodeURIComponent(JSON.stringify(value));

/** Cookie values to try, by name. `null` means no consent cookie at all. */
const COOKIES: Record<string, string | null> = {
  none: null,
  "current, declined": enc(record()),
  "current, accepted": enc(record({ analytics: true })),
  "current, from a signal": enc(record({ basis: "signal" })),
  "a day short of a year": enc(record({ timestamp: new Date(NOW - 364.99 * DAY).toISOString() })),
  "exactly a year old": enc(record({ timestamp: new Date(NOW - 365 * DAY).toISOString() })),
  "an older notice version": enc(record({ version: "0.9.0" })),
  "not JSON": encodeURIComponent("{not json"),
  "a broken percent-escape": "%E0%A4%A",
  "analytics as a string": enc(record({ analytics: "false" })),
  "an unknown basis": enc(record({ basis: "implied" })),
  "an unreadable timestamp": enc(record({ timestamp: "yesterday" })),
  "a missing version": enc({ ...record(), version: undefined }),
  "a JSON array": enc([1, 2]),
  "JSON null": enc(null),
};

type Signal = { gpc?: boolean; dnt?: string | null; msDnt?: string | null };
const SIGNALS: Record<string, Signal> = {
  none: {},
  GPC: { gpc: true },
  "GPC false": { gpc: false },
  "DNT 1": { dnt: "1" },
  "DNT yes": { dnt: "yes" },
  "DNT unspecified": { dnt: "unspecified" },
  "legacy msDoNotTrack": { msDnt: "1" },
};

function setCookie(value: string | null) {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
  document.cookie = "other=1; Path=/";
  if (value !== null) document.cookie = `${CONSENT_COOKIE}=${value}; Path=/`;
}

function setSignals({ gpc, dnt, msDnt }: Signal) {
  const nav = navigator as unknown as Record<string, unknown>;
  for (const [key, val] of [
    ["globalPrivacyControl", gpc],
    ["doNotTrack", dnt ?? null],
    ["msDoNotTrack", msDnt ?? null],
  ] as const) {
    Object.defineProperty(nav, key, { value: val, configurable: true });
  }
}

function runBoot(): string | null {
  document.documentElement.removeAttribute("data-consent");
  new Function(CONSENT_BOOT_SCRIPT)();
  return document.documentElement.getAttribute("data-consent");
}

beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(NOW));
afterEach(() => jest.restoreAllMocks());

describe("the consent boot script", () => {
  const cases = Object.entries(COOKIES).flatMap(([cookieName, cookie]) =>
    Object.entries(SIGNALS).map(
      ([signalName, signal]) => [cookieName, signalName, cookie, signal] as const,
    ),
  );

  it.each(cases)(
    "agrees with the app for cookie %p and signal %p",
    (_cookieName, _signalName, cookie, signal) => {
      setCookie(cookie);
      setSignals(signal);
      const state = readConsentState(readConsentCookie(document.cookie), new Date(NOW));
      const expected = state.ask && !hasOptOutSignal() ? "ask" : "decided";
      expect(runBoot()).toBe(expected);
    },
  );

  it("covers both answers, so the matrix is not vacuous", () => {
    setSignals({});
    setCookie(null);
    expect(runBoot()).toBe("ask");
    setCookie(enc(record()));
    expect(runBoot()).toBe("decided");
  });

  it("leaves no attribute when something unexpected throws, so the banner is never wrongly hidden", () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => {
        throw new Error("blocked");
      },
    });
    try {
      expect(runBoot()).toBeNull();
    } finally {
      delete (document as unknown as Record<string, unknown>).cookie;
      Object.defineProperty(Document.prototype, "cookie", original);
    }
  });

  it("is ES5: no arrow functions, let, const, template literals or optional chaining", () => {
    expect(CONSENT_BOOT_SCRIPT).not.toMatch(/=>|\blet\b|\bconst\b|`|\?\.|\?\?/);
  });

  it("interpolates the live constants, so bumping the version changes the script", () => {
    expect(CONSENT_BOOT_SCRIPT).toContain(JSON.stringify(CONSENT_VERSION));
    expect(CONSENT_BOOT_SCRIPT).toContain(JSON.stringify(CONSENT_COOKIE));
  });

  it("publishes the hash of exactly this script, for the CSP", () => {
    const digest = createHash("sha256").update(CONSENT_BOOT_SCRIPT).digest("base64");
    expect(CONSENT_BOOT_HASH).toBe(`'sha256-${digest}'`);
  });
});
