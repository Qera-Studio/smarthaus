import { Loader } from "./Loader";
import styles from "./Splash.module.scss";

/**
 * How long the splash covers the page, in milliseconds.
 *
 * One loader cycle, not two: two would be four seconds of held-back content.
 * The mark builds and empties once, and the progress bar is timed to reach 100%
 * as that finishes.
 *
 * Keep all three in step: this, --splash-duration in Splash.module.scss, and
 * --loader-cycle in Loader.module.scss. The inline script below cannot read
 * either custom property, since it runs before the stylesheet is guaranteed to
 * have applied — hence the duplication, which is why this comment exists.
 */
const SPLASH_DURATION_MS = 2000;

/**
 * The full-screen loading splash.
 *
 * ## Why this is server-rendered rather than a client component
 *
 * The brief was "before anything and everything is painted", and a client
 * component cannot do that: React mounts after hydration, so the page has
 * already painted by then and an overlay appearing at that point covers
 * content the user can already see — worse than no splash at all.
 *
 * So this markup is emitted by the server as the FIRST child of <body> and
 * covers the viewport from the very first paint. Nothing about its appearance
 * waits for JavaScript:
 *
 *   - the overlay is opaque and fixed, by CSS alone;
 *   - the mark animates by CSS keyframes;
 *   - the progress bar fills by CSS animation, not by a JS counter.
 *
 * ## The counter, and the one script
 *
 * The percentage TEXT is the one thing CSS cannot do — it cannot render an
 * animated number as text. That, and removing the overlay, is all the script
 * does, and it is the only part of this that needs JavaScript at all.
 *
 * It is a bare `<script>` placed directly after the readout, so the browser
 * executes it synchronously while parsing the HTML — before the first paint,
 * and well before hydration.
 *
 * Two approaches were tried and are wrong:
 *
 *   - a client component: React mounts after hydration, so the counter would
 *     not start until the splash was nearly over;
 *   - `next/script` with `strategy="beforeInteractive"`: React warns that
 *     scripts inside a component tree are never executed on the client, and
 *     the component is the wrong home for it anyway — the App Router wants
 *     those in the root layout. `next/script` is for loading and ordering
 *     external scripts, not for a synchronous DOM correction during parse.
 *
 * Because the script updates the DOM before React hydrates, the readout
 * carries `suppressHydrationWarning`. That is required, not cosmetic: see the
 * note at the element.
 *
 * ## What this does NOT do yet
 *
 * This is the trial version and the duration is a fixed timer. A real
 * implementation would tie the bar and the counter to actual progress — fonts
 * ready, hero media decoded, route data resolved — and dismiss on that rather
 * than on a clock. The markup and styling do not change when that lands; only
 * what advances the number does.
 *
 * ## Accessibility
 *
 * The overlay is `aria-hidden` and the Loader's own role="status" carries the
 * announcement, so a screen reader hears "Loading" once rather than a stream of
 * percentages. Nothing inside is focusable, so it cannot trap the keyboard.
 *
 * When it finishes it is hidden with `display: none` rather than detached from
 * the DOM — see the note in the script — which takes it out of the flow, hit
 * testing and the accessibility tree alike, so it leaves behind neither a
 * stale tab stop nor an invisible sheet over the page.
 *
 * Under `prefers-reduced-motion` the bar and counter do not animate: the splash
 * still appears and still dismisses, it simply does not count up.
 */
