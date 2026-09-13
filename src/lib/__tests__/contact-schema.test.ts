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
});
