import Link from "next/link";

import { PREFERENCES_ROUTE } from "../../lib/consent";
import { whatsappLink } from "../../lib/contact";
import { formatHours } from "../../lib/hours";
import type { NavLink } from "../../lib/nav-links";
import { getSettings } from "../../sanity/content";
import { PreferencesLink } from "../Consent";
import { RollingText } from "../RollingText";
import { BrandArt } from "./BrandArt";
import { SOCIAL_ICONS } from "./socials";
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
export async function Footer() {
  const {
    contact,
    footer: text,
    pageLinks,
    installLinks,
    legalLinks,
    socials,
  } = await getSettings();
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
            <p className={styles.tagline}>{text.tagline}</p>
            <p className={styles.brandParent}>
              <a
                className={styles.brandParentLink}
                href={text.parentHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* No RollingText here, unlike every other footer link. The roll
                  lays each character out as a flex item on one unwrappable
                  row, so this 47-character line ran 333px wide and overflowed
                  a 320px viewport. It is the only footer link long enough to
                  need two lines, and it keeps the colour hover instead. */}
                {text.parent}
              </a>
            </p>
          </div>

          <div className={styles.newsletter}>
            <p className={styles.newsletterTitle}>{text.newsletterTitle}</p>
            <p className={styles.newsletterSubtitle}>{text.newsletterSubtitle}</p>

            {/*
              Disabled deliberately. Resend delivers enquiries, but there is no
              newsletter list, no subscribe action and no unsubscribe route, and
              a field that accepts an address and silently discards it is a dark
              pattern, and a consent-record problem under UAE PDPL.

              To go live: add a subscribe Server Action + Zod + honeypot, a list
              to hold the addresses, an unsubscribe route and a privacy-policy
              row, drop the `disabled` attributes and this note, and add the
              schema test.
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
                placeholder={text.newsletterPlaceholder}
                aria-describedby="footer-email-note"
                disabled
              />
              <button type="button" className={styles.submit} disabled>
                {text.newsletterSubmit}
              </button>
            </div>
            <p id="footer-email-note" className={styles.newsletterNote}>
              {text.newsletterNote}
            </p>
          </div>

          <div className={styles.contact}>
            <h2 className={styles.contactTitle}>{text.contactTitle}</h2>
            <ul className={styles.contactList}>
              <li>
                <a className={styles.contactItem} href={`tel:${contact.phoneE164}`}>
                  <RollingText>{contact.phoneDisplay}</RollingText>
                </a>
              </li>
              <li>
                <a className={styles.contactItem} href={`mailto:${contact.email}`}>
                  <RollingText>{contact.email}</RollingText>
                </a>
              </li>
              <li className={styles.contactItem}>{contact.locality}</li>
              <li className={styles.contactItem}>{formatHours(contact.hours)}</li>
            </ul>

            <ul className={styles.socials}>
              {socials.map(({ id, label, href }) => {
                const icon = SOCIAL_ICONS[id];
                return (
                  <li key={id}>
                    <a
                      className={styles.chip}
                      href={id === "whatsapp" ? whatsappLink(contact.whatsapp) : href}
                      aria-label={label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {"src" in icon ? (
                        // A full-colour logo: drawn as it is, so a file, not a
                        // currentColor path. next/image would only wrap an SVG.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.chipIcon} src={icon.src} alt="" />
                      ) : (
                        <svg
                          className={styles.chipIcon}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d={icon.path} />
                        </svg>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* One nav landmark with two labelled lists, rather than two sibling
            navs — fewer landmarks in the rotor for the same information. */}
        <nav className={styles.right} aria-label="Footer">
          <LinkColumn id="footer-pages" title={text.pagesTitle} links={pageLinks} />
          <LinkColumn id="footer-install" title={text.installTitle} links={installLinks} />
        </nav>
      </div>

      {/* The flexible gap. Grows to fill a tall viewport, holds at the
          footer's gap floor on a short one. */}
      <div className={styles.spacer} aria-hidden="true" />

      <div className={styles.bottom}>
        <div className={styles.legal}>
          {/* The year is written in the Studio, not new Date().getFullYear():
              that pins to build time and goes stale silently on a site that is
              not rebuilt. */}
          <p className={styles.copyright}>{text.copyright}</p>

          <nav aria-label="Legal">
            <ul className={styles.legalLinks}>
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  {/* Cookie preferences opens the panel in place; the href is
                      its no-JS fallback. Every other legal link is a page. */}
                  {href === PREFERENCES_ROUTE ? (
                    <PreferencesLink className={styles.legalLink}>
                      <RollingText>{label}</RollingText>
                    </PreferencesLink>
                  ) : (
                    <Link className={styles.legalLink} href={href}>
                      <RollingText>{label}</RollingText>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <p className={styles.credit}>
            <a
              className={styles.creditLink}
              href={text.creditHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <RollingText>{text.credit}</RollingText>
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
        {/* Keyed by label: the install links share one href until /solutions
            has its sections (nav-links.ts). */}
        {links.map(({ href, label }) => (
          <li key={label}>
            <Link className={styles.link} href={href}>
              <RollingText>{label}</RollingText>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