export function Splash() {
  return (
    /*
      `id` rather than a CSS-Module class as the script's hook: module class
      names are hashed at build time and the script is a string, so it cannot
      reference `styles.splash`. The ids are stable.
    */
    <div id="splash" className={styles.splash} aria-hidden="true">
      <div className={styles.centre}>
        <Loader size={96} />
      </div>

      {/*
        Full viewport width, pinned below the mark. The fill's width is animated
        by CSS so the bar advances with no JS at all.
      */}
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>

      {/*
        The readout is PARKED at the end of the bar and does not move. An
        earlier version slid it along under the fill's leading edge, which
        tracked perfectly and was unreadable — a digit crossing the viewport in
        two seconds cannot be read. Fixed position, changing digits.
      */}
      <div className={styles.readout}>
        {/*
          suppressHydrationWarning, and it is load-bearing rather than a way to
          quieten a warning.

          The inline script below starts counting during HTML parse, so by the
          time React hydrates this span's text is already past "0" and
          React sees a text mismatch. Without this attribute React treats that
          as a hydration error and client-renders from the nearest boundary,
          which throws away the DOM the script had been updating — so the
          counter freezes and the splash never dismisses. With it, React keeps
          what is in the DOM and discards its own value for this element.

          This is the pattern Next documents for correcting server-rendered
          content before first paint (see its "preventing flash before
          hydration" guide), and the reason the initial text is "0": that is
          what a visitor with JavaScript disabled is left looking at, so it has
          to be a sensible resting value rather than blank.
        */}
        <span id="splash-pct" className={styles.pct} suppressHydrationWarning>
          0
        </span>
        <span aria-hidden="true">%</span>
      </div>

      {/*
        A plain <script>, placed immediately after the element it updates, so
        the browser runs it SYNCHRONOUSLY during HTML parsing — before the first
        paint and long before hydration. That is the only stage early enough for
        a splash that is meant to gate the first paint.

        This was `next/script` with strategy="beforeInteractive" first, and that
        was wrong twice over. React warns that scripts inside a component tree
        are never executed on the client, and `next/script` is for loading and
        ordering scripts rather than for a synchronous DOM correction during
        parse. A bare tag is what Next's own "preventing flash before
        hydration" guide prescribes for this, and it needs no strategy at all.

        On dangerouslySetInnerHTML: the content is a static string authored
        here. The only interpolation is SPLASH_DURATION_MS, a module-level
        number — there is no user input, no request data and no props in it, so
        there is nothing to escape or sanitise. Script content cannot be passed
        as JSX children without React escaping it, which is why the API is
        shaped this way.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  var D = ${SPLASH_DURATION_MS};
  var el = document.getElementById("splash");
  var pct = document.getElementById("splash-pct");
  if (!el) return;

  // Mirror the CSS motion preference for the counter. The splash still shows
  // and still dismisses; the number just goes straight to 100.
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (still) {
    if (pct) pct.textContent = "100";
  } else {
    var start = performance.now();
    (function tick(now) {
      // Clamped at BOTH ends. The upper clamp stops the counter overshooting
      // 100 if a frame lands late; the lower one matters just as much — the
      // first rAF callback can carry a timestamp from before this script's own
      // start value, which produced a visible "-1" on the opening frame.
      //
      // No backticks anywhere in this script: it lives inside a template
      // literal, so one would close the string and break the parse.
      var p = Math.max(0, Math.min(1, ((now || performance.now()) - start) / D));
      if (pct) pct.textContent = String(Math.round(p * 100));
      if (p < 1) requestAnimationFrame(tick);
    })();
  }

  var gone = false;
  // Marks the splash finished. It is HIDDEN, never removed.
  //
  // An earlier version called parentNode.removeChild(el) here, and that threw
  // three NotFoundErrors from React's own reconciler:
  // "insertBefore/removeChild: the node is not a child of this node". The
  // splash is a React element in the root layout's tree, so tearing it out of
  // the DOM from a plain script leaves React's copy of the tree describing a
  // child that is gone — and the next reconcile, on a route change or an HMR
  // update, tries to operate against the missing node and fails.
  //
  // Never remove React-owned DOM from outside React. data-done takes it out of
  // the flow and out of hit testing by CSS instead, which reaches the same
  // visual end state while leaving the tree exactly as React rendered it.
  function drop() {
    if (gone) return;
    gone = true;
    if (el) el.setAttribute("data-done", "");
  }

  function done() {
    if (gone || !el) return;
    el.setAttribute("data-leaving", "");
    // Hide after the fade, so nothing covers the page. The timeout is the
    // fallback for when transitionend never fires — reduced motion zeroes the
    // duration, and a backgrounded tab may not fire it at all.
    el.addEventListener("transitionend", drop, { once: true });
    setTimeout(drop, 600);
  }

  setTimeout(done, D);
  // Never strand the visitor behind the splash: if a timer is starved in a
  // backgrounded tab, or anything above threw, this still clears it.
  setTimeout(drop, D + 2000);
})();
`,
        }}
      />
    </div>
  );
}
