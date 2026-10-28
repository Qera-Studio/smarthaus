"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { SOLUTIONS_MENU_HREF, SOLUTIONS_MENU_ITEMS as items } from "../../content/solutions-menu";

/** How far a finger has to travel across the picture to count as a swipe. */
export const SWIPE_MIN_PX = 40;

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
 */
export function SolutionsMenu({
  classes,
  sizes,
  swipe = false,
}: {
  classes: SolutionsMenuClasses;
  sizes: string;
  swipe?: boolean;
}) {
  const [active, setActive] = useState(0);
  const press = useRef<number | null>(null);
  const swiped = useRef(false);

  const step = (by: number) => setActive((at) => (at + by + items.length) % items.length);

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
          if (!swiped.current) return;
          swiped.current = false;
          event.preventDefault();
        },
        // The browser's own image drag would take the gesture.
        onDragStart: (event: React.DragEvent) => event.preventDefault(),
      }
    : {};

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
              href={SOLUTIONS_MENU_HREF}
              className={classes.link}
              data-shown={index === active || undefined}
              // A finger has no hover: on a phone a tap lands where the next
              // view's link will be, and would light it up.
              onPointerEnter={(event) => event.pointerType !== "touch" && setActive(index)}
              onFocus={() => setActive(index)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={SOLUTIONS_MENU_HREF}
        className={classes.media}
        tabIndex={-1}
        aria-hidden="true"
        data-solutions-media
        {...swipeHandlers}
      >
        {items.map((item, index) => (
          <Image
            key={item.id}
            src={`/hero/navBar/${item.image}`}
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
