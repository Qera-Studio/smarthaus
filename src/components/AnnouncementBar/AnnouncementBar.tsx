import { whatsappLink } from "../../lib/contact";
import { getSettings } from "../../sanity/content";
import { AnnouncementScroller } from "./AnnouncementScroller";
import styles from "./AnnouncementBar.module.scss";

/**
 * The strip above the nav, on every page: phone, email and WhatsApp, from
 * the site settings in Sanity, so it cannot disagree with the footer.
 *
 * One row on a wide screen. Below md it is one item at a time, swiped or
 * stepped with the arrows (AnnouncementScroller). An aside, so the links sit
 * in a landmark like everything else on the page.
 */
export async function AnnouncementBar() {
  const { contact, announcement: text } = await getSettings();
  return (
    <aside className={styles.bar} aria-label="Contact Smarthaus">
      <AnnouncementScroller>
        <ul className={styles.items}>
          <li className={styles.item}>
            <a className={styles.link} href={`tel:${contact.phoneE164}`}>
              {text.call} {contact.phoneDisplay}
            </a>
          </li>
          <li className={styles.item}>
            <a className={styles.link} href={`mailto:${contact.email}`}>
              {text.mail} {contact.email}
            </a>
          </li>
          <li className={styles.item}>
            <a className={styles.link} href={whatsappLink(contact.whatsapp)}>
              {text.whatsapp} {contact.phoneDisplay}
            </a>
          </li>
        </ul>
      </AnnouncementScroller>
    </aside>
  );
}
