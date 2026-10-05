import { createHash } from "node:crypto";

/** The sessionStorage key that marks the splash as seen in this tab. */
export const SPLASH_SEEN_KEY = "smarthaus-splash";

/** The splash never leaves sooner than this, so it reads as a moment, not a flicker. */
export const SPLASH_MIN_MS = 600;

/**
 * Nor later than this, however the page is doing. Two and a half seconds is
 * the old fixed timer plus the fade: what the trial showed every visitor, now
 * the worst case rather than the rule.
 */
export const SPLASH_MAX_MS = 2500;

/** The fade, in step with --splash-exit in Splash.module.scss. */
export const SPLASH_EXIT_MS = 320;

/**
 * The loader's script: the first thing in <head>, beside the consent boot.
 *
 * It decides, before anything paints, whether this load gets the splash, and
 * says so on <html> as `data-splash`:
 *
 * - `show`: the first full load in this tab. The splash, which is in the
 *   server HTML but hidden by default, covers the page from the first paint.
 * - `skip`: the tab has seen it. A reload or a link opened in the same tab
 *   never shows it twice, and soft navigations never re-render the root
 *   layout, so they never reach this at all.
 * - no attribute: JavaScript is off, or storage is blocked. The splash stays
 *   hidden: without the script nothing could take it down again, and without
 *   storage it would show on every load.
 *
 * It then drives the bar and the percentage from real progress rather than a
 * clock: the page is ready once its fonts are and the `load` event has fired,
 * and the splash leaves as soon as it is ready and SPLASH_MIN_MS has passed,
 * or at SPLASH_MAX_MS regardless. Until ready the bar eases toward 90% and
 * holds there, so it never claims a finish that has not happened.
 *
 * Under prefers-reduced-motion the bar and count do not move: they show
 * complete, and the splash still leaves when the page is ready.
 *
 * ES5, because it runs before any bundle, and Date.now rather than
 * performance.now so the unit suite's fake clock drives it. Allowed by its
 * SHA-256 hash in the strict CSP (next.config.ts), like the consent boot.
 */
export const SPLASH_BOOT_SCRIPT = [
  "(function(){",
  "var d=document.documentElement,w=window;",
  `try{var k=${JSON.stringify(SPLASH_SEEN_KEY)},s=w.sessionStorage;`,
  "if(s.getItem(k)){d.setAttribute('data-splash','skip');return;}",
  "s.setItem(k,'1');}catch(err){return;}",
  "d.setAttribute('data-splash','show');",
  `var MIN=${SPLASH_MIN_MS},MAX=${SPLASH_MAX_MS},EXIT=${SPLASH_EXIT_MS},t0=Date.now(),p=0,end=false,wait=2;`,
  "function done(){d.setAttribute('data-splash','done');}",
  "function paint(v){d.style.setProperty('--splash-progress',String(v));",
  "var n=document.getElementById('splash-pct');if(n)n.textContent=String(Math.round(v*100));}",
  "function leave(){if(end)return;end=true;",
  "try{paint(1);d.setAttribute('data-splash','leaving');setTimeout(done,EXIT);}catch(err){done();}}",
  // The cap comes first, on a timer of its own, so neither a starved rAF in
  // a background tab nor anything below throwing can hold the page.
  "setTimeout(leave,MAX);",
  "try{",
  "var still=!!(w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches);",
  "var ready=function(){if(--wait===0&&!end)setTimeout(leave,Math.max(0,MIN-(Date.now()-t0)));};",
  "var tick=function(){if(end)return;var t=Math.min(0.9,(Date.now()-t0)/1500);p+=(t-p)*0.25;paint(p);w.requestAnimationFrame(tick);};",
  "if(still)paint(1);else{paint(0);w.requestAnimationFrame(tick);}",
  "var f=document.fonts;if(f&&f.ready)f.ready.then(ready,ready);else ready();",
  "if(document.readyState==='complete')ready();else w.addEventListener('load',ready);",
  "}catch(err){end=true;done();}",
  "})();",
].join("");

/** The CSP source that allows exactly this script and nothing else. */
export const SPLASH_BOOT_HASH = `'sha256-${createHash("sha256").update(SPLASH_BOOT_SCRIPT).digest("base64")}'`;
