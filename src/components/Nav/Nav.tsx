import Link from "next/link";
import { Logo } from "../Logo";
import { RollingText } from "../RollingText";
import { NavShell } from "./NavShell";
import styles from "./Nav.module.scss";

// These routes do not exist yet — they 404 until each page lands. Kept here so
// the nav ships with its real information architecture rather than a stub.
const LINKS = [
  { href: "/solutions", label: "Solutions" },
  { href: "/designers", label: "Designers" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
] as const;

/**
 * Server Component. Renders every visible piece and hands them to NavShell,
 * which adds only the open/stuck state — so Link, Logo and RollingText stay
 * out of the client bundle.
 */
export function Nav() {
  return (
    <NavShell
      brandMark={
        <Link href="/" className={styles.logo} aria-label="Smarthaus — home">
          <Logo variant="mark" size={24} />
        </Link>
      }
      brandFull={
        <Link href="/" className={styles.logo} aria-label="Smarthaus — home">
          <Logo size={19.2} />
        </Link>
      }
      links={
        <ul className={styles.list}>
          {LINKS.map(({ href, label }, index) => (
            <li
              key={href}
              className={styles.item}
              // Drives the open stagger. Set here so the delay maths is pure
              // CSS — see --nav-stagger-step in Nav.module.scss.
              style={{ "--link-index": index } as React.CSSProperties}
            >
              <Link href={href} className={styles.link}>
                <RollingText>{label}</RollingText>
              </Link>
            </li>
          ))}
        </ul>
      }
      cta={
        <Link href="/contact" className={styles.cta}>
          Book a site visit
        </Link>
      }
      footer={
        <>
          <Logo variant="wordmark" size={18} className={styles.footerMark} />
          <span className={styles.footerBy}>by MapleTech</span>
        </>
      }
    />
  );
}
