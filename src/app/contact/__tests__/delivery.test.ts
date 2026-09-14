/**
 * @jest-environment node
 */

/**
 * The send path. Resend is mocked, so this never touches the network and needs
 * no API key — what it guards is the wiring around the send: that a rejected
 * send surfaces as "failed" rather than a false confirmation, and that the
 * lead's own address becomes the reply-to.
 */

const send = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send } })),
}));

// Imported after the mock is registered, since the action pulls in Resend.
import { submitEnquiry } from "../actions";
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
