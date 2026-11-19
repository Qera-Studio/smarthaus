import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { claimsRule } from "../../claims";
import { homePage } from "../../schema/home-page";
import type { SchemaField } from "../../schema/primitives";

/**
 * The standards section's copy (2026-11-16), drafted for Shivanshu's review.
 * What fails quietly: a claim past what is confirmed (the six standards are
 * installed in clients' homes; nothing about certification, figures or
 * prices), and the Studio losing the fields an editor fills.
 */

const COPY = HOME_PAGE.connectivity;
const fields = (homePage as { fields: SchemaField[] }).fields;
const section = fields.find((f) => f.name === "connectivity") as SchemaField & {
  fields: SchemaField[];
  group: string;
};

describe("the connectivity copy", () => {
  it("passes the claims audit, every field", () => {
    for (const value of Object.values(COPY)) expect(claimsRule(value)).toBe(true);
  });

  it("claims no certification or partnership, which the marks could imply", () => {
    const all = Object.values(COPY).join(" ");
    expect(all).not.toMatch(/certif|accredit|official|partner|approved|compliant/i);
  });

  it("quotes no figure and no price", () => {
    expect(Object.values(COPY).join(" ")).not.toMatch(/\d|AED|price/i);
  });

  it("names the standards only through their marks, so the two never disagree", () => {
    expect(COPY.lead).not.toMatch(/matter|zigbee|z-wave|wi-fi|bluetooth|coss/i);
    expect(COPY.lead).toMatch(/these standards/);
  });

  it("asks for the site visit, as the hero's button does", () => {
    expect(COPY.cta).toBe(HOME_PAGE.hero.visitCta);
  });
});

describe("the connectivity fields in the Studio", () => {
  it("are a tab of their own on the homepage, after the figures", () => {
    expect(section.group).toBe("connectivity");
    const groups = (homePage as { groups: { name: string }[] }).groups.map((g) => g.name);
    expect(groups.indexOf("connectivity")).toBe(groups.indexOf("stats") + 1);
  });

  it("are the heading, the line and the button, as copy an editor translates", () => {
    expect(section.fields.map((f) => [f.name, f.type])).toEqual([
      ["heading", "localeString"],
      ["lead", "localeText"],
      ["cta", "localeString"],
    ]);
  });

  it("sit after the figures and before the process, as the page draws them", () => {
    const names = fields.map((f) => f.name);
    expect(names.indexOf("connectivity")).toBe(names.indexOf("stats") + 1);
    expect(names.indexOf("process")).toBe(names.indexOf("connectivity") + 1);
  });
});
