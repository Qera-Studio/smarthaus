/**
 * @jest-environment node
 */

/**
 * The send path. Resend is mocked, so this never touches the network and needs
 * no API key — what it guards is the wiring around the send: that a rejected
 * send surfaces as "failed" rather than a false confirmation, and that the
 * lead's own address becomes the reply-to.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const send = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send } })),
}));

// Imported after the mock is registered, since the action pulls in Resend.
import { submitEnquiry, submitShortEnquiry } from "../actions";
import { PRIVACY_POLICY_VERSION } from "../../../content/legal/versions";
import { HONEYPOT_FIELD, INTERESTS } from "../../../lib/contact-schema";
import type { ContactState } from "../state";

const initial: ContactState = { status: "idle" };

/** A payload that clears the schema, so only delivery is under test. */
function validForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("name", "Nadia Rahman");
  // Written in the local form, so the email below also proves normalisation.
  data.set("phone", "0501234567");
  data.set("email", "nadia@example.com");
  data.set("message", "Two villas in Al Barari.");
  data.set("interest", INTERESTS[3]);
  data.set("contactConsent", "on");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("enquiry delivery", () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      RESEND_API_KEY: "re_test",
      LEAD_EMAIL: "contact@mapletech.ae",
      LEAD_FROM_EMAIL: "leads@smarthaus.ae",
    };
    send.mockResolvedValue({ data: { id: "sent" }, error: null });
  });

  afterAll(() => {
    process.env = env;
  });

  it("sends the lead and confirms", async () => {
    const result = await submitEnquiry(initial, validForm());

    expect(result.status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);

    const payload = send.mock.calls[0][0];
    expect(payload.to).toBe("contact@mapletech.ae");
    expect(payload.replyTo).toBe("nadia@example.com");
    // Normalised from the local 05… form the fixture posted.
    expect(payload.text).toContain("+971501234567");
  });

  it("omits reply-to when no email was given", async () => {
    const form = validForm();
    form.delete("email");

    await submitEnquiry(initial, form);

    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  /**
   * The one that matters. Resend reports failure in the payload instead of
   * rejecting, so without the explicit error check the lead sees a confirmation
   * for an email that was never sent.
   */
  it("reports failure when resend rejects the send", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "domain is not verified" },
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitEnquiry(initial, validForm());

    expect(result.status).toBe("failed");
  });

  it("reports failure rather than sending when config is missing", async () => {
    delete process.env.RESEND_API_KEY;
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitEnquiry(initial, validForm());

    expect(result.status).toBe("failed");
    expect(send).not.toHaveBeenCalled();
  });

  /**
   * A validation error must cost the visitor a correction, never their typing.
   * Losing a filled form on a bad phone number is how an enquiry is abandoned.
   */
  it("hands back what was typed when validation fails", async () => {
    const form = validForm({ phone: "not a phone", community: "Al Barari" });

    const result = await submitEnquiry(initial, form);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("unreachable");

    expect(result.values.name).toBe("Nadia Rahman");
    expect(result.values.community).toBe("Al Barari");
    expect(result.values.message).toBe("Two villas in Al Barari.");
    // The raw string, not a normalised one — the visitor sees what they typed.
    expect(result.values.phone).toBe("not a phone");
    // Consent is never echoed: re-ticking it for them would record agreement
    // they did not give on this submission.
    expect(result.values).not.toHaveProperty("contactConsent");
  });

  it("hands back what was typed when the send fails", async () => {
    send.mockResolvedValue({ data: null, error: { name: "api_error", message: "down" } });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitEnquiry(initial, validForm());

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("unreachable");
    expect(result.values.name).toBe("Nadia Rahman");
  });

  it("does not send when the honeypot is filled", async () => {
    const form = validForm();
    form.set(HONEYPOT_FIELD, "bot");

    const result = await submitEnquiry(initial, form);

    expect(result.status).toBe("ok");
    expect(send).not.toHaveBeenCalled();
  });
});

/** The lead email's plain-text body from the one send a test made. */
function sentText(): string {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0].text as string;
}

/** The value printed after a label in the consent block, trimmed. */
function field(text: string, label: string): string | undefined {
  const line = text.split("\n").find((candidate) => candidate.startsWith(`${label}:`));
  return line?.slice(label.length + 1).trim();
}

