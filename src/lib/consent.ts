/**
 * The consent record: reading it, writing it, and deciding what it means.
 *
 * Pure and framework-free on purpose. Every rule here is a legal obligation
 * rather than a preference, so it is unit-tested directly rather than asserted
 * through a rendered component (see src/lib/__tests__/consent.test.ts).
 *
 * Schema and storage rules are from `src/content/legal/consent-content-deck.md`
 * §10. Do not change them without re-reading it: the field set is what proves
 * a choice was made, which Legal System §6 requires ("consent records kept:
 * what was consented to, when, which notice version").
 */

/** Cookie name, per deck §10. */
export const CONSENT_COOKIE = "smarthaus_consent";

/**
 * The permanent home of the cookie controls (Legal §6: withdrawal must be as
 * easy as consent, and must not depend on JavaScript or on the banner still
 * being there). The footer links to it; with JS the link opens the panel in
 * place instead, and this route is the fallback.
 */
export const PREFERENCES_ROUTE = "/cookie-preferences";

/**
 * Window event that opens the preferences panel in place.
 *
 * Dispatched by the footer's PreferencesLink, listened for by ConsentShell.
 * An event rather than a context or an exported setter because the two live
 * in unrelated trees — the footer is a Server Component and the shell is the
 * layout's one consent island — and a window event is the smallest thing that
 * crosses that gap without pulling either into the other's bundle.
 */
export const OPEN_PREFERENCES_EVENT = "smarthaus:consent:open";

/**
 * Notice version the stored record was agreed against.
 *
 * Bumping this re-asks everyone, so it moves ONLY for a material change: a new
 * tool, a new category, a new purpose. Never for copy edits — re-asking because
 * a sentence was reworded is nagging, which the deck prohibits outright.
 *
 * 1.0.0 rather than the documents' own `0.1.0-draft`: deck §10's schema example
 * specifies `"1.0.0"` for the stored record, and that is the value that has to
 * match on read.
 */
export const CONSENT_VERSION = "1.0.0";

/**
 * How long a choice holds, in days. 12 months, per deck §10.
 *
 * This is also the re-ask window: a decline is honoured for the full period
 * with no re-prompt on the next page, no second ask on a later visit, and no
 * reminder. Nagging is prohibited.
 */
export const CONSENT_MAX_AGE_DAYS = 365;

/**
 * Why the record says what it says.
 *
 * - `explicit` — the visitor used the banner or the preferences panel.
 * - `signal` — Do Not Track or Global Privacy Control was sent, and we treated
 *   it as a decline without ever showing the banner.
 *
 * Kept distinct because they are legally different: one is consent, the other
 * is us honouring a browser signal.
 */
export type ConsentBasis = "explicit" | "signal";

export type ConsentRecord = {
  /** Notice version agreed to. */
  version: string;
  /** ISO 8601, UTC. When the choice was made. */
  timestamp: string;
  /** The choice itself. */
  analytics: boolean;
  basis: ConsentBasis;
};

/**
 * What the UI needs to know, derived from the record.
 *
 * `reason` exists so the banner can carry the correct re-ask line. There are
 * only two permitted re-asks and this is what distinguishes them.
 */
export type ConsentState = {
  /** Whether to show the banner at all. */
  ask: boolean;
  /** Whether analytics may run. */
  analytics: boolean;
  /** Present only when re-asking, and says which of the two reasons applies. */
  reason?: "expired" | "version";
};

/** No record, or one we could not trust. Analytics off, and we ask. */
const ABSENT: ConsentState = { ask: true, analytics: false };

/**
 * Parse a stored record.
 *
 * Defensive by design, and this matters more than it looks: a hand-edited,
 * truncated or legacy cookie must not throw, because the failure mode of a
 * throw here is a page that does not render. Anything unparseable is treated as
 * absent, which means analytics off. **Absence is never consent.**
 */
export function parseConsent(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Partial<ConsentRecord>;

  // Every field is validated rather than trusted. `analytics` especially: a
  // truthy non-boolean (the string "false", say) must not read as consent.
  if (typeof record.version !== "string") return null;
  if (typeof record.timestamp !== "string") return null;
  if (typeof record.analytics !== "boolean") return null;
  if (record.basis !== "explicit" && record.basis !== "signal") return null;

  // A timestamp we cannot read is a record we cannot age out, so it is no more
  // trustworthy than a missing one.
  if (Number.isNaN(Date.parse(record.timestamp))) return null;

  return {
    version: record.version,
    timestamp: record.timestamp,
    analytics: record.analytics,
    basis: record.basis,
  };
}

