"use server";

import { Resend } from "resend";
import type { z } from "zod";

import { contactSchema, shortContactSchema, HONEYPOT_FIELD } from "../../lib/contact-schema";
import { submittedValues } from "./state";
import type { ContactState, FieldErrors } from "./state";

/**
 * The enquiry submission. One action, one network call.
 *
 * Shaped for useActionState, so it takes the previous state and returns the
 * next one. The success shape carries the name and phone back because the form
 * is gone by the time the confirmation renders and the copy interpolates both.
 *
 * This file exports exactly one async function and nothing else. A "use server"
 * module is not allowed to export anything but async functions, and violating
 * that fails the whole module at evaluation — every action call 500s, not just
 * the offending export. The state shape lives in ./state.ts for that reason.
 */

export async function submitEnquiry(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  return handle(formData, (data) =>
    contactSchema.safeParse({
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      community: data.get("community"),
      message: data.get("message"),
      interest: data.get("interest"),
      // An unticked checkbox is absent from FormData, so `get` returns null and
      // the schema's coercion reads that as false. Passed explicitly rather than
      // spread so a new form field cannot reach the schema unvalidated.
      contactConsent: data.get("contactConsent"),
      marketingConsent: data.get("marketingConsent"),
    }),
  );
}

/**
 * The short homepage form. A separate action rather than a `variant` field on
 * the shared one, deliberately: a variant read out of FormData is attacker-
 * controlled, so anyone posting `variant=short` to the full form would skip the
 * required consent tick. Which schema runs is decided here, on the server, by
 * which action the component imported.
 */
export async function submitShortEnquiry(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  return handle(formData, (data) =>
    shortContactSchema.safeParse({
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      message: data.get("message"),
    }),
  );
}

/** What both schemas produce. The short form simply omits the optional half. */
type Enquiry = {
  name: string;
  phone: string;
  email?: string | undefined;
  community?: string | undefined;
  message?: string | undefined;
  interest?: string | undefined;
};

/** The parts both actions share: honeypot, error shaping, delivery. */
async function handle(
  formData: FormData,
  parse: (data: FormData) => z.ZodSafeParseResult<Enquiry>,
): Promise<ContactState> {
  // Honeypot first, before validation. A bot gets the success shape and no
  // signal that it was caught — an error would tell it which field to skip.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { status: "ok", name: "", phone: "" };
  }

  // Captured before validation, so both failure paths can hand the visitor
  // their typing back rather than clearing the form under them.
  const values = submittedValues(formData);

  const parsed = parse(formData);

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      // First issue per field wins. A field with two problems has one input to
      // point at, and the first is the one the user hits first.
      if (typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field as keyof FieldErrors] = issue.message;
      }
    }
    return { status: "invalid", fieldErrors, values };
  }

  try {
    await deliver(parsed.data);
  } catch (error) {
    // Logged server-side, never surfaced: the message could carry the API key
    // or the lead's own data, and neither belongs in a browser.
    console.error("[contact] delivery failed", error);
    return { status: "failed", values };
  }

  return { status: "ok", name: parsed.data.name, phone: parsed.data.phone };
}

/**
 * Delivery. Resend, server-side — no CSP change, connect-src never sees it.
 *
 * The client is constructed per call rather than at module scope: this is a
 * "use server" module, which may export nothing but async functions, and a
 * module-level const is also evaluated at import time, when the env var may not
 * be there yet during build.
 *
 * Every failure path throws, so the caller's catch shows the WhatsApp fallback
 * rather than telling the lead their enquiry arrived when it did not.
 */
async function deliver(data: Enquiry): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    throw new Error("[contact] RESEND_API_KEY, LEAD_EMAIL or LEAD_FROM_EMAIL is not set");
  }

  const lines = [
    `Name:      ${data.name}`,
    `Phone:     ${data.phone}`,
    `Email:     ${data.email ?? "not given"}`,
    `Community: ${data.community ?? "not given"}`,
    `Interest:  ${data.interest ?? "not given"}`,
    "",
    "Message:",
    data.message ?? "not given",
  ];

  const { error } = await new Resend(apiKey).emails.send({
    from: `Smarthaus enquiries <${from}>`,
    to,
    subject: `New enquiry — ${data.name}`,
    text: lines.join("\n"),
    // So a reply from the inbox goes to the lead, not to the send-only address.
    // Only set when they gave one; the schema makes email optional.
    ...(data.email ? { replyTo: data.email } : {}),
  });

  // The SDK returns errors in the payload instead of rejecting, so a non-2xx
  // is silent unless it is checked and rethrown here.
  if (error) {
    throw new Error(`[contact] resend rejected the send: ${error.name} — ${error.message}`);
  }
}
