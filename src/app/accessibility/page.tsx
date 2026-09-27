import type { Metadata } from "next";
import Link from "next/link";
import {
  ACCESSIBILITY_SECTIONS as S,
  LegalPage,
  LegalSectionBlock,
} from "../../components/LegalPage";
import { ACCESSIBILITY_ASSESSED } from "../../content/legal/versions";
import { EMAIL, PHONE_DISPLAY, PHONE_E164, whatsappLink } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";

/**
 * The accessibility statement (Accessibility System §22). Written as evidence,
 * not as a badge: it says what was checked, how and when, and what is known
 * not to work. "Partially conformant, here are the gaps" is the stronger claim
 * under enforcement, and a blanket "AA compliant" would be a misrepresentation.
 *
 * Re-date it at every review (Maintenance, quarterly). A stale date is evidence
 * against the site. The date lives in src/content/legal/versions.ts.
 */
const ASSESSED_LABEL = new Date(`${ACCESSIBILITY_ASSESSED}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const metadata: Metadata = pageMetadata({
  title: "Accessibility statement",
  description:
    "How accessible the Smarthaus website is today, what we know does not work yet, how we checked, and how to tell us about a problem.",
  path: "/accessibility",
  index: true,
});

export default function AccessibilityStatement() {
  return (
    <LegalPage
      title="Accessibility statement"
      standfirst="We want everyone to be able to use this site. This page says honestly how close it is, what we know still gets in the way, and how to reach us if something does."
      lastUpdated={`Assessed ${ASSESSED_LABEL}`}
      sections={S}
    >
      <LegalSectionBlock section={S[0]!}>
        <p>
          We aim for the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA. Where the
          design already meets a stricter Level AAA criterion at little cost, we hold ourselves to
          that too: text that stays readable when you change its spacing, headings that describe
          what follows, your location marked in the navigation, and no time limits.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock section={S[1]!}>
        <p>
          <strong>Partially conformant.</strong> Most of the site meets WCAG 2.2 AA as far as we
          have been able to test it. The exceptions we know about are listed below. We would rather
          tell you than claim more than we have checked.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock section={S[2]!}>
        <ul>
          <li>
            <strong>The &ldquo;Our process&rdquo; section on the home page</strong> moves sideways
            as you scroll. At very high zoom (400%, or a screen 320 pixels wide) reading it means
            scrolling in two directions, which WCAG 1.4.10 asks us to avoid. Its six steps are
            headings in an ordered list, so a screen reader reads them in order without any sideways
            movement, and if your device is set to reduce motion the section becomes a plain list
            you scroll through.
          </li>
          <li>
            <strong>Screen readers.</strong> We have not yet tested the site with VoiceOver, NVDA or
            TalkBack. The structure is built for them, and automated checks pass, but automated
            checks find only part of what a person using one would meet.
          </li>
          <li>
            <strong>Keyboards on iPhone.</strong> We check that the element you have moved to with
            the Tab key is never hidden behind the navigation bar or the cookie notice. We have
            confirmed this in Chrome on a computer and on Android, but not yet with a keyboard
            connected to an iPhone.
          </li>
          <li>
            <strong>Pages marked &ldquo;Coming soon&rdquo;</strong> are placeholders and will be
            checked in full when they are written.
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock section={S[3]!}>
        <p>Every change to the site runs these checks automatically before it can go live:</p>
        <ul>
          <li>
            an automated accessibility scan (axe) of every page, on a computer, an iPhone-sized
            screen and a narrow Android screen
          </li>
          <li>keyboard-only use of the menu, forms, tabs and cookie choices</li>
          <li>Windows high-contrast mode, and the page at 200% zoom</li>
          <li>the setting that reduces motion, and the site with JavaScript switched off</li>
          <li>colour contrast, calculated from the site&rsquo;s own colour palette</li>
        </ul>
        <p>
          It has not had an independent audit, or testing by people who use assistive technology.
          Last assessed {ASSESSED_LABEL}.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock section={S[4]!}>
        <p>
          If something on this site is hard to use, or you need information in another form, tell us
          which page and what happened, and we will help. Email{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>, call{" "}
          <a href={`tel:${PHONE_E164}`}>{PHONE_DISPLAY}</a>, or{" "}
          <a
            href={whatsappLink("Hi, I had trouble using your website.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            message us on WhatsApp
          </a>
          . You can also reach us through the <Link href="/contact">contact page</Link>.
        </p>
      </LegalSectionBlock>
    </LegalPage>
  );
}
