import Link from "next/link";
import { Logo } from "../Logo";
import { RollingText } from "../RollingText";
import styles from "./Nav.module.scss";

// These routes do not exist yet — they 404 until each page lands. Kept here so
// the nav ships with its real information architecture rather than a stub.
const LINKS = [
  { href: "/solutions", label: "Solutions" },
  { href: "/designers", label: "Designers" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
] as const;

export function Nav() {
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.logo} aria-label="Smarthaus — home">
        <Logo size={19.2} />
      </Link>

      <nav className={styles.links} aria-label="Primary">
        <ul className={styles.list}>
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={styles.link}>
                <RollingText>{label}</RollingText>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link href="/contact" className={styles.cta}>
        Book a free site visit
      </Link>
    </header>
  );
}
