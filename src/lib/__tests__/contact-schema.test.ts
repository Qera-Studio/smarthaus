/**
 * @jest-environment node
 */
import { contactSchema, INTERESTS } from "@/lib/contact-schema";

/**
 * The error strings are asserted verbatim, not by shape. They are the copy the
 * user reads, so a reworded message is a content change that should be made
 * deliberately and not slip through as a passing test.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const valid = (): any => ({
  name: "Nadia",
  phone: "+971 54 375 5150",
  email: "nadia@example.com",
  community: "Dubai Hills",
  message: "Six villas next year.",
  interest: INTERESTS[0],
  // "on" is what a ticked checkbox posts. Required, so every valid fixture
  // carries it — see the contactConsent note in contact-schema.ts for why that
  // requirement is contested and how it would be relaxed.
  contactConsent: "on",
  // Absent rather than "on": marketing is optional and must never be
  // pre-ticked, so the default fixture is the untouched state.
  marketingConsent: undefined,
});

describe("contact schema", () => {
  it("accepts a complete, valid enquiry", () => {
    expect(contactSchema.safeParse(valid()).success).toBe(true);
  });

  it("accepts an enquiry with only the two required fields", () => {
    const result = contactSchema.safeParse({
      name: "Ravi",
      phone: "0543755150",
      email: "",
      community: "",
      message: "",
      interest: INTERESTS[2],
      contactConsent: "on",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name with the supplied wording", () => {
    const input = valid();
    input.name = "";
    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Add your name so we know who we're calling.");
  });

  it("treats a whitespace-only name as missing", () => {
    const input = valid();
    input.name = "   ";
    expect(contactSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a missing phone with the supplied wording", () => {
    const input = valid();
    input.phone = "";
    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Add a phone number so we can call you back.");
  });

  it.each([
    ["+445551234567", "non-UAE country code"],
    ["543755150", "no leading 0 or +971"],
    ["+97154375515", "one digit short"],
    ["+9715437551500", "one digit long"],
    ["not a phone", "letters"],
  ])("rejects %s (%s) with the format message", (phone) => {
    const input = valid();
    input.phone = phone;
    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Check the number. It should start with +971 or 05.",
    );
  });

  it.each([
    "+971543755150",
    "+971 54 375 5150",
    "+971-54-375-5150",
    "0543755150",
    "054 375 5150",
    "00971543755150",
    "971543755150",
  ])("canonicalises %s to one E.164 value", (written) => {
    const input = valid();
    input.phone = written;
    // Every way of writing this number must produce ONE record. The value that
    // survives is what gets logged, emailed, and read back to the visitor.
    expect(contactSchema.safeParse(input).data?.phone).toBe("+971543755150");
  });

  it("rejects a malformed email when one is given", () => {
    const input = valid();
    input.email = "nadia@";
    expect(contactSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an interest outside the published list", () => {
    const input = valid();
    input.interest = "Something we never offered";
    expect(contactSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a missing interest", () => {
    const input = valid();
    delete input.interest;
    expect(contactSchema.safeParse(input).success).toBe(false);
  });

  describe("consent fields", () => {
    it("rejects a submission with the contact box unticked", () => {
      // An unticked box is ABSENT from FormData, which is the case that
      // matters: the schema must not read a missing key as agreement.
      const input = valid();
      delete input.contactConsent;
      const result = contactSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Please confirm you would like us to contact you about your enquiry.",
      );
    });

    it("does not accept a stray truthy value as consent", () => {
      // Only the literal "on" is a tick. A hand-crafted payload saying
      // "true", "1" or "yes" is not a checkbox a person clicked.
      for (const value of ["true", "1", "yes", "false"]) {
        const input = valid();
        input.contactConsent = value;
        expect(contactSchema.safeParse(input).success).toBe(false);
      }
    });

    it("treats marketing as optional and defaults it to false", () => {
      // Never required, never gates submission. Legal §6 keeps marketing
      // consent distinct from service consent, and an absent box is a "no".
      const input = valid();
      delete input.marketingConsent;
      const result = contactSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data?.marketingConsent).toBe(false);
    });

    it("records marketing consent when it is given", () => {
      const input = valid();
      input.marketingConsent = "on";
      expect(contactSchema.safeParse(input).data?.marketingConsent).toBe(true);
    });

    it("keeps the two consents independent", () => {
      // Bundling them is what "no bundled consent" prohibits, so declining
      // marketing must not affect the enquiry, and vice versa.
      const marketingOnly = valid();
      delete marketingOnly.contactConsent;
      marketingOnly.marketingConsent = "on";
      expect(contactSchema.safeParse(marketingOnly).success).toBe(false);

      const contactOnly = valid();
      contactOnly.marketingConsent = undefined;
      const result = contactSchema.safeParse(contactOnly);
      expect(result.success).toBe(true);
      expect(result.data?.contactConsent).toBe(true);
      expect(result.data?.marketingConsent).toBe(false);
    });
  });
});
