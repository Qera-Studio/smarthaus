import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ABOUT_FAQS, APPROACH, MISSION, VALUES, VISION } from "../about";
import { PARTNERS } from "../partners";

/**
 * The About copy makes promises a buyer will hold the company to, confirmed
 * by Shivanshu on 2026-10-07 (AGENTS.md, claims audit). These pin it, so a
 * change to a promise is a deliberate edit to this suite too, and keep out
 * what the house rules forbid: em dashes, superlatives, invented heritage.
 */

const all = [MISSION.lead, MISSION.body, VISION.lead, VISION.body].concat(
  VALUES.flatMap((value) => [value.title, value.body]),
  APPROACH.flatMap((step) => [step.title, step.body]),
  ABOUT_FAQS.flatMap((entry) => [entry.question, ...entry.answer]),
);

describe("About content", () => {
  it("states the mission as one team for the whole home", () => {
    expect(MISSION.lead).toBe(
      "To make one company responsible for everything that runs your home.",
    );
    expect(MISSION.body).toMatch(/design, install and maintain the whole system ourselves/);
  });

  it("states the vision as a home that asks nothing", () => {
    expect(VISION.lead).toBe("A home that asks nothing of you.");
  });

  it("has the five values, in the mockup's order", () => {
    expect(VALUES.map((value) => value.title)).toEqual([
      "We finish what we start.",
      "We say what we can't do.",
      "The work is in the walls.",
      "Your home stays private.",
      "We'd rather visit than guess.",
    ]);
  });

  it("keeps the privacy and visit promises word for word", () => {
    const body = (title: string) => VALUES.find((value) => value.title === title)!.body;
    expect(body("Your home stays private.")).toContain(
      "We don't photograph finished homes, publish addresses or share plans. Footage stays on equipment in your house.",
    );
    expect(body("We'd rather visit than guess.")).toBe(
      "No quote leaves without someone standing in the house first.",
    );
  });

  it("has the six approach steps, in the mockup's order", () => {
    expect(APPROACH.map((step) => step.title)).toEqual([
      "We start at the boundary.",
      "We visit before we quote.",
      "We work with what's there.",
      "We design for the people, not specs.",
      "We document everything.",
      "We stay afterwards.",
    ]);
  });

  it("keeps the visit's confirmed facts word for word", () => {
    // Confirmed by Shivanshu, 2026-10-07: who visits, for how long, and what
    // kind of price follows.
    const visit = APPROACH.find((step) => step.title === "We visit before we quote.")!.body;
    expect(visit).toContain("A technician and a technical lead spend about 90 minutes");
    expect(visit).toContain("fixed and itemised, not an estimate");
  });

  it("gives card 4 its own text, not card 1's again", () => {
    // The mockup repeated card 1's body under card 4; Shivanshu sent the real
    // one the same day.
    const bodies = APPROACH.map((step) => step.body);
    expect(new Set(bodies).size).toBe(bodies.length);
    expect(APPROACH[3]!.body).toMatch(/^A system that needs an expert to operate has failed\./);
  });

  it("gives every step an icon that exists, used once", () => {
    const icons = APPROACH.map((step) => step.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", "about", "icons", icon))).toBe(true);
    }
  });

  describe("FAQ", () => {
    const answer = (id: string) => ABOUT_FAQS.find((entry) => entry.id === id)!.answer.join(" ");

    it("asks five questions with unique, stable ids", () => {
      const ids = ABOUT_FAQS.map((entry) => entry.id);
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    });

    it("states both licence numbers exactly as the schema does", () => {
      const schema = readFileSync(
        join(process.cwd(), "src", "components", "Schema", "schema.ts"),
        "utf8",
      );
      for (const licence of ["SSP202210037219", "897839"]) {
        expect(schema).toContain(licence);
        expect(answer("who-is-behind-smarthaus")).toContain(licence);
      }
    });

    it("names only the partners partners.ts confirms", () => {
      const named = answer("what-do-you-install");
      for (const partner of PARTNERS) expect(named).toContain(partner.name);
    });

    it("repeats the handover and privacy promises, adding nothing", () => {
      expect(answer("what-do-i-keep")).toContain("never locked to us");
      expect(answer("is-my-home-private")).toContain(
        "camera footage stays on equipment in your house",
      );
    });

    it("leaves no answer pending, so none needs a placeholder", () => {
      for (const entry of ABOUT_FAQS) expect(entry.pending).toBeUndefined();
    });
  });

  it("gives every value a title and a body", () => {
    for (const value of VALUES) {
      expect(value.title).toMatch(/\.$/);
      expect(value.body.length).toBeGreaterThan(20);
    }
  });

  it("keeps value titles unique, since each is the list key", () => {
    const titles = VALUES.map((value) => value.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("uses no em dash", () => {
    for (const text of all) expect(text).not.toMatch(/\u2014/);
  });

  it.each([
    /!/,
    /\bbest-in-class\b/i,
    /\bleading\b/i,
    /\bcutting-edge\b/i,
    /\byears of\b/i,
    /\bsince \d{4}\b/i,
  ])("claims nothing the brand cannot evidence (%s)", (pattern) => {
    for (const text of all) expect(text).not.toMatch(pattern);
  });
});
