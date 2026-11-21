/**
 * @jest-environment node
 */
import { claimProblem, claimsRule } from "../claims";

describe("the claims audit, in the Studio", () => {
  it.each([
    ["A certified TIS partner", "tier"],
    ["Fibaro authorised dealer", "tier"],
    ["Our authorized installer team", "tier"],
    ["A platinum partner of TIS", "partner tier"],
    ["Award-winning installations", "award"],
    ["Fifteen years of experience", "track record"],
    ["Trusted by hundreds of families", "trusted by"],
    ["Industry-leading support", "superlative"],
    ["Market leading systems", "superlative"],
    ["World-class engineering", "superlative"],
    ["Best-in-class audio", "superlative"],
    ["Cutting-edge automation", "tone of voice"],
    ["A revolutionary approach", "tone of voice"],
    ["State-of-the-art cameras", "superlative"],
    ["Dubai's number one installer", "ranking"],
    ["The #1 choice", "ranking"],
    ["Unmatched service", "superlative"],
    ["Book a visit today!", "exclamation"],
    ["One team — one number", "em dash"],
  ])("refuses %p", (text, reason) => {
    expect(claimProblem(text)).toContain(reason);
    expect(claimProblem(text)).toContain("claims audit");
  });

  it.each([
    "The best system is the one you stop noticing.",
    "As a TIS partner, Smarthaus installs and sets up TIS systems.",
    "We cannot guarantee a response time.",
    "180+ Dubai projects",
    "Everything in Standard Care, plus priority response within 6 hours.",
  ])("lets honest copy through: %p", (text) => {
    expect(claimProblem(text)).toBeNull();
  });

  it("answers the Studio as a validator does: true, or the reason", () => {
    expect(claimsRule("Plain words.")).toBe(true);
    expect(claimsRule("Revolutionary!")).toMatch(/^This makes/);
  });

  it("ignores what is not text, which the field's own rules handle", () => {
    expect(claimsRule(undefined)).toBe(true);
    expect(claimsRule(3)).toBe(true);
  });
});