describe("the consent record in the lead email", () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      RESEND_API_KEY: "re_test",
      LEAD_EMAIL: "contact@mapletech.ae",
      LEAD_FROM_EMAIL: "leads@smarthaus.ae",
    };
    send.mockResolvedValue({ data: { id: "sent" }, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = env;
  });

  it("records the contact tick as given on the full form", async () => {
    await submitEnquiry(initial, validForm());
    expect(field(sentText(), "Contact about this enquiry")).toBe("yes, ticked");
  });

  it("records marketing as declined when the box was left alone", async () => {
    await submitEnquiry(initial, validForm());
    expect(field(sentText(), "Marketing")).toBe("no");
  });

  it("records marketing as given when it was ticked", async () => {
    await submitEnquiry(initial, validForm({ marketingConsent: "on" }));
    expect(field(sentText(), "Marketing")).toBe("yes, ticked");
  });

  it("never records a marketing yes from anything but the literal 'on'", async () => {
    // A tampered payload is refused outright rather than recorded as a yes.
    const result = await submitEnquiry(initial, validForm({ marketingConsent: "true" }));
    expect(result.status).toBe("invalid");
    expect(send).not.toHaveBeenCalled();
  });

  it("names the privacy policy version the visitor was shown", async () => {
    await submitEnquiry(initial, validForm());
    expect(field(sentText(), "Privacy policy shown")).toBe(PRIVACY_POLICY_VERSION);
  });

  it("stamps the send time in UTC ISO form", async () => {
    jest.useFakeTimers({ now: new Date("2026-09-26T09:15:00.000Z") });
    await submitEnquiry(initial, validForm());
    expect(field(sentText(), "Sent at")).toBe("2026-09-26T09:15:00.000Z");
  });

  it("keeps the consent block after the message, so a long message cannot bury it", async () => {
    await submitEnquiry(initial, validForm({ message: "Line one\nLine two\nLine three" }));
    const text = sentText();
    expect(text.indexOf("Consent, as recorded when this was sent:")).toBeGreaterThan(
      text.indexOf("Line three"),
    );
  });

  it("records 'not asked' for both on the short form, never a yes or a no", async () => {
    const form = new FormData();
    form.set("name", "James Carter");
    form.set("phone", "+971 50 123 4567");
    await submitShortEnquiry(initial, form);
    const text = sentText();
    expect(field(text, "Contact about this enquiry")).toBe("not asked (short form, notice only)");
    expect(field(text, "Marketing")).toBe("not asked (short form, notice only)");
    expect(field(text, "Privacy policy shown")).toBe(PRIVACY_POLICY_VERSION);
  });

  it("ignores consent fields posted to the short form, which never asks for them", async () => {
    // The short action decides its schema on the server; a forged tick is not
    // evidence of consent the visitor was never shown a box for.
    const form = new FormData();
    form.set("name", "James Carter");
    form.set("phone", "+971 50 123 4567");
    form.set("contactConsent", "on");
    form.set("marketingConsent", "on");
    await submitShortEnquiry(initial, form);
    const text = sentText();
    expect(field(text, "Contact about this enquiry")).toBe("not asked (short form, notice only)");
    expect(field(text, "Marketing")).toBe("not asked (short form, notice only)");
  });
});

