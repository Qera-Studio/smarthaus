"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync, preload } from "react-dom";

import {
  SOLUTION_COPY_NAME,
  SOLUTION_PICTURE_NAME,
  solutionPictureProps,
} from "../../lib/solution-picture";
import type { SolutionsMenu as SolutionsMenuData } from "../../sanity/types";

/** How far a finger has to travel across the picture to count as a swipe. */
export const SWIPE_MIN_PX = 40;

/** How long the opening holds the screen for the page's picture, at most. */
export const OPENING_WAIT_MS = 1500;

/** On <html> while an opening runs: Nav.module.scss hides the panel at once. */
export const OPENING = "data-solution-opening";

/** A solution in the menu, and where it goes: its own page, or /solutions. */
export type SolutionLink = SolutionsMenuData["items"][number] & {
  href: string;
  /** It has a page of its own, which the picture can grow into. */
  page: boolean;
};

/**
 * The page's picture and copy, named for the view transition, once the page
 * is in the document and its picture decoded; nothing if that takes longer
 * than OPENING_WAIT_MS, so a slow page arrives without the opening rather
 * than holding the screen.
 */
function arrival(slug: string): Promise<HTMLElement[]> {
  return new Promise((resolve) => {
    let done = false;
    let found = false;
    const finish = (named: HTMLElement[]) => {
      done = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(named);
    };
    const look = () => {
      if (found) return;
      const picture = document.querySelector<HTMLElement>(`[data-solution-picture="${slug}"]`);
      const image = picture?.querySelector("img");
      if (!picture || !image) return;
      found = true;
      observer.disconnect();
      const name = () => {
        if (done) return;
        const copy = document.querySelector<HTMLElement>("[data-solution-copy]");
        picture.style.viewTransitionName = SOLUTION_PICTURE_NAME;
        if (copy) copy.style.viewTransitionName = SOLUTION_COPY_NAME;
        finish(copy ? [picture, copy] : [picture]);
      };
      image.decode().then(name, name);
    };
    const observer = new MutationObserver(look);
    const timer = window.setTimeout(() => finish([]), OPENING_WAIT_MS);
    observer.observe(document.body, { childList: true, subtree: true });
    look();
  });
}

/**
 * The opening (Shivanshu, 2026-11-15): the menu's picture grows into the
 * page's, half the screen, while the rest of the page cross-fades and the
 * title arrives after it. One native view transition, animated by CSS in
 * globals.scss; the navigation runs inside it, so the browser holds the old
 * screen until the new page and its picture are ready, and nothing loads in
 * view. The picture was warmed when the pointer reached its link.
 */
export function openSolution(
  picture: HTMLElement,
  item: Pick<SolutionLink, "id" | "href">,
  push: (href: string) => void,
) {
  // The picture as it shows now, whatever its fade was doing.
  picture.style.transition = "none";
  picture.style.opacity = "1";
  picture.style.viewTransitionName = SOLUTION_PICTURE_NAME;
  let named: HTMLElement[] = [];
  const root = document.documentElement;
  const transition = document.startViewTransition(async () => {
    // The old screen is taken: from here on is the page it opens.
    picture.style.viewTransitionName = "";
    root.toggleAttribute(OPENING, true);
    push(item.href);
    named = await arrival(item.id);
  });
  const settle = () => {
    root.removeAttribute(OPENING);
    picture.style.removeProperty("transition");
    picture.style.removeProperty("opacity");
    picture.style.removeProperty("view-transition-name");
    for (const element of named) element.style.removeProperty("view-transition-name");
  };
  transition.finished.then(settle, settle);
}

/** No opening without the API, or under reduced motion: a plain navigation. */
const canOpen = () =>
  typeof document.startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A click the browser would open in a new tab or window is left to it. */