/**
 * Turn a raw cookie value into what the UI should do.
 *
 * `now` is injectable so expiry is testable without waiting a year or stubbing
 * the clock globally.
 */
export function readConsentState(
  raw: string | null | undefined,
  now: Date = new Date(),
): ConsentState {
  const record = parseConsent(raw);
  if (!record) return ABSENT;

  // Expired. The cookie's own 12-month expiry should have removed it, but the
  // timestamp is checked as well: a cookie can outlive its Max-Age if the clock
  // moved, and localStorage (if this is ever ported) has no expiry at all.
  const ageDays = (now.getTime() - Date.parse(record.timestamp)) / 86_400_000;
  if (ageDays >= CONSENT_MAX_AGE_DAYS) {
    return { ask: true, analytics: false, reason: "expired" };
  }

  // A material change since they chose. Their previous answer was about a
  // different set of tools, so it cannot carry over — and it must not silently
  // keep analytics ON against a notice they never saw.
  if (record.version !== CONSENT_VERSION) {
    return { ask: true, analytics: false, reason: "version" };
  }

  return { ask: false, analytics: record.analytics };
}

/**
 * Whether the browser asked not to be tracked.
 *
 * Do Not Track and Global Privacy Control are both honoured as a decline, and
 * the banner is not shown at all: asking after someone has already said no is
 * the nagging the deck rules out. Legal §6 asks for the privacy-preserving
 * default, and honouring this costs nothing.
 *
 * Guarded for a non-browser environment so this module stays importable from a
 * Server Component.
 */
export function hasOptOutSignal(): boolean {
  if (typeof navigator === "undefined") return false;

  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    doNotTrack?: string | null;
    msDoNotTrack?: string | null;
  };

  if (nav.globalPrivacyControl === true) return true;

  // "1" is the only affirmative value. Older IE/Edge used msDoNotTrack, and
  // some engines report "unspecified" or null, which are not a signal.
  const dnt =
    nav.doNotTrack ??
    nav.msDoNotTrack ??
    (typeof window !== "undefined"
      ? (window as Window & { doNotTrack?: string | null }).doNotTrack
      : null);

  return dnt === "1" || dnt === "yes";
}

/** Build a record for a choice made now. */
export function buildConsentRecord(
  analytics: boolean,
  basis: ConsentBasis = "explicit",
  now: Date = new Date(),
): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    timestamp: now.toISOString(),
    analytics,
    basis,
  };
}

/**
 * Serialise a `document.cookie` assignment.
 *
 * Returned as a string rather than written here so the value can be asserted in
 * a unit test without a DOM. Attributes are deck §10: first-party, `SameSite=Lax`,
 * `Secure`, 12-month expiry, and deliberately NOT `httpOnly` because the client
 * has to read it.
 *
 * `Secure` is omitted on plain-HTTP loopback only. Chrome accepts Secure on
 * localhost but Safari does not, so hardcoding it would silently drop the
 * cookie in local dev and in the WebKit e2e project — the same class of
 * loopback-only breakage next.config.ts already documents for HSTS.
 */
export function serialiseConsentCookie(
  record: ConsentRecord,
  { secure = true }: { secure?: boolean } = {},
): string {
  const value = encodeURIComponent(JSON.stringify(record));
  const maxAge = CONSENT_MAX_AGE_DAYS * 86_400;

  const parts = [`${CONSENT_COOKIE}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  if (secure) parts.push("Secure");

  return parts.join("; ");
}

/** Read our cookie out of a `document.cookie` string. */
export function readConsentCookie(cookieString: string): string | null {
  // Split on "; " is not enough: a cookie value may contain "=" (ours is
  // percent-encoded JSON), so only the FIRST "=" separates name from value.
  for (const part of cookieString.split(";")) {
    const entry = part.trim();
    const eq = entry.indexOf("=");
    if (eq === -1) continue;
    if (entry.slice(0, eq) !== CONSENT_COOKIE) continue;
    try {
      return decodeURIComponent(entry.slice(eq + 1));
    } catch {
      // A malformed percent-escape would throw. Same rule as a bad JSON
      // payload: unreadable is absent, absent is decline.
      return null;
    }
  }
  return null;
}
