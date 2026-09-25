import Link from "next/link";
import { NAV_LINKS } from "../../lib/nav-links";
import { Logo } from "../Logo";
import { RollingText } from "../RollingText";
import { NavShell } from "./NavShell";
import styles from "./Nav.module.scss";

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
          {NAV_LINKS.map(({ href, label }, index) => (
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
