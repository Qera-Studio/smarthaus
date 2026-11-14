/**
 * @jest-environment node
 */

/**
 * The homepage hero's email field (2026-11-14): an address alone, sent as a
 * lead at once. It runs through the same handle() as the two forms, so what is
 * tested is what differs: the schema it is checked against, the email the
 * inbox receives with no name or phone, and that the shared guards (honeypot,
 * rate limit, duplicates) still stand in front of it.
 */

const send = jest.fn();

let pinnedIp: string | undefined;
let ipCounter = 0;
jest.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-for": pinnedIp ?? `203.0.113.${(ipCounter += 1) % 250}, 10.0.0.1`,
    }),
}));

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send } })),
}));

import { submitHeroLead } from "../actions";
import { HONEYPOT_FIELD } from "../../../lib/contact-schema";
import { enquiryDedupe } from "../../../lib/dedupe";
import { enquiryLimiter } from "../../../lib/rate-limit";
import type { ContactState } from "../state";

const initial: ContactState = { status: "idle" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const env = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  enquiryDedupe.clear();
  pinnedIp = undefined;
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

describe("submitHeroLead", () => {
  it("sends an address alone as a lead, and confirms", async () => {
    const result = await submitHeroLead(initial, form({ email: "james@example.com" }));
    expect(result).toEqual({ status: "ok", name: "", phone: "" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("names the lead by its address, since it has no name", async () => {
    await submitHeroLead(initial, form({ email: "james@example.com" }));
    const payload = send.mock.calls[0][0];
    expect(payload.subject).toBe("New enquiry — james@example.com");
    expect(payload.replyTo).toBe("james@example.com");
    expect(payload.to).toBe("contact@mapletech.ae");
  });

  it("says plainly what it was not given", async () => {
    await submitHeroLead(initial, form({ email: "james@example.com" }));
    const text: string = send.mock.calls[0][0].text;
    expect(text).toContain("Name:      not given");
    expect(text).toContain("Phone:     not given");
    expect(text).toContain("Email:     james@example.com");
    expect(text).toContain("Message:\nnot given");
  });

  it("records that consent was not asked, the notice-only basis", async () => {
    await submitHeroLead(initial, form({ email: "james@example.com" }));
    const text: string = send.mock.calls[0][0].text;
    expect(text).toContain("Contact about this enquiry: not asked (short form, notice only)");
    expect(text).toContain("Marketing:                  not asked (short form, notice only)");
  });

  it("trims the address before it is sent", async () => {
    await submitHeroLead(initial, form({ email: "  james@example.com  " }));
    expect(send.mock.calls[0][0].replyTo).toBe("james@example.com");
  });

  it.each([
    ["", "Add your email so we can reply."],
    ["   ", "Add your email so we can reply."],
    ["james", "Check the email address."],
    ["james@", "Check the email address."],
    ["@example.com", "Check the email address."],
    [`${"a".repeat(250)}@x.ae`, "Check the email address."],
  ])("refuses %p and says why, sending nothing", async (email, message) => {
    const result = await submitHeroLead(initial, form({ email }));
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { email: message },
      values: email ? { email } : {},
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a submission with no address field at all", async () => {
    const result = await submitHeroLead(initial, form({}));
    expect(result).toMatchObject({ status: "invalid" });
    expect(send).not.toHaveBeenCalled();
  });

  it("reads only the address: a name or phone posted with it is not sent", async () => {
    await submitHeroLead(
      initial,
      form({ email: "james@example.com", name: "Injected", phone: "0501234567", message: "x" }),
    );
    const text: string = send.mock.calls[0][0].text;
    expect(text).not.toContain("Injected");
    expect(text).not.toContain("0501234567");
  });

  it("answers a filled honeypot as a success and sends nothing", async () => {
    const result = await submitHeroLead(
      initial,
      form({ email: "bot@example.com", [HONEYPOT_FIELD]: "Acme" }),
    );
    expect(result).toEqual({ status: "ok", name: "", phone: "" });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends the same address once, however many times it is posted", async () => {
    pinnedIp = "203.0.113.7";
    await submitHeroLead(initial, form({ email: "james@example.com" }));
    const again = await submitHeroLead(initial, form({ email: "james@example.com" }));
    expect(again.status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("shares the forms' rate limit", async () => {
    pinnedIp = "203.0.113.99";
    const results: ContactState[] = [];
    for (let i = 0; i < 7; i += 1) {
      results.push(await submitHeroLead(initial, form({ email: `lead${i}@example.com` })));
    }
    expect(results.filter((r) => r.status === "ok").length).toBeLessThanOrEqual(5);
    expect(results.at(-1)).toMatchObject({ status: "failed", reason: "rate-limited" });
    expect(enquiryLimiter).toBeDefined();
  });

  it("reports a refused send as a failure, keeping what was typed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "no" } });
    const result = await submitHeroLead(initial, form({ email: "james@example.com" }));
    expect(result).toEqual({ status: "failed", values: { email: "james@example.com" } });
    expect(console.error).toHaveBeenCalledWith("[contact] delivery failed", expect.any(Error));
  });
});
