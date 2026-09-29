/**
 * @jest-environment node
 */

// public/.well-known/security.txt, RFC 9116. Security System §13: a researcher
// who finds a bug needs a way to report it that is not posting it publicly.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL } from "../../lib/contact";

const file = readFileSync(join(process.cwd(), "public/.well-known/security.txt"), "utf8");
const fields = Object.fromEntries(
  file
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf(": ");
      return [line.slice(0, at), line.slice(at + 2)];
    }),
);

describe("security.txt", () => {
  it("names a contact at the published address", () => {
    expect(fields.Contact).toBe(`mailto:${EMAIL}`);
  });

  it("carries an Expires in ISO 8601, as RFC 9116 requires", () => {
    expect(fields.Expires).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("expires no more than a year out, as RFC 9116 recommends", () => {
    const days = (Date.parse(fields.Expires!) - Date.parse("2026-09-26T00:00:00Z")) / 86_400_000;
    expect(days).toBeLessThanOrEqual(366);
  });

  it("has more than 30 days left: renew it, with a new date, when this fails", () => {
    // A deliberate reminder. An expired security.txt tells researchers the
    // contact may be dead, which is worse than none.
    const left = (Date.parse(fields.Expires!) - Date.now()) / 86_400_000;
    expect(left).toBeGreaterThan(30);
  });

  it("states its canonical URL and preferred language", () => {
    expect(fields.Canonical).toBe("https://smarthaus.ae/.well-known/security.txt");
    expect(fields["Preferred-Languages"]).toBe("en");
  });

  it("uses only fields RFC 9116 defines", () => {
    const known = [
      "Acknowledgments",
      "Canonical",
      "Contact",
      "Encryption",
      "Expires",
      "Hiring",
      "Policy",
      "Preferred-Languages",
    ];
    for (const name of Object.keys(fields)) expect(known).toContain(name);
  });
});
