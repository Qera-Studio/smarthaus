import { ContactForm } from "../../app/contact/ContactForm";
import { getConsentCopy, getContactPage, getSettings } from "../../sanity/content";
import { Words } from "../Words";
import styles from "./HomeEnquiry.module.scss";

/**
 * The short enquiry form at the foot of the homepage, above the footer.
 *
 * Four fields — name, email, phone, message — and a submit. Everything the
 * contact page asks beyond that (community, what you are looking for, the two
 * consent boxes) is dropped: this is the low-friction path for someone who has
 * just scrolled the homepage, not a replacement for /contact.
 *
 * It renders the contact page's own ContactForm in its `short` variant rather
 * than a second copy of the markup, so the two are identical by construction
 * rather than by somebody remembering to keep two components in step. The form
 * brings its styles with it: they are top-level classes in page.module.scss,
 * not descendants of that page's wrapper.
 *
 * Laid out as the contact page's section pattern: title and standfirst on the
 * left, form on the right, a rule across the top. Two equal columns from lg,
 * stacking to one below it.
 *
 * Heading is h2: the homepage h1 is the page title, and this is a sibling
 * section rather than a subsection of anything.
 *
 * The title and standfirst reveal on scroll; the form never waits to appear.
 */
export async function HomeEnquiry({ title, standfirst }: { title: string; standfirst: string }) {
  const [{ form }, { contact }, { form: consent }] = await Promise.all([
    getContactPage(),
    getSettings(),
    getConsentCopy(),
  ]);
  return (
    <section className={styles.enquiry} aria-labelledby="home-enquiry">
      <div className={styles.intro}>
        <h2 className={styles.heading} id="home-enquiry" data-reveal="" data-reveal-words="">
          <Words text={title} />
        </h2>
        <p className={styles.standfirst} data-reveal="">
          {standfirst}
        </p>
      </div>

      <div className={styles.formScope}>
        <ContactForm variant="short" copy={form} consent={consent} whatsapp={contact.whatsapp} />
      </div>
    </section>
  );
}
