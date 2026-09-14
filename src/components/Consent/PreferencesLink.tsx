"use client";

import type { MouseEvent, ReactNode } from "react";
import { OPEN_PREFERENCES_EVENT, PREFERENCES_ROUTE } from "../../lib/consent";

type PreferencesLinkProps = {
  className?: string;
  children: ReactNode;
};

/**
 * The footer's "Cookie Preferences" link.
 *
 * A plain click opens the preferences panel in place — the same card the
 * banner expands into, listening in ConsentShell — rather than leaving the page
 * for /cookie-preferences. The href still points at that route on purpose: it
 * is the no-JS path, the target of a modified click (new tab), and the
 * permanent withdrawal route Legal §6 requires, so it must stay a real link
 * and not become a button.
 *
 * A native <a> rather than next/link: the navigation is the fallback, not the
 * point, and prefetching a page nobody is expected to reach is wasted bytes.
 */
export function PreferencesLink({ className, children }: PreferencesLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modified clicks keep the browser's own behaviour (open in a new tab,
    // download, and so on); only a plain click opens the panel here.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
  };

  return (
    <a href={PREFERENCES_ROUTE} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
