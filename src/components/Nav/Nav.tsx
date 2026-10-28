import Link from "next/link";
import { NAV_LINKS } from "../../lib/nav-links";
import { Logo } from "../Logo";
import { RollingText } from "../RollingText";
import { NavLink } from "./NavLink";
import { NavShell } from "./NavShell";
import { SolutionsMenu } from "./SolutionsMenu";
import styles from "./Nav.module.scss";

/** The Solutions link opens the menu of the eight solutions. */
const MENU_HREF = "/solutions";

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
              // NavShell opens the menu from anywhere inside this item: the
              // link, and from lg the panel hanging under the bar.
              data-menu-zone={href === MENU_HREF || undefined}
            >
              <NavLink href={href} className={styles.link}>
                <RollingText>{label}</RollingText>
              </NavLink>
              {href === MENU_HREF && (
                <div className={styles.menu} data-menu-panel>
                  <div className={styles.menuInner}>
                    <SolutionsMenu
                      classes={{
                        root: styles.menuBody,
                        list: styles.menuList,
                        item: styles.menuItem,
                        link: styles.menuLink,
                        media: styles.menuMedia,
                        image: styles.menuImage,
                      }}
                      sizes="21rem"
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      }
      cta={
        <Link href="/contact" className={styles.cta}>
          Book a site visit
        </Link>
      }
      solutions={
        <SolutionsMenu
          classes={{
            root: styles.subBody,
            list: styles.subList,
            item: styles.subItem,
            link: styles.subLink,
            media: styles.subMedia,
            image: styles.subImage,
          }}
          sizes="(min-width: 25rem) 25rem, 100vw"
          swipe
        />
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