describe("submitShortEnquiry", () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      RESEND_API_KEY: "re_test",
      LEAD_EMAIL: "contact@mapletech.ae",
      LEAD_FROM_EMAIL: "leads@smarthaus.ae",
    };
    send.mockResolvedValue({ data: { id: "sent" }, error: null });
  });

  afterAll(() => {
    process.env = env;
  });

  function shortForm(overrides: Record<string, string> = {}): FormData {
    const data = new FormData();
    data.set("name", "James Carter");
    data.set("phone", "050 123 4567");
    data.set("email", "james@example.com");
    data.set("message", "A villa on the Palm.");
    for (const [key, value] of Object.entries(overrides)) data.set(key, value);
    return data;
  }

  it("sends a valid short enquiry and confirms with the normalised phone", async () => {
    const result = await submitShortEnquiry(initial, shortForm());
    expect(result).toEqual({ status: "ok", name: "James Carter", phone: "+971501234567" });
    expect(sentText()).toContain("Phone:     +971501234567");
  });

  it("needs no interest and no consent tick", async () => {
    const result = await submitShortEnquiry(initial, shortForm());
    expect(result.status).toBe("ok");
    expect(sentText()).toContain("Interest:  not given");
  });

  it("sends with only name and phone, the two required fields", async () => {
    const form = new FormData();
    form.set("name", "James Carter");
    form.set("phone", "0501234567");
    const result = await submitShortEnquiry(initial, form);
    expect(result.status).toBe("ok");
    const text = sentText();
    expect(text).toContain("Email:     not given");
    expect(text).toContain("Community: not given");
    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it.each([
    ["name", "", "Add your name so we know who we're calling."],
    ["name", "   ", "Add your name so we know who we're calling."],
    ["phone", "", "Add a phone number so we can call you back."],
    ["phone", "+44 20 7946 0000", "Check the number. It should start with +971 or 05."],
    ["email", "not-an-email", "Check the email address."],
  ])("refuses %s=%j with the field's own message", async (key, value, message) => {
    const result = await submitShortEnquiry(initial, shortForm({ [key]: value }));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("unreachable");
    expect(result.fieldErrors).toEqual({ [key]: message });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports every failing field at once, one message each", async () => {
    const result = await submitShortEnquiry(
      initial,
      shortForm({ name: "", phone: "", email: "nope" }),
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("unreachable");
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["email", "name", "phone"]);
  });

  it("keeps the first issue when a field fails more than one rule", async () => {
    // An empty phone fails min(1) before the format refinement is reached.
    const result = await submitShortEnquiry(initial, shortForm({ phone: "" }));
    if (result.status !== "invalid") throw new Error("unreachable");
    expect(result.fieldErrors.phone).toBe("Add a phone number so we can call you back.");
  });

  it("hands back what was typed when validation fails", async () => {
    const result = await submitShortEnquiry(initial, shortForm({ phone: "12" }));
    if (result.status !== "invalid") throw new Error("unreachable");
    expect(result.values.name).toBe("James Carter");
    expect(result.values.phone).toBe("12");
    expect(result.values.message).toBe("A villa on the Palm.");
  });

  it("answers a filled honeypot with the success shape and sends nothing", async () => {
    const result = await submitShortEnquiry(initial, shortForm({ [HONEYPOT_FIELD]: "bot" }));
    expect(result).toEqual({ status: "ok", name: "", phone: "" });
    expect(send).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only honeypot as empty, so autofill spaces do not eat a lead", async () => {
    const result = await submitShortEnquiry(initial, shortForm({ [HONEYPOT_FIELD]: "   " }));
    expect(result.status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("checks the honeypot before validation, so a bot learns nothing from errors", async () => {
    const result = await submitShortEnquiry(
      initial,
      shortForm({ [HONEYPOT_FIELD]: "bot", name: "", phone: "" }),
    );
    expect(result.status).toBe("ok");
  });

  it("reports failure when Resend rejects the send", async () => {
    send.mockResolvedValue({ data: null, error: { name: "api_error", message: "down" } });
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await submitShortEnquiry(initial, shortForm());
    expect(result.status).toBe("failed");
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("reports failure when the send throws", async () => {
    send.mockRejectedValue(new Error("socket hang up"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await submitShortEnquiry(initial, shortForm());
    expect(result.status).toBe("failed");
  });

  it.each(["RESEND_API_KEY", "LEAD_EMAIL", "LEAD_FROM_EMAIL"])(
    "reports failure without sending when %s is missing",
    async (key) => {
      delete process.env[key];
      jest.spyOn(console, "error").mockImplementation(() => {});
      const result = await submitShortEnquiry(initial, shortForm());
      expect(result.status).toBe("failed");
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("never puts the error detail in what the browser receives", async () => {
    send.mockResolvedValue({ data: null, error: { name: "auth", message: "re_secret_key" } });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await submitShortEnquiry(initial, shortForm());
    expect(JSON.stringify(result)).not.toContain("re_secret_key");
  });

  it("addresses the email from the configured sender to the lead mailbox", async () => {
    await submitShortEnquiry(initial, shortForm());
    const payload = send.mock.calls[0][0];
    expect(payload.from).toBe("Smarthaus enquiries <leads@smarthaus.ae>");
    expect(payload.to).toBe("contact@mapletech.ae");
    expect(payload.subject).toBe("New enquiry — James Carter");
    expect(payload.replyTo).toBe("james@example.com");
  });
});

describe("the e2e mail sink", () => {
  const env = process.env;
  let dir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    dir = mkdtempSync(join(tmpdir(), "mail-sink-"));
    process.env = { ...env };
    // Start from neither switch, whatever the shell running Jest has set.
    delete process.env.PLAYWRIGHT;
    delete process.env.E2E_MAIL_SINK;
    delete process.env.RESEND_API_KEY;
    delete process.env.LEAD_EMAIL;
    delete process.env.LEAD_FROM_EMAIL;
    send.mockResolvedValue({ data: { id: "sent" }, error: null });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = env;
  });

  const written = () =>
    readdirSync(dir).map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")));

  it("writes the email to the sink instead of sending it, under Playwright", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    const result = await submitEnquiry(initial, validForm());
    expect(result.status).toBe("ok");
    expect(send).not.toHaveBeenCalled();
    const [email] = written();
    expect(email.subject).toBe("New enquiry — Nadia Rahman");
    expect(email.replyTo).toBe("nadia@example.com");
    expect(email.text).toContain("Phone:     +971501234567");
    expect(email.text).toContain("Contact about this enquiry: yes, ticked");
  });

  it("works without any Resend configuration, so local e2e needs no keys", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    const result = await submitEnquiry(initial, validForm());
    expect(result.status).toBe("ok");
    expect(written()).toHaveLength(1);
  });

  it("records the configured addresses when they are set", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    process.env.LEAD_EMAIL = "contact@mapletech.ae";
    process.env.LEAD_FROM_EMAIL = "leads@smarthaus.ae";
    await submitEnquiry(initial, validForm());
    const [email] = written();
    expect(email.to).toBe("contact@mapletech.ae");
    expect(email.from).toBe("Smarthaus enquiries <leads@smarthaus.ae>");
  });

  it("is ignored without PLAYWRIGHT, so a stray sink setting cannot divert a real lead", async () => {
    process.env.E2E_MAIL_SINK = dir;
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEAD_EMAIL = "contact@mapletech.ae";
    process.env.LEAD_FROM_EMAIL = "leads@smarthaus.ae";
    await submitEnquiry(initial, validForm());
    expect(send).toHaveBeenCalledTimes(1);
    expect(written()).toHaveLength(0);
  });

  it("is ignored unless PLAYWRIGHT is exactly '1'", async () => {
    process.env.PLAYWRIGHT = "true";
    process.env.E2E_MAIL_SINK = dir;
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEAD_EMAIL = "contact@mapletech.ae";
    process.env.LEAD_FROM_EMAIL = "leads@smarthaus.ae";
    await submitEnquiry(initial, validForm());
    expect(send).toHaveBeenCalledTimes(1);
    expect(written()).toHaveLength(0);
  });

  it("sends for real under Playwright when no sink is set, as the delivery job does", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEAD_EMAIL = "contact@mapletech.ae";
    process.env.LEAD_FROM_EMAIL = "leads@smarthaus.ae";
    await submitEnquiry(initial, validForm());
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("creates the sink directory if it does not exist yet", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = join(dir, "nested", "mail");
    await submitEnquiry(initial, validForm());
    expect(readdirSync(join(dir, "nested", "mail"))).toHaveLength(1);
  });

  it("gives every email its own file, even when several arrive at once", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => submitEnquiry(initial, validForm({ name: `Lead ${i}` }))),
    );
    expect(
      written()
        .map((email) => email.subject)
        .sort(),
    ).toEqual(["Lead 0", "Lead 1", "Lead 2", "Lead 3", "Lead 4"].map((n) => `New enquiry — ${n}`));
  });

  it("writes the short form's email too, with its 'not asked' consent record", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    const form = new FormData();
    form.set("name", "James Carter");
    form.set("phone", "0501234567");
    await submitShortEnquiry(initial, form);
    const [email] = written();
    expect(email.text).toContain("Marketing:                  not asked (short form, notice only)");
    expect(email).not.toHaveProperty("replyTo");
  });

  it("writes nothing for a caught bot or an invalid submission", async () => {
    process.env.PLAYWRIGHT = "1";
    process.env.E2E_MAIL_SINK = dir;
    await submitEnquiry(initial, validForm({ [HONEYPOT_FIELD]: "bot" }));
    await submitEnquiry(initial, validForm({ phone: "nope" }));
    expect(written()).toHaveLength(0);
  });

  it("reports failure when the sink cannot be written, like any failed send", async () => {
    process.env.PLAYWRIGHT = "1";
    // A file where the directory should be: mkdir fails.
    const blocker = join(dir, "blocker");
    writeFileSync(blocker, "");
    process.env.E2E_MAIL_SINK = join(blocker, "mail");
    jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await submitEnquiry(initial, validForm());
    expect(result.status).toBe("failed");
  });
});
