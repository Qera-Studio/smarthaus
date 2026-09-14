import { ContactForm } from "../../app/contact/ContactForm";
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
 */
export function HomeEnquiry() {
  return (
    <section className={styles.enquiry} aria-labelledby="home-enquiry">
      <div className={styles.intro}>
        <h2 className={styles.heading} id="home-enquiry">
          Book a site visit
        </h2>
        <p className={styles.standfirst}>
          Tell us a little about your home and we&rsquo;ll call you back. During business hours,
          that&rsquo;s usually within the hour.
        </p>
      </div>

      <div className={styles.formScope}>
        <ContactForm variant="short" />
      </div>
    </section>
  );
}
