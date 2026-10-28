"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Nav.module.scss";
import { latestEntry } from "@/lib/observer";
import { trackNavWidths } from "./measure";

/**
 * How much of the viewport the footer must cover before the nav hides. The
 * footer carries the same links, so the bar has nothing to offer at that point.
 */
const FOOTER_HIDE_RATIO = 0.7;

/**
 * How long the Solutions menu waits before closing once the pointer leaves
 * it, so crossing the bar between the link and the panel does not shut it.
 */
export const MENU_CLOSE_DELAY_MS = 150;

type NavShellProps = {
  /** Mark-only lockup, shown below lg where there is no room for the wordmark. */
  brandMark: ReactNode;
  /** Full horizontal lockup, shown from lg up. */
  brandFull: ReactNode;
  /** The <ul> of primary links, server-rendered. */
  links: ReactNode;
  /** The eight solutions, for the phone menu: shown in place of the links. */
  solutions: ReactNode;
  cta: ReactNode;
  /** Wordmark + parent-company line, pinned under the links when open. */
  footer: ReactNode;
};

/**
 * The nav's only client component — it exists purely to hold two booleans.
 *
 * Everything visible is passed in as already-rendered server nodes, so Link,
 * Logo and RollingText never enter the client bundle. They arrive as named
 * slots rather than one `children` because the three breakpoint bands lay the
 * same pieces out differently, and a single opaque node could not be
 * repositioned.
 *
 * State reaches CSS as data attributes on <header>; all the choreography lives
 * in Nav.module.scss.
 */
