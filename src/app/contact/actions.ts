"use server";

import { contactSchema, HONEYPOT_FIELD } from "../../lib/contact-schema";
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
  // Honeypot first, before validation. A bot gets the success shape and no
  // signal that it was caught — an error would tell it which field to skip.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { status: "ok", name: "", phone: "" };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    community: formData.get("community"),
    message: formData.get("message"),
    interest: formData.get("interest"),
  });

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
    return { status: "invalid", fieldErrors };
  }

  try {
    await deliver(parsed.data);
  } catch (error) {
    // Logged server-side, never surfaced: the message could carry the API key
    // or the lead's own data, and neither belongs in a browser.
    console.error("[contact] delivery failed", error);
    return { status: "failed" };
  }

  return { status: "ok", name: parsed.data.name, phone: parsed.data.phone };
}

/**
 * Delivery.
 *
 * ponytail: log-only. The whole validation path is real; only the send is
 * stubbed, because RESEND_API_KEY is not provisioned yet and a form that
 * accepts a lead and silently drops it is worse than one that is visibly
 * unfinished. This logs where an operator can see it in the meantime.
 *
 * TODO: swap the console.log for Resend. That is this function body and
 * nothing else — add the `resend` dependency, read RESEND_API_KEY and
 * LEAD_EMAIL, send, and let a non-2xx throw so the catch above still shows the
 * WhatsApp fallback. No CSP change: the call is server-side, so connect-src
 * never sees it.
 */
async function deliver(data: {
  name: string;
  phone: string;
  email?: string | undefined;
  community?: string | undefined;
  message?: string | undefined;
  interest: string;
}): Promise<void> {
  console.log(
    [
      "[contact] new enquiry",
      `  name:      ${data.name}`,
      `  phone:     ${data.phone}`,
      `  email:     ${data.email ?? "not given"}`,
      `  community: ${data.community ?? "not given"}`,
      `  interest:  ${data.interest}`,
      `  message:   ${data.message ?? "not given"}`,
    ].join("\n"),
  );
}
