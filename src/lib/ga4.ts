import type { ConsentState } from "./consent";

/**
 * Google Analytics 4, loaded directly rather than through Tag Manager
 * (Shivanshu, 2026-11-04), so every tag change stays in a reviewed PR. Unlike
 * Clarity it has no cookieless mode here: it runs only after an accept.
 *
 * NEXT_PUBLIC_GA_ID is the switch. Without it nothing loads and the CSP stays
 * closed. Set it only once consent-content-deck.md §13 is cleared.
 *
 * Google's consent state alone does not honour a withdrawal: it stops new
 * cookies but leaves the old ones, so a withdrawal also sets the documented
 * `ga-disable-<id>` flag and erases `_ga` and `_ga_<stream>` itself.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let on = false;

function setDisabled(id: string, disabled: boolean) {
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}

function load(id: string) {
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js reads the `arguments` object itself; an array is silently ignored.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  // Neither tool is used to advertise (the preferences panel says so).
  window.gtag("config", id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const add = () => {
    if (!on) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(add);
  else setTimeout(add);
}

function eraseCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]!.trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of ["", `; domain=.${location.hostname}`]) {
      document.cookie = `${name}=; path=/; max-age=0${domain}`;
    }
  }
}

/** Safe to call on every consent read: it acts only when the choice changes. */
export function applyGa4({ analytics }: ConsentState, id = process.env.NEXT_PUBLIC_GA_ID) {
  if (!id || analytics === on) return;
  on = analytics;
  setDisabled(id, !analytics);
  if (!analytics) {
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    eraseCookies();
    return;
  }
  if (window.gtag) window.gtag("consent", "update", { analytics_storage: "granted" });
  else load(id);
}
