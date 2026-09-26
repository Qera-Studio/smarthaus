"use client";

import { Button } from "../components/Button";
import { EMAIL, PHONE_DISPLAY, PHONE_E164, whatsappLink } from "../lib/contact";
import styles from "./error.module.scss";

/**
 * What a visitor sees when a page fails to render, instead of Next's default.
 * Security System §15: no stack, no message, nothing from the error itself but
 * its digest, which is a reference with no content that matches this screen to
 * the server's log line (src/instrumentation.ts). The contact channels are
 * here because a visitor who meets an error was usually trying to reach us.
 *
 * `retry` re-fetches and re-renders the segment (Next 16; it replaced reset).
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className={styles.page} aria-labelledby="error-title">
      <h1 id="error-title" className={styles.title}>
        Something went wrong on our side
      </h1>
      <p className={styles.body}>
        This page could not be shown. Try again, or reach us directly and we will help.
      </p>

      <div className={styles.ctaRow}>
        <Button onClick={() => retry()}>Try again</Button>
      </div>

      <ul className={styles.channels}>
        <li>
          <a href={`tel:${PHONE_E164}`}>{PHONE_DISPLAY}</a>
        </li>
        <li>
          <a
            href={whatsappLink("Hi, a page on your site showed an error.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </li>
        <li>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </li>
      </ul>

      {error.digest ? <p className={styles.reference}>Reference: {error.digest}</p> : null}
    </section>
  );
}
