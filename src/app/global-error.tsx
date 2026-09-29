"use client";

import { EMAIL, PHONE_DISPLAY, PHONE_E164 } from "../lib/contact";
import styles from "./global-error.module.scss";

/**
 * The last resort: an error in the root layout itself, where error.tsx cannot
 * help because the layout it would render inside is what broke. Next renders
 * this as the whole document, without the site's global styles or tokens, so
 * its stylesheet uses compile-time SCSS values only.
 *
 * Same rules as error.tsx: nothing from the error but its digest.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={styles.body}>
        <title>Something went wrong | Smarthaus</title>
        <main className={styles.page}>
          <h1 className={styles.title}>Something went wrong on our side</h1>
          <p className={styles.text}>
            The site could not load. Try again, or call us on{" "}
            <a href={`tel:${PHONE_E164}`}>{PHONE_DISPLAY}</a> or write to{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
          <button type="button" className={styles.button} onClick={() => retry()}>
            Try again
          </button>
          {error.digest ? <p className={styles.reference}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
