"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./Nav.module.scss";

const links = [
  { href: "/solutions", label: "Solutions" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
] as const;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`} role="banner">
        <nav className={styles.inner} aria-label="Main">
          <Link href="/" className={styles.logo}>
            Smarthaus
          </Link>

          <ul className={styles.links}>
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/contact" className={styles.cta}>
            Get Started
          </Link>

          <button
            className={styles.burger}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            type="button"
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`${styles.mobile} ${open ? styles.mobileOpen : ""}`}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile">
          <ul>
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={styles.mobileLink}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                className={styles.mobileCta}
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
              >
                Get Started
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
