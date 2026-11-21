import type { ConsentState } from "./consent";

/**
 * Microsoft Clarity, run by the visitor's choice (Shivanshu, 2026-11-04):
 * without cookies until they choose, with cookies if they accept, and not at
 * all if they decline or their browser sends an opt-out signal.
 *
 * NEXT_PUBLIC_CLARITY_ID is the switch. Without it nothing loads and the CSP
 * stays closed, so merging this starts nothing: set it only once deck §13 is
 * cleared, the replay check included (consent-content-deck.md §9).
 *
 * Why these calls: https://learn.microsoft.com/clarity/setup-and-installation/clarity-consent-api-v2
 * Denied storage is Clarity's no-consent mode, one id per page view and no
 * cookies. `consent, false` erases its cookies but only drops it back to that
 * mode, and it kept sending (seen in a browser, 2026-11-04), so a decline also
 * has to call `stop`, and a later accept `start`.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export type ClarityMode = "off" | "cookieless" | "cookies";

/** A choice on file decides; no choice yet is the only cookieless state. */
export function clarityMode({ ask, analytics }: ConsentState): ClarityMode {
  if (analytics) return "cookies";
  return ask ? "cookieless" : "off";
}

let current: ClarityMode | null = null;

/** The vendor's stub, so calls queue until the script arrives, which waits for idle. */
function load(id: string) {
  const clarity: ClarityFn = (...args) => {
    (clarity.q ??= []).push(args);
  };
  window.clarity = clarity;
  const add = () => {
    if (current === "off") return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${id}`;
    document.head.append(script);
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(add);
  else setTimeout(add);
}

/** Safe to call on every consent read: it acts only when the mode changes. */
export function applyClarity(state: ConsentState, id = process.env.NEXT_PUBLIC_CLARITY_ID) {
  if (!id) return;
  const mode = clarityMode(state);
  if (mode === current) return;
  current = mode;
  if (mode === "off") {
    window.clarity?.("consent", false);
    window.clarity?.("stop");
    return;
  }
  if (window.clarity) window.clarity("start");
  else load(id);
  // ad_Storage is always denied: neither tool is used to advertise.
  window.clarity!("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: mode === "cookies" ? "granted" : "denied",
  });
}
