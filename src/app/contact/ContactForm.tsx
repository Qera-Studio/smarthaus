"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { HONEYPOT_FIELD, INTERESTS } from "../../lib/contact-schema";
import { CONSENT_FORM_COPY } from "../../content/consent";
import { whatsappLink } from "../../lib/contact";
import { submitEnquiry, submitShortEnquiry } from "./actions";
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
// Order matters: the first failing field in this list is the one focused. The
// consent checkbox is last because it sits below the field grid, so sending a
// visitor there only happens when nothing above it also failed.
const FOCUS_ORDER = ["name", "email", "phone", "interest", "contactConsent"] as const;

/**
 * `short` is the homepage form above the footer: name, email, phone, message.
 *
 * It is a variant of this component rather than a copy so the two cannot drift
 * — the autofill handling, the focus-on-error behaviour, the honeypot and the
 * confirmation are the parts most likely to rot in a duplicate.
 *
 * The variant picks the server action, and the action picks the schema. It is
 * deliberately NOT a field in the payload: a variant read from FormData is
 * attacker-controlled, and the full form's consent tick is what it would skip.
 */
export function ContactForm({ variant = "full" }: { variant?: "full" | "short" }) {
  const short = variant === "short";
  const [state, formAction] = useActionState(
    short ? submitShortEnquiry : submitEnquiry,
    INITIAL_STATE,
  );
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

  /**
   * What the visitor typed on the attempt that failed. An error must cost them
   * a correction, never the whole form.
   *
   * Keyed on status so the fields reset properly on a fresh render. Passed as
   * `defaultValue` rather than `value`: these stay uncontrolled inputs, so
   * typing needs no state round-trip and the re-render only supplies the
   * starting text.
   */
  const values = state.status === "invalid" || state.status === "failed" ? state.values : {};

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
            defaultValue={values.name}
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
            defaultValue={values.email}
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
            defaultValue={values.phone}
            placeholder="enter phone number"
            className={styles.input}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
        </Field>

        {!short && (
          <Field id="community" label="Community">
            <input
              id="community"
              name="community"
              type="text"
              autoComplete="address-level2"
              defaultValue={values.community}
              placeholder="eg. Dubai Hills"
              className={styles.input}
            />
          </Field>
        )}

        {!short && (
          <Field id="interest" label="What are you looking?" error={errors.interest}>
            <select
              id="interest"
              name="interest"
              defaultValue={values.interest ?? INTERESTS[1]}
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
        )}

        <Field id="message" label="Message">
          <input
            id="message"
            name="message"
            type="text"
            defaultValue={values.message}
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

      {/*
        Consent, above the submit button and below the fields.

        Both start unticked. A pre-ticked consent box is basket sneaking, a
        named dark pattern, and it also makes the consent worthless: a tick the
        visitor did not make is not a choice.

        The two are separate fields rather than one because Legal §6 requires
        marketing consent to be distinct from service consent. Bundling them is
        exactly what that prohibits.
      */}
      {short ? (
        /*
          The notice-only variant, consent deck §6.4, which the deck calls the
          recommended alternative to the tick. No checkbox on the short form:
          the basis for answering an enquiry is "steps toward a contract", which
          the privacy policy already states and which needs no consent at all.

          The string is the same one the full form uses as its helper text, so
          the two surfaces cannot state different purposes for the same data.
        */
        <p className={styles.shortNotice}>
          {CONSENT_FORM_COPY.required.helperLead}{" "}
          <Link href={CONSENT_FORM_COPY.required.helperHref}>
            {CONSENT_FORM_COPY.required.helperLinkText}
          </Link>
          .
        </p>
      ) : (
        <div className={styles.consents}>
          <Checkbox
            id="contactConsent"
            error={errors.contactConsent}
            label={
              <>
                {CONSENT_FORM_COPY.required.label}{" "}
                {/* Visible text, not colour alone — a required marker a
                    colourblind visitor cannot see is not a marker. */}
                <span className={styles.requiredMarker}>{CONSENT_FORM_COPY.required.marker}</span>
              </>
            }
            helper={
              <>
                {CONSENT_FORM_COPY.required.helperLead}{" "}
                <Link href={CONSENT_FORM_COPY.required.helperHref}>
                  {CONSENT_FORM_COPY.required.helperLinkText}
                </Link>
                .
              </>
            }
          />

          <Checkbox id="marketingConsent" label={CONSENT_FORM_COPY.marketing.label} />
        </div>
      )}

      <Submit />
    </form>
  );
}

/**
 * One consent checkbox.
 *
 * A native `<input type="checkbox">`, styled — never a styled div. The platform
 * gives keyboard operation, the accessibility tree, form semantics and the
 * `:checked` state for nothing, and the consent brief rules out reimplementing
 * them.
 *
 * The error attaches to this field, not the form. One field failed, and the
 * design should say which rather than red-flashing everything.
 *
 * If counsel takes the notice-only variant for the required box, this component
 * stays and the required instance becomes a line of static text: the label and
 * helper are already nodes, so nothing here needs rebuilding.
 */
function Checkbox({
  id,
  label,
  helper,
  error,
}: {
  id: string;
  label: React.ReactNode;
  helper?: React.ReactNode;
  error?: string | undefined;
}) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.consent} data-invalid={error ? "true" : undefined}>
      <div className={styles.consentRow}>
        <input
          id={id}
          name={id}
          type="checkbox"
          className={styles.checkbox}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <label htmlFor={id} className={styles.consentLabel}>
          {label}
        </label>
      </div>
      {helper && (
        <p id={helperId} className={styles.consentHelper}>
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
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