export function NavShell({ brandMark, brandFull, links, solutions, cta, footer }: NavShellProps) {
  const [open, setOpen] = useState(false);
  // The Solutions menu from lg: the panel under the bar. "focus" when the
  // keyboard opened it, which the stylesheet shows at once: the next Tab
  // lands in the panel, and must not land on an item still fading in.
  const [menu, setMenu] = useState<false | "hover" | "focus">(false);
  // Below lg: the open menu shows the eight solutions in place of the links.
  const [sub, setSub] = useState(false);
  // The phone's copy of the solutions is mounted on the first tap that shows
  // it, and kept: no visitor pays its elements and pictures until then.
  const [subUsed, setSubUsed] = useState(false);
  const [stuck, setStuck] = useState(false);
  // True once the footer covers FOOTER_HIDE_RATIO of the viewport.
  const [atFooter, setAtFooter] = useState(false);
  // From lg up the links are always on show in the bar, so the panel is never
  // a disclosure and must never be inert. Below lg it starts closed.
  const [isDesktop, setIsDesktop] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Bounds the "outside" of an outside-tap. The whole <header>, not just the
  // panel: the bar is part of the open nav, and a tap on the hamburger must
  // reach its own onClick rather than being closed out from under it.
  const headerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  // Set by a click that moves between the links and the solutions, so focus
  // follows it once the side it lands on is no longer inert.
  const focusAfterSub = useRef(false);
  // Set while Escape hands focus back to the Solutions link, so that focus
  // does not open the menu it has just closed.
  const returningFocus = useRef(false);

  // Desktop capsule trigger. A sentinel plus IntersectionObserver rather than a
  // scroll listener, which AGENTS.md rules out — this fires twice per crossing
  // instead of on every frame of every scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setStuck(!latestEntry(entries)?.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Hide the nav once the footer covers most of the screen. The footer carries
  // its own navigation, so a floating bar over it is redundant — and on mobile
  // it physically covers the links underneath it.
  //
  // The trigger is how much of the VIEWPORT the footer fills, not how much of
  // the footer is visible. intersectionRatio is the latter and is useless
  // here: the footer is min-block-size 100svh at lg and taller than the
  // viewport on mobile, so its ratio never approaches 0.7. The observer's root
  // is shrunk instead, turning "covers 70% of the screen" into a plain
  // intersection — see the options below. No scroll listener, which AGENTS.md
  // rules out, and no measuring of our own.
  //
  // The footer is a sibling of this component's tree, so it is found by
  // selector rather than a ref. The effect runs after paint, so it is mounted.
  useEffect(() => {
    const el = document.querySelector("footer");
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = latestEntry(entries);
        if (!entry) return;
        // Intersecting the shortened root means the footer's top has passed
        // the trigger line — i.e. it now covers at least FOOTER_HIDE_RATIO of
        // the real viewport.
        const hide = entry.isIntersecting;
        setAtFooter(hide);
        // A menu left open would be stranded off-screen with the bar.
        if (hide) {
          setOpen(false);
          setMenu(false);
        }
      },
      // rootMargin, not thresholds.
      //
      // Thresholds are fractions of the TARGET, and the footer is far taller
      // than the viewport — 3211px against 664px on a phone — so its ratio
      // tops out near 0.2 and crosses almost none of them. WebKit fired twice
      // across the whole scroll and never again while coverage climbed from
      // 0.2 to 0.99, leaving the bar visible over a footer that filled the
      // screen. Chromium happened to fire often enough to hide the bug.
      //
      // Shrinking the root from the bottom by (1 - ratio) of the viewport
      // makes the intersection itself the event: the footer enters this
      // shortened root exactly when its top passes FOOTER_HIDE_RATIO of the
      // real viewport. That is a boolean crossing, so a 0 threshold is enough
      // and it does not depend on the target's size at all.
      {
        rootMargin: `0px 0px -${Math.round(FOOTER_HIDE_RATIO * 100)}% 0px`,
        threshold: 0,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tracks the lg breakpoint so `inert` can be skipped on desktop, where the
  // links are permanently visible. $bp-lg in _variables.scss — keep in step.
  // Closes the menu on the way up so a panel opened on mobile does not persist
  // into the desktop layout after a resize or rotate.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setOpen(false);
      else setMenu(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Escape closes and hands focus back to the toggle, so keyboard users are not
  // left focused on a panel that has gone.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // A tap anywhere outside the nav closes it, which is what every other
  // disclosure on a phone does — requiring a second, accurate tap on the
  // hamburger is the thing that feels broken.
  //
  // `pointerdown` rather than `click`: it fires before focus moves and before
  // any link underneath activates, so the panel is already closing as the
  // finger lands. Focus is NOT returned to the toggle here — unlike Escape,
  // the user is pointing at something else, and stealing focus back would
  // scroll the page to the bar.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (headerRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    // Capture phase, so this still runs if something inside the page stops
    // propagation on its own pointer handlers.
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [open]);

  // The Solutions menu, from lg. It opens while the pointer or focus is
  // anywhere in the Solutions item, which holds both the link and the panel,
  // and closes a moment after the pointer leaves or at once when focus does.
  // Listeners on the item rather than :hover in the stylesheet: a closing
  // delay, Escape and a touch screen's first tap all need a say.
  useEffect(() => {
    const zone = headerRef.current?.querySelector<HTMLElement>("[data-menu-zone]");
    if (!zone || !isDesktop) return;
    let timer: number | undefined;
    const show = (how: "hover" | "focus") => {
      window.clearTimeout(timer);
      // Hover never downgrades a menu the keyboard already has open.
      setMenu((now) => (now === "focus" ? now : how));
    };
    const onFocusIn = () => {
      if (!returningFocus.current) show("focus");
    };
    const hide = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMenu(false), MENU_CLOSE_DELAY_MS);
    };
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") show("hover");
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "touch") hide();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (zone.contains(event.relatedTarget as Node | null)) return;
      window.clearTimeout(timer);
      setMenu(false);
    };
    zone.addEventListener("pointerenter", onPointerEnter);
    zone.addEventListener("pointerleave", onPointerLeave);
    zone.addEventListener("focusin", onFocusIn);
    zone.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(timer);
      zone.removeEventListener("pointerenter", onPointerEnter);
      zone.removeEventListener("pointerleave", onPointerLeave);
      zone.removeEventListener("focusin", onFocusIn);
      zone.removeEventListener("focusout", onFocusOut);
    };
  }, [isDesktop]);

  // Escape closes the Solutions menu and hands focus back to its link; a tap
  // outside it closes it too, as it does the phone menu.
  useEffect(() => {
    if (!menu) return;
    const zone = headerRef.current?.querySelector<HTMLElement>("[data-menu-zone]");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenu(false);
      // Focus events are synchronous, so the flag covers exactly this one.
      returningFocus.current = true;
      zone?.querySelector<HTMLElement>(":scope > a")?.focus();
      returningFocus.current = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && zone?.contains(event.target)) return;
      setMenu(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [menu]);

  // The panel is out of the tab order and the accessibility tree while it is
  // shut. It is server markup inside the links, so it is reached by selector;
  // the Solutions link says whether its menu is open, on either side of lg.
  useEffect(() => {
    const zone = headerRef.current?.querySelector<HTMLElement>("[data-menu-zone]");
    zone?.querySelector("[data-menu-panel]")?.toggleAttribute("inert", !menu);
    zone
      ?.querySelector(":scope > a")
      ?.setAttribute("aria-expanded", String(isDesktop ? Boolean(menu) : sub));
  }, [menu, sub, isDesktop]);

  // Focus follows a move between the links and the solutions on a phone: to
  // Back on the way in, to the Solutions link on the way out.
  useEffect(() => {
    if (!focusAfterSub.current) return;
    focusAfterSub.current = false;
    if (sub) backRef.current?.focus();
    else headerRef.current?.querySelector<HTMLElement>("[data-menu-zone] > a")?.focus();
  }, [sub]);

  // The Solutions link itself. On a phone it opens the solutions in place of
  // the links rather than leaving the page; from lg on a screen with no hover,
  // the first tap opens the panel and the second follows the link. Without
  // JavaScript it is a plain link either way. A link in the panel closes it.
  // One listener on the header for every link click, Enter included.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a");
      if (!link) return;
      if (link.closest("[data-menu-panel]")) {
        setMenu(false);
        return;
      }
      if (!link.parentElement?.hasAttribute("data-menu-zone")) return;
      if (!isDesktop) {
        event.preventDefault();
        focusAfterSub.current = true;
        setSubUsed(true);
        setSub(true);
      } else if (!menu && window.matchMedia("(hover: none)").matches) {
        event.preventDefault();
        setMenu("hover");
      }
    };
    header.addEventListener("click", onClick);
    return () => header.removeEventListener("click", onClick);
  }, [isDesktop, menu]);

  // The capsule's geometry uses the widths this platform renders: measure.ts.
  useEffect(() => trackNavWidths(headerRef.current!, linksRef.current!, ctaRef.current!), []);

  return (
    <>
      {/* Marks the top of the page. Once it scrolls out, the nav is "stuck". */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <header
        ref={headerRef}
        className={styles.nav}
        data-open={open || undefined}
        data-stuck={stuck || undefined}
        data-at-footer={atFooter || undefined}
        data-menu={menu || undefined}
        data-sub={sub || undefined}
        // A faded-out bar is still focusable and still in the accessibility
        // tree, so Tab would stop on controls nobody can see. `visibility:
        // hidden` in the CSS handles that too, but only after the fade — this
        // flips with the state, and covers the reduced-motion path where there
        // is no transition to wait for.
        inert={atFooter || undefined}
      >
        {/*
          Source order is focus order: brand, then the links, then the toggle
          and the CTA, which is the order they read left to right on desktop.
          The brand used to sit after the panel, so Tab ran through the centre
          links, jumped back to the logo, then on to the CTA (WCAG 2.4.3,
          e2e/keyboard.spec.ts). Neither band's layout depends on this order:
          both place every piece by grid row and column (Nav.module.scss).
        */}
        <span className={styles.brandMark}>{brandMark}</span>
        <span className={styles.brandFull}>{brandFull}</span>

        {/*
          Below lg the panel is placed in the row ABOVE the bar, and the box
          is pinned by its bottom edge, so opening it grows the capsule upward
          while the bar stays welded to the bottom.

          `inert` when closed, not just visually clipped: overflow alone would
          leave the links tabbable and in the accessibility tree, giving
          keyboard and screen-reader users phantom stops on a hidden menu.
          React needs `undefined` rather than `false` to drop the attribute.
        */}
        <div
          id={panelId}
          className={styles.panel}
          inert={(!isDesktop && !open) || undefined}
          // A menu closed on the solutions opens next time on the links. Once
          // it has finished closing, so the swap back is never seen.
          onTransitionEnd={(event) => {
            if (!open && event.target === event.currentTarget) setSub(false);
          }}
        >
          <div className={styles.panelInner}>
            {/*
              Below lg the solutions sit above the links and each has its own
              0fr/1fr row: one shrinks as the other grows, so the menu changes
              height as smoothly as it opens. From lg this is not rendered.
            */}
            <div className={styles.sub} inert={!sub || undefined}>
              <div className={styles.subInner}>
                <button
                  ref={backRef}
                  type="button"
                  className={styles.back}
                  onClick={() => {
                    focusAfterSub.current = true;
                    setSub(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                  Back
                </button>
                {subUsed && solutions}
              </div>
            </div>
            <div className={styles.main}>
              <nav
                ref={linksRef}
                className={styles.panelLinks}
                aria-label="Primary"
                inert={(!isDesktop && sub) || undefined}
              >
                {links}
              </nav>
            </div>
            <div className={styles.panelFooter}>{footer}</div>
          </div>
        </div>

        <div className={styles.bar}>
          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((isOpen) => !isOpen)}
          >
            {/* Three lines that rotate into an X — see Nav.module.scss. */}
            <svg className={styles.burger} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <line className={styles.burgerTop} x1="4" y1="8" x2="20" y2="8" />
              <line className={styles.burgerMid} x1="4" y1="12" x2="20" y2="12" />
              <line className={styles.burgerBot} x1="4" y1="16" x2="20" y2="16" />
            </svg>
          </button>

          <span ref={ctaRef} className={styles.ctaSlot}>
            {cta}
          </span>
        </div>
      </header>
    </>
  );
}