const plainClick = (event: React.MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

// CSS Module lookups are string | undefined under noUncheckedIndexedAccess.
type ClassName = string | undefined;

export type SolutionsMenuClasses = {
  root: ClassName;
  list: ClassName;
  item: ClassName;
  link: ClassName;
  media: ClassName;
  image: ClassName;
};

/**
 * The eight solutions and a picture of the one in hand: hovering or focusing
 * a link shows its picture, and the highlight follows. Nav renders it twice,
 * once in the desktop panel and once in the phone menu, and passes each its
 * own classes, so all its styling lives in Nav.module.scss beside the states
 * that drive it.
 *
 * With `swipe`, a finger dragged sideways across the picture moves to the
 * next or previous solution and wraps round (Shivanshu's easter egg). A tap
 * opens the one showing; the click a swipe ends in does not.
 *
 * The picture is a second way to the same link, for a pointer: hidden from
 * AT and out of the tab order, since the text link beside it is the real one.
 *
 * A solution with a page of its own opens it with the opening above; the
 * rest go to /solutions. Reaching a link warms its page's picture.
 */
export function SolutionsMenu({
  menu: { items },
  classes,
  sizes,
  swipe = false,
}: {
  /** The solutions and where they go: Nav's solutionLinks(). */
  menu: { items: readonly SolutionLink[] };
  classes: SolutionsMenuClasses;
  sizes: string;
  swipe?: boolean;
}) {
  const [active, setActive] = useState(0);
  const press = useRef<number | null>(null);
  const swiped = useRef(false);
  const media = useRef<HTMLAnchorElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // The page's picture at the size the page asks for, so it is in the cache
  // when the opening needs it. React sends each file once.
  const warm = (index: number) => {
    const item = items[index];
    if (!item?.page) return;
    const { props } = getImageProps(solutionPictureProps(item.image));
    if (!props.src) return;
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes });
  };

  const show = (index: number) => {
    setActive(index);
    warm(index);
  };

  const open = (event: React.MouseEvent, index: number) => {
    const item = items[index];
    if (!item?.page || item.href === pathname || !plainClick(event) || !canOpen()) return;
    const picture = media.current?.querySelectorAll("img")[index];
    // A copy of the menu that is not on screen has nothing to grow.
    if (!picture || picture.getClientRects().length === 0) return;
    event.preventDefault();
    flushSync(() => setActive(index));
    openSolution(picture, item, (href) => router.push(href));
  };

  const step = (by: number) => show((active + by + items.length) % items.length);

  const swipeHandlers = swipe
    ? {
        onPointerDown: (event: React.PointerEvent) => {
          press.current = event.clientX;
          swiped.current = false;
        },
        onPointerUp: (event: React.PointerEvent) => {
          if (press.current === null) return;
          const dx = event.clientX - press.current;
          press.current = null;
          if (Math.abs(dx) < SWIPE_MIN_PX) return;
          swiped.current = true;
          step(dx < 0 ? 1 : -1);
        },
        onPointerCancel: () => {
          press.current = null;
        },
        onClick: (event: React.MouseEvent) => {
          if (!swiped.current) return open(event, active);
          swiped.current = false;
          event.preventDefault();
        },
        // The browser's own image drag would take the gesture.
        onDragStart: (event: React.DragEvent) => event.preventDefault(),
      }
    : { onClick: (event: React.MouseEvent) => open(event, active) };

  return (
    <div className={classes.root}>
      <ul className={classes.list}>
        {items.map((item, index) => (
          <li
            key={item.id}
            className={classes.item}
            style={{ "--link-index": index } as React.CSSProperties}
          >
            <Link
              href={item.href}
              className={classes.link}
              data-shown={index === active || undefined}
              // A finger has no hover: on a phone a tap lands where the next
              // view's link will be, and would light it up. It still warms
              // the picture as it lands.
              onPointerEnter={(event) => event.pointerType !== "touch" && show(index)}
              onPointerDown={(event) => event.pointerType === "touch" && warm(index)}
              onFocus={() => show(index)}
              onClick={(event) => open(event, index)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        ref={media}
        href={items[active]?.href ?? "/solutions"}
        className={classes.media}
        tabIndex={-1}
        aria-hidden="true"
        data-solutions-media
        {...swipeHandlers}
      >
        {items.map((item, index) => (
          <Image
            key={item.id}
            src={item.image.src}
            alt=""
            fill
            sizes={sizes}
            className={classes.image}
            data-shown={index === active || undefined}
            draggable={false}
          />
        ))}
      </Link>
    </div>
  );
}
