"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { submitHeroLead } from "../../app/contact/actions";
import { INITIAL_STATE } from "../../app/contact/state";
import { HONEYPOT_FIELD, MAX_LENGTH } from "../../lib/contact-fields";
import { Button } from "../Button";
import styles from "./HomeHero.module.scss";

/**
 * The hero's one field: an email address, sent as a lead the moment it is
 * given (Shivanshu, 2026-11-14). The server validates it (submitHeroLead);
 * nothing here does, and without JavaScript the form posts and the page comes
 * back with the same answer.
 *
 * The label is for screen readers only and the placeholder is what is seen:
 * the design's, and the one field on the site without a visible label
 * (CLAUDE.md, 2.4.6). There is no privacy notice beside it (removed at
 * Shivanshu's call, 2026-11-14): the policy is one link away in the footer.
 *
 * Its ids are its own: the homepage also carries the enquiry form, with
 * id="email" and the honeypot's id="company".
 */
export function HeroLead({ cta }: { cta: string }) {
  const [state, formAction, isPending] = useActionState(submitHeroLead, INITIAL_STATE);
  const input = useRef<HTMLInputElement>(null);

  const error = state.status === "invalid" ? state.fieldErrors.email : undefined;
  const failed = state.status === "failed";

  // An answer that asks for a correction puts the visitor back in the field.
  useEffect(() => {
    if (error) input.current?.focus();
  }, [error, state]);

  if (state.status === "ok") {
    return (
      <p className={styles.leadDone} role="status">
        Thank you. We will reply by email to arrange your site visit.{" "}
        <Link href="/contact">Tell us more about your home</Link>.
      </p>
    );
  }

  const values = state.status === "invalid" || failed ? state.values : undefined;
  const problem = error
    ? error
    : failed
      ? state.reason === "rate-limited"
        ? "That is a lot of tries in a short time. Please wait a few minutes and try again."
        : "That did not send. Please try again in a moment."
      : undefined;

  return (
    <form
      className={styles.leadForm}
      action={formAction}
      noValidate
      data-clarity-mask="true"
      onSubmit={(event) => {
        if (isPending) event.preventDefault();
      }}
    >
      <div className={styles.field}>
        <label className="visually-hidden" htmlFor="hero-email">
          Email
        </label>
        <input
          ref={input}
          className={styles.input}
          id="hero-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Enter email"
          maxLength={MAX_LENGTH.email}
          defaultValue={values?.email}
          aria-invalid={error ? true : undefined}
          aria-describedby={problem ? "hero-email-problem" : undefined}
        />
        <Button type="submit" variant="inverse" size="sm" loading={isPending}>
          {cta}
        </Button>
      </div>

      {problem ? (
        <p className={styles.leadProblem} id="hero-email-problem" role="alert">
          {problem}
        </p>
      ) : null}

      {/* The honeypot, as the contact form's: hidden from sight, from the
          accessibility tree and from the tab order, and never display:none. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor="hero-company">Company</label>
        <input
          id="hero-company"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
    </form>
  );
}
