// The footer's social links. Four of five point at a platform's home page
// until the real profiles exist. These keep the label honest about that, and
// make going live a deliberate change rather than a silent one.
import { SOCIALS } from "../socials";

const SUFFIX = " (profile coming soon)";

/** A platform's bare home page: https, no path beyond "/", no query. */
function isBareHomePage(href: string): boolean {
  const url = new URL(href);
  return url.protocol === "https:" && (url.pathname === "/" || url.pathname === "") && !url.search;
}

const pending = SOCIALS.filter((social) => social.pending);
const live = SOCIALS.filter((social) => !social.pending);

describe("footer socials", () => {
  it("lists the five platforms in the designed order", () => {
    expect(SOCIALS.map((social) => social.id)).toEqual([
      "whatsapp",
      "instagram",
      "facebook",
      "x",
      "linkedin",
    ]);
  });

  it("gives every link a unique id", () => {
    expect(new Set(SOCIALS.map((social) => social.id)).size).toBe(SOCIALS.length);
  });

  it("names the brand and the platform in every label", () => {
    for (const social of SOCIALS) expect(social.label).toMatch(/^Smarthaus on \S/);
  });

  it("gives every link an https href", () => {
    for (const social of SOCIALS) expect(new URL(social.href).protocol).toBe("https:");
  });

  it("gives every icon a non-empty path", () => {
    for (const social of SOCIALS) expect(social.path.trim()).toMatch(/^M/);
  });

  it("keeps WhatsApp live: it is the one real channel", () => {
    const whatsapp = SOCIALS.find((social) => social.id === "whatsapp")!;
    expect(whatsapp.pending).toBeUndefined();
    expect(whatsapp.href).toMatch(/^https:\/\/wa\.me\/\d+$/);
    expect(whatsapp.label).toBe("Smarthaus on WhatsApp");
  });

  it("still has four placeholder profiles; this fails when the first real one lands", () => {
    // Replacing a placeholder is meant to fail here, so the change that brings
    // a real profile URL also updates this count and clears `pending`.
    expect(pending.map((social) => social.id)).toEqual(["instagram", "facebook", "x", "linkedin"]);
  });

  describe.each(pending.map((social) => [social.id, social] as const))(
    "pending %s",
    (_id, social) => {
      it("points at the platform's bare home page, never at a real profile", () => {
        // A real URL left marked pending would still announce "coming soon".
        expect(isBareHomePage(social.href)).toBe(true);
      });

      it("says the profile is coming soon in its accessible name", () => {
        expect(social.label.endsWith(SUFFIX)).toBe(true);
      });

      it("says it once", () => {
        expect(social.label.split(SUFFIX)).toHaveLength(2);
      });
    },
  );

  describe.each(live.map((social) => [social.id, social] as const))("live %s", (_id, social) => {
    it("points at a specific profile, not a platform's home page", () => {
      // Clearing `pending` without a real URL fails here.
      expect(isBareHomePage(social.href)).toBe(false);
    });

    it("does not claim to be coming soon", () => {
      expect(social.label).not.toContain("coming soon");
    });
  });
});
