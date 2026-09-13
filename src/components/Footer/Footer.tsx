import Link from "next/link";

import { INSTALL_LINKS, LEGAL_LINKS, PAGE_LINKS, type NavLink } from "../../lib/nav-links";
import { RollingText } from "../RollingText";
import { BrandArt } from "./BrandArt";
import { SOCIALS } from "./socials";
import styles from "./Footer.module.scss";

/**
 * Site footer — the contentinfo landmark, mounted once in the root layout.
 *
 * Fills the viewport at lg and up. The gap between the top and bottom halves
 * is the only flexible dimension: both halves keep their natural height and
 * the spacer between them absorbs the slack, so nothing inside either half
 * stretches or re-spaces as the viewport grows. See Footer.module.scss.
 *
 * A Server Component with no client island — the newsletter field ships
 * disabled (see below), so the whole footer costs zero client JS.
 */
export function Footer() {
  return (
    // data-ground: the footer paints brown-950, where the default brown-900
    // cursor dot is 1.06:1 and invisible. See globals.scss.
    <footer className={styles.footer} data-ground="dark">
      <div className={styles.top}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <Link href="/" aria-label="Smarthaus — home">
              {/* BrandArt, not Logo: this branch is off main, where Logo has no
                  `variant` prop yet. Swap for <Logo variant="mark" /> once
                  feature/navbar lands. Sizing lives in the SCSS — the reset's
                  `svg { block-size: auto }` would override a height attribute. */}
              <BrandArt part="mark" className={styles.brandMark} />
            </Link>
            <p className={styles.tagline}>Smarter living for a brighter tomorrow</p>
            <p className={styles.brandParent}>
              <a
                className={styles.brandParentLink}
                href="https://www.mapletech.ae"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* No RollingText here, unlike every other footer link. The roll
                  lays each character out as a flex item on one unwrappable
                  row, so this 47-character line ran 333px wide and overflowed
                  a 320px viewport. It is the only footer link long enough to
                  need two lines, and it keeps the colour hover instead. */}
                Brand by Maple Technologies Security Systems LLC
              </a>
            </p>
          </div>

          <div className={styles.newsletter}>
            <p className={styles.newsletterTitle}>Stay up to date</p>
            <p className={styles.newsletterSubtitle}>Subscribe to our newsletters</p>

            {/*
              Disabled deliberately. There is no email backend yet — no Resend,
              no Server Action, no mailbox wired up — and a field that accepts
              an address and silently discards it is a dark pattern, and a
              consent-record problem under UAE PDPL.

              To go live: add the Server Action + Zod + honeypot + Resend stack
              per AGENTS.md, drop the `disabled` attributes and this note, and
              add the schema test.
            */}
            <div className={styles.field} data-disabled>
              {/* A real label, not just the placeholder: the placeholder sits
                  at 2.08:1 on this field, so it cannot be the accessible name. */}
              <label htmlFor="footer-email" className="visually-hidden">
                Email address
              </label>
              <input
                id="footer-email"
                className={styles.input}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter email"
                aria-describedby="footer-email-note"
                disabled
              />
              <button type="button" className={styles.submit} disabled>
                Submit
              </button>
            </div>
            <p id="footer-email-note" className={styles.newsletterNote}>
              Newsletter opens soon.
            </p>
          </div>

          <div className={styles.contact}>
            <h2 className={styles.contactTitle}>Talk To Us</h2>
            <ul className={styles.contactList}>
              <li>
                <a className={styles.contactItem} href="tel:+971543755150">
                  <RollingText>+971 54 375 5150</RollingText>
                </a>
              </li>
              <li>
                <a className={styles.contactItem} href="mailto:contact@mapletech.ae">
                  <RollingText>contact@mapletech.ae</RollingText>
                </a>
              </li>
              <li className={styles.contactItem}>Dubai, U.A.E.</li>
            </ul>

            <ul className={styles.socials}>
              {SOCIALS.map(({ id, label, href, path }) => (
                <li key={id}>
                  <a
                    className={styles.chip}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className={styles.chipIcon}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d={path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* One nav landmark with two labelled lists, rather than two sibling
            navs — fewer landmarks in the rotor for the same information. */}
        <nav className={styles.right} aria-label="Footer">
          <LinkColumn id="footer-pages" title="Pages" links={PAGE_LINKS} />
          <LinkColumn id="footer-install" title="What we install" links={INSTALL_LINKS} />
        </nav>
      </div>

      {/* The flexible gap. Grows to fill a tall viewport, holds at the
          footer's gap floor on a short one. */}
      <div className={styles.spacer} aria-hidden="true" />

      <div className={styles.bottom}>
        <div className={styles.legal}>
          {/* A literal year, not new Date().getFullYear(): that pins to build
              time and goes stale silently on a site that is not rebuilt, which
              is worse than a literal someone can grep for. */}
          <p className={styles.copyright}>
            © 2026. Maple Technologies Security Systems LLC. All rights reserved
          </p>

          <nav aria-label="Legal">
            <ul className={styles.legalLinks}>
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link className={styles.legalLink} href={href}>
                    <RollingText>{label}</RollingText>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className={styles.credit}>
            <a
              className={styles.creditLink}
              href="https://www.qera.studio"
              target="_blank"
              rel="noopener noreferrer"
            >
              <RollingText>Built by Qera Studio</RollingText>
            </a>
          </p>
        </div>

        {/* Decorative: the brand name is already the accessible name of the
            logo link above, so repeating it as a large graphic adds nothing. */}
        <div className={styles.wordmarkWrap} aria-hidden="true">
          {/* Paint server for the wordmark gradient, in its own zero-size svg
              so Logo.tsx needs no change — the CSS `fill` on .wordmark points
              at this id and beats the fill attribute on each path. */}
          <svg className={styles.gradientDefs} aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="footer-wordmark-gradient" x1="0" y1="0" x2="0" y2="1">
                {/* brown-100 at the top, brown-950 by the halfway mark. The
                    dark colour matches --color-bg-inverse-strong, the footer's
                    ground, so it must change with that token. */}
                <stop offset="0%" stopColor="#f0e9dd" />
                {/* <stop offset="50%" stopColor="#0a080725" /> */}
                <stop offset="85%" stopColor="#0a0807" />
              </linearGradient>
            </defs>
          </svg>
          <BrandArt part="wordmark" className={styles.wordmark} />
        </div>
      </div>
    </footer>
  );
}

function LinkColumn({
  id,
  title,
  links,
}: {
  id: string;
  title: string;
  links: readonly NavLink[];
}) {
  return (
    <div className={styles.linkCol}>
      {/* Labelled by the visible heading rather than a duplicated aria-label,
          so the group's name and its visible text cannot drift. */}
      <h2 className={styles.linkColTitle} id={id}>
        {title}
      </h2>
      <ul className={styles.linkList} aria-labelledby={id}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link className={styles.link} href={href}>
              <RollingText>{label}</RollingText>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
