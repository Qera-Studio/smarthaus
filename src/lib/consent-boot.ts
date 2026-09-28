import { createHash } from "node:crypto";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, CONSENT_VERSION } from "./consent";

/**
 * The first thing the page runs: before first paint, decide whether the
 * cookie banner is needed, and say so on <html>.
 *
 * Why it exists: the banner used to appear only once React had hydrated. On a
 * first visit on a phone it is the largest thing on screen, so it became the
 * page's LCP element at about 4s under throttling (measured 2026-09-27, /contact
 * 4.1s). The banner is now in the server HTML, and this decides before paint
 * whether it shows:
 *
 * - `data-consent="ask"`: no valid choice on file, show the banner now.
 * - `data-consent="decided"`: a current choice, or a Do Not Track / Global
 *   Privacy Control signal. The banner stays hidden, so a returning visitor
 *   never sees it flash.
 * - no attribute: JavaScript is off. The banner stays hidden too, because its
 *   buttons cannot work; /cookie-preferences is the no-JS route.
 *
 * The rule is readConsentState() and hasOptOutSignal() in ./consent, restated
 * in ES5 because it runs before any bundle. The constants are interpolated
 * from there, and src/lib/__tests__/consent-boot.test.ts runs this script
 * against every case readConsentState() handles, so the two cannot disagree.
 * Anything unexpected throws into the catch and leaves no attribute: the
 * banner then appears at hydration as it always did, never wrongly hidden.
 *
 * It is allowed by its SHA-256 hash in both CSP policies (next.config.ts),
 * not by 'unsafe-inline', so the strict report-only policy stays strict.
 */
export const CONSENT_BOOT_SCRIPT = [
  "(function(){try{",
  "var d=document.documentElement,ask=true,v=null;",
  "var parts=document.cookie.split(';');",
  "for(var i=0;i<parts.length;i++){",
  "var p=parts[i].replace(/^\\s+|\\s+$/g,''),e=p.indexOf('=');",
  // Undecodable or unparseable is absent, as readConsentCookie and
  // parseConsent treat it: absent means ask.
  `if(e>0&&p.slice(0,e)===${JSON.stringify(CONSENT_COOKIE)}){try{v=decodeURIComponent(p.slice(e+1));}catch(q){v=null;}break;}`,
  "}",
  "var r=null;if(v){try{r=JSON.parse(v);}catch(q){r=null;}}",
  "if(r){",
  "if(r&&typeof r==='object'&&typeof r.version==='string'&&typeof r.timestamp==='string'",
  "&&typeof r.analytics==='boolean'&&(r.basis==='explicit'||r.basis==='signal')){",
  "var t=Date.parse(r.timestamp);",
  `if(!isNaN(t)&&(Date.now()-t)/86400000<${CONSENT_MAX_AGE_DAYS}&&r.version===${JSON.stringify(CONSENT_VERSION)})ask=false;`,
  "}}",
  "var n=navigator,x=n.doNotTrack;",
  "if(x==null)x=n.msDoNotTrack;if(x==null)x=window.doNotTrack;",
  "if(n.globalPrivacyControl===true||x==='1'||x==='yes')ask=false;",
  "d.setAttribute('data-consent',ask?'ask':'decided');",
  "}catch(err){}})();",
].join("");

/** The CSP source that allows exactly this script and nothing else. */
export const CONSENT_BOOT_HASH = `'sha256-${createHash("sha256").update(CONSENT_BOOT_SCRIPT).digest("base64")}'`;
