import { EMAIL, PHONE_DISPLAY, PHONE_E164, whatsappLink } from "../../lib/contact";
import { AnnouncementScroller } from "./AnnouncementScroller";
import styles from "./AnnouncementBar.module.scss";

/**
 * The strip above the nav, on every page: phone, email and WhatsApp, from
 * src/lib/contact.ts so it cannot disagree with the footer.
 *
 * One row on a wide screen. Below md it is one item at a time, swiped or
 * stepped with the arrows (AnnouncementScroller). An aside, so the links sit
 * in a landmark like everything else on the page.
 */
export function AnnouncementBar() {
  return (
    <aside className={styles.bar} aria-label="Contact Smarthaus">
      <AnnouncementScroller>
        <ul className={styles.items}>
          <li className={styles.item}>
            <a className={styles.link} href={`tel:${PHONE_E164}`}>
              call us at {PHONE_DISPLAY}
            </a>
          </li>
          <li className={styles.item}>
            <a className={styles.link} href={`mailto:${EMAIL}`}>
              mail us at {EMAIL}
            </a>
          </li>
          <li className={styles.item}>
            <a className={styles.link} href={whatsappLink()}>
              whatsapp at {PHONE_DISPLAY}
            </a>
          </li>
        </ul>
      </AnnouncementScroller>
    </aside>
  );
}
