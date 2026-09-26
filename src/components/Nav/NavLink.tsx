"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isCurrentPath } from "../../lib/nav-links";

/**
 * A nav link that says when it is the current page: aria-current="page" for
 * assistive technology, and the underline Nav.module.scss draws for everyone
 * else. The one client piece of an otherwise server-rendered nav, because only
 * the client router knows the path after a soft navigation.
 */
export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  const current = isCurrentPath(usePathname() ?? "", href);
  return (
    <Link href={href} className={className} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
