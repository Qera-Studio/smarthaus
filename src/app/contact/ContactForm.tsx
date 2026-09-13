"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { HONEYPOT_FIELD, INTERESTS } from "../../lib/contact-schema";
import { whatsappLink } from "../../lib/contact";
import { submitEnquiry } from "./actions";
import { INITIAL_STATE, type ContactState } from "./state";
import styles from "./page.module.scss";

/**
 * The enquiry form. The page's only client component.
 *
 * A real <form action={...}>, so it posts and validates with JavaScript
 * disabled — the CSP's form-action 'self' already covers that path. The state
 * hook upgrades it to an inline result rather than a navigation.
 */

/** Fields that can carry an error, in DOM order — the first one gets focus. */
const FOCUS_ORDER = ["name", "email", "phone", "interest"] as const;

export function ContactForm() {
  const [state, formAction] = useActionState(submitEnquiry, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first field that failed. Without this a keyboard or
  // screen-reader user is left at the submit button with errors above them
  // they were never told about.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = FOCUS_ORDER.find((field) => field in state.fieldErrors);
    if (!first) return;
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  if (state.status === "ok") {
    return <Confirmation state={state} />;
  }

  const errors = state.status === "invalid" ? state.fieldErrors : {};

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      {/* Announces the send failure, which belongs to no single field. */}
      {state.status === "failed" && (
        <p className={styles.formError} role="alert">
          That didn&rsquo;t send.{" "}
          <a
            className={styles.inlineLink}
            href={whatsappLink("Hi, I tried the enquiry form on your site and it did not send.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message us on WhatsApp
          </a>{" "}
          and we&rsquo;ll pick it up straight away.
        </p>
      )}

      <div className={styles.fields}>
        <Field id="name" label="Name" error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="enter full name"
            className={styles.input}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
        </Field>

        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="enter email"
            className={styles.input}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
        </Field>

        <Field id="phone" label="Phone" error={errors.phone}>
          {/* The prefix is adjacent text, not the input's value: someone typing
              a local 05… number would otherwise produce "+97105…". */}
          <span className={styles.prefix} aria-hidden="true">
            +971
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="enter phone number"
            className={styles.input}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
        </Field>

        <Field id="community" label="Community">
          <input
            id="community"
            name="community"
            type="text"
            autoComplete="address-level2"
            placeholder="eg. Dubai Hills"
            className={styles.input}
          />
        </Field>

        <Field id="interest" label="What are you looking?" error={errors.interest}>
          <select
            id="interest"
            name="interest"
            defaultValue={INTERESTS[1]}
            className={styles.select}
            aria-invalid={errors.interest ? true : undefined}
            aria-describedby={errors.interest ? "interest-error" : undefined}
          >
            {INTERESTS.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </Field>

        <Field id="message" label="Message">
          <input
            id="message"
            name="message"
            type="text"
            placeholder="enter message"
            className={styles.input}
          />
        </Field>
      </div>

      {/*
        Honeypot. Visually hidden rather than display:none — a display:none
        field is the first thing a competent bot skips, and axe flags a hidden
        labelled control. aria-hidden plus tabIndex keeps it out of the
        accessibility tree and the tab order, so no real user ever meets it.
      */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD}>Company</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Submit />
    </form>
  );
}

/** Split out so useFormStatus reads this form's pending state, not a parent's. */
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? "Sending" : "Book a site visit"}
    </button>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {/* The focus ring lives on this wrapper, not the input: the phone row is
          two elements that read as one control, and two rings look like a bug. */}
      <div className={styles.control} data-invalid={error ? "true" : undefined}>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Confirmation({ state }: { state: Extract<ContactState, { status: "ok" }> }) {
  return (
    <div className={styles.confirmation} role="status">
      <p className={styles.confirmationLead}>
        Thanks{state.name ? `, ${state.name}` : ""}. We&rsquo;ll call you
        {state.phone ? ` on ${state.phone}` : ""} within the hour during business hours.
      </p>
      <p className={styles.confirmationBody}>
        If you&rsquo;d rather not wait, message us directly. In the meantime, here is what we
        install.
      </p>
      <div className={styles.confirmationActions}>
        <a
          className={styles.submit}
          href={whatsappLink("Hi, I just booked a site visit through your website.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Message us on WhatsApp
        </a>
        <Link className={styles.secondaryCta} href="/solutions">
          See what we install
        </Link>
      </div>
    </div>
  );
}
