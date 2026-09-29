/**
 * @jest-environment node
 */
import { checkConfig, REQUIRED_VARIABLES } from "../runtime-config";

const good = {
  RESEND_API_KEY: "re_AbC123_xyz7890",
  LEAD_EMAIL: "contact@mapletech.ae",
  LEAD_FROM_EMAIL: "leads@smarthaus.ae",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "971543755150",
};

describe("checkConfig", () => {
  it("checks exactly the four variables production needs", () => {
    expect(REQUIRED_VARIABLES).toEqual([
      "RESEND_API_KEY",
      "LEAD_EMAIL",
      "LEAD_FROM_EMAIL",
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
    ]);
  });

  it("finds nothing wrong with a complete configuration", () => {
    expect(checkConfig(good)).toEqual([]);
  });

  it("names every missing variable", () => {
    expect(checkConfig({})).toEqual(
      REQUIRED_VARIABLES.map((variable) => ({ variable, problem: "is not set" })),
    );
  });

  it.each(REQUIRED_VARIABLES)("treats a blank %s as not set", (variable) => {
    expect(checkConfig({ ...good, [variable]: "   " })).toEqual([
      { variable, problem: "is not set" },
    ]);
  });

  it.each([
    ["RESEND_API_KEY", "sk_live_abcdef123456", "must be a Resend API key (re_…)"],
    ["RESEND_API_KEY", "re_short", "must be a Resend API key (re_…)"],
    ["LEAD_EMAIL", "not-an-email", "must be the mailbox leads are sent to"],
    [
      "LEAD_FROM_EMAIL",
      "Smarthaus <leads@smarthaus.ae>",
      "must be an address on the domain verified in Resend",
    ],
    [
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
      "+971543755150",
      "must be the WhatsApp number as digits only, country code first, no +",
    ],
    [
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
      "0543755150",
      "must be the WhatsApp number as digits only, country code first, no +",
    ],
    [
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
      "97154 375 5150",
      "must be the WhatsApp number as digits only, country code first, no +",
    ],
  ])("explains a malformed %s (%j)", (variable, value, problem) => {
    expect(checkConfig({ ...good, [variable]: value })).toEqual([{ variable, problem }]);
  });

  it("tolerates surrounding whitespace, as a pasted value often has", () => {
    expect(checkConfig({ ...good, LEAD_EMAIL: " contact@mapletech.ae\n" })).toEqual([]);
  });

  it("never includes a value in what it reports", () => {
    const secret = "re_THIS_IS_SECRET_1234";
    const problems = checkConfig({ RESEND_API_KEY: "sk_" + secret, LEAD_EMAIL: secret });
    expect(JSON.stringify(problems)).not.toContain(secret);
  });
});
