import { MISSION, VALUES, VISION } from "../about";

/**
 * The About copy makes promises a buyer will hold the company to, confirmed
 * by Shivanshu on 2026-10-07 (AGENTS.md, claims audit). These pin it, so a
 * change to a promise is a deliberate edit to this suite too, and keep out
 * what the house rules forbid: em dashes, superlatives, invented heritage.
 */

const all = [MISSION.lead, MISSION.body, VISION.lead, VISION.body].concat(
  VALUES.flatMap((value) => [value.title, value.body]),
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
