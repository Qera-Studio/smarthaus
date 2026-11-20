import { readFileSync } from "node:fs";
import { join } from "node:path";

// The footer's social links. X points at the platform's home page until a
// real profile exists. These keep the label honest about that, and
// make going live a deliberate change rather than a silent one.
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { socialRule } from "../../../../src/sanity/schema/site-settings";
import { SOCIAL_ICONS } from "../socials";

// The profiles are content (siteSettings.socials); the glyphs are code. Joined
// here, as the footer joins them. The seed is what the ci dataset holds.
const SOCIALS = SITE_SETTINGS.socials.map((social) => ({
  ...social,
  ...(SOCIAL_ICONS[social.id] as { path?: string; src?: string }),
}));

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

  it("gives every icon a non-empty path or a logo file", () => {
    for (const social of SOCIALS) {
      if (social.src) expect(social.src).toMatch(/^\/[\w-]+\.svg$/);
      else expect(social.path?.trim()).toMatch(/^M/);
    }
  });

  it("keeps WhatsApp live: it is the one real channel", () => {
    const whatsapp = SOCIALS.find((social) => social.id === "whatsapp")!;
    expect(whatsapp.pending).toBeFalsy();
    expect(whatsapp.href).toMatch(/^https:\/\/wa\.me\/\d+$/);
    expect(whatsapp.label).toBe("Smarthaus on WhatsApp");
  });

  it("draws WhatsApp with the official logo file, which exists", () => {
    const whatsapp = SOCIALS.find((social) => social.id === "whatsapp")!;
    expect(whatsapp.src).toBe("/whatsapp.svg");
    const svg = readFileSync(join(process.cwd(), "public", "whatsapp.svg"), "utf8");
    // The green bubble, not a stand-in shape.
    expect(svg).toMatch(/<svg[\s>]/);
    expect(svg).toContain("#1FAF38");
  });

  it("gives a logo file only to a real profile, never a placeholder", () => {
    // A real brand mark on a link to a platform's home page would pass it off
    // as the Smarthaus profile.
    for (const social of pending) expect(social.src).toBeUndefined();
  });

  it("still has one placeholder profile, X; this fails when it lands", () => {
    // Replacing a placeholder is meant to fail here, so the change that brings
    // a real profile URL also updates this list and clears `pending`.
    // Instagram, Facebook and LinkedIn went live on 2026-11-20 (Shivanshu).
    expect(pending.map((social) => social.id)).toEqual(["x"]);
  });

  it.each([
    ["instagram", "https://www.instagram.com/smarthaus.dxb/", "Instagram"],
    ["facebook", "https://www.facebook.com/profile.php?id=61596663210810", "Facebook"],
    ["linkedin", "https://www.linkedin.com/company/smarthaus-smart-home-automation", "LinkedIn"],
  ])("links %s to the Smarthaus profile, named without the pending suffix", (id, href, name) => {
    // Instagram was smarthaus_dxb on 2026-11-19, an empty account: the brand's
    // own is smarthaus.dxb ("Smarthaus Home Automation"), checked 2026-11-20.
    const social = live.find((s) => s.id === id)!;
    expect(social.href).toBe(href);
    expect(isBareHomePage(social.href)).toBe(false);
    expect(social.label).toBe(`Smarthaus on ${name}`);
    expect(socialRule({ label: { en: social.label }, pending: social.pending })).toBe(true);
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

describe("the Studio's rule for a profile", () => {
  const label = (en: string) => ({ en });

  it("accepts a pending profile that says so, and a live one that does not", () => {
    expect(socialRule({ label: label(`Smarthaus on X${SUFFIX}`), pending: true })).toBe(true);
    expect(socialRule({ label: label("Smarthaus on X") })).toBe(true);
  });

  it("refuses a pending profile whose name does not say it is coming soon", () => {
    expect(socialRule({ label: label("Smarthaus on X"), pending: true })).toMatch(
      /must end its name/,
    );
  });

  it("refuses a live profile still named as coming soon", () => {
    expect(socialRule({ label: label(`Smarthaus on X${SUFFIX}`), pending: false })).toMatch(
      /Remove/,
    );
  });

  it("treats an empty profile as live, with nothing to say", () => {
    expect(socialRule(undefined)).toBe(true);
  });

  it("holds every seeded profile", () => {
    for (const social of SITE_SETTINGS.socials) {
      expect(socialRule({ label: label(social.label), pending: social.pending })).toBe(true);
    }
  });
});
