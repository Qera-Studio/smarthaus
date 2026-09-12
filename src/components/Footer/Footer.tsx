import Link from "next/link";
import styles from "./Footer.module.scss";

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "971543755150";

const navLinks = [
  { href: "/solutions", label: "Solutions" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.logo}>Smarthaus</p>
          <p className={styles.tagline}>Premium smart home automation — Dubai</p>
        </div>

        <nav className={styles.nav} aria-label="Footer">
          <ul>
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.contact}>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in Smarthaus smart home solutions.")}`}
            className={styles.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <a href="mailto:contact@mapletech.ae" className={styles.link}>
            contact@mapletech.ae
          </a>
        </div>

        <div className={styles.legal}>
          <p>&copy; {year} Maple Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
