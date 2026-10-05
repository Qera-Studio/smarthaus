import { Loader } from "./Loader";
import styles from "./Splash.module.scss";

/**
 * The full-screen loading splash, on a visitor's first full load in a tab.
 *
 * ## Server-rendered, and hidden unless the boot script says otherwise
 *
 * The markup is the first child of <body> in the server HTML, so it can cover
 * the viewport from the very first paint; a client component would mount
 * after hydration, over content already on screen. But it is HIDDEN by
 * default (Splash.module.scss), and shows only while <html> carries
 * `data-splash="show"`, which src/lib/splash-boot.ts sets from <head> before
 * anything paints, and only on the first load in the tab. So a repeat visit
 * never flashes it, and a visitor without JavaScript never sees an overlay
 * that nothing could take down.
 *
 * Everything that moves is driven by that script: the bar's length through
 * `--splash-progress` on <html>, the percentage through `#splash-pct`, and the
 * exit through `data-splash` going to `leaving` (the fade) and then `done`.
 * The progress is real: fonts ready and the `load` event, with a floor and a
 * cap. This component renders no script of its own.
 *
 * ## Never removed from the DOM
 *
 * The element belongs to React's tree. Detaching it from a script made
 * React's reconciler throw NotFoundError on the next render, so it is hidden
 * by CSS state instead, which takes it out of the flow, hit testing and the
 * accessibility tree alike.
 *
 * ## Accessibility
 *
 * The overlay is `aria-hidden`; nothing inside is focusable, so it cannot
 * trap the keyboard. Under prefers-reduced-motion the bar and count show
 * complete rather than moving, and the splash still leaves when the page is
 * ready.
 */

export function Splash() {
  return (
    // An id rather than a module class as the script's hook: module class
    // names are hashed at build time and the script is a string.
    <div id="splash" className={styles.splash} aria-hidden="true">
      <div className={styles.centre}>
        <Loader size={96} />
      </div>

      {/* Full viewport width, pinned below the mark. */}
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>

      {/*
        Parked at the end of the bar: a number sliding across the screen in a
        second cannot be read, so only the digits change.
      */}
      <div className={styles.readout}>
        {/*
          suppressHydrationWarning is load-bearing: the boot script is already
          counting when React hydrates, and without it React would treat the
          changed text as a mismatch and re-render this part of the tree,
          throwing away the node the script updates.
        */}
        <span id="splash-pct" className={styles.pct} suppressHydrationWarning>
          0
        </span>
        <span aria-hidden="true">%</span>
      </div>
    </div>
  );
}
