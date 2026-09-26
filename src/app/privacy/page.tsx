import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDefTable,
  LegalPage,
  LegalSectionBlock,
  LegalTable,
  Placeholder,
  PRIVACY_SECTIONS as S,
} from "../../components/LegalPage";
import { ADDRESS, EMAIL, PHONE_DISPLAY } from "../../lib/contact";
import { PRIVACY_POLICY_VERSION } from "../../content/legal/versions";

// ---------------------------------------------------------------------------
// DRAFT — pending the counsel review this document requires.
//
// Source of truth for the wording: src/content/legal/privacy-policy.md, which
// carries the full drafting notes, the regime assumption, and the placeholder
// register. This route renders that content; substantive wording changes belong
// in the markdown first so the counsel-review trail stays in one place.
//
// Two open items that block publication, restated here because this is the file
// that actually ships:
//   1. REGIME: drafted against UAE federal PDPL, which assumes the entity is
//      licensed on Dubai mainland or in a non-financial free zone. If it is
//      DIFC or ADGM, this is written against the wrong law.
//   2. PLACEHOLDERS: every <Placeholder> renders a conspicuous amber marker.
//      They must all be gone before launch. `grep -r "Placeholder" src/app` is
//      the check.
// ---------------------------------------------------------------------------

const LAST_UPDATED = "Draft, not yet effective";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Smarthaus collects, uses, and protects your personal information, how long we keep it, and your rights over it.",
  alternates: { canonical: "/privacy" },
  // A draft legal page must not be indexed: it states data practices that have
  // not been confirmed. Flip to indexable in the same change that clears the
  // placeholders and records counsel sign-off.
  robots: { index: false, follow: true },
};

const ENTITY_ROWS = [
  { label: "Legal entity", value: "Maple Technologies Security Systems LLC" },
  { label: "Trading as", value: "Smarthaus" },
  { label: "Trade licence number", value: "897839" },
  { label: "SIRA licence number", value: "SSP202210037219" },
  { label: "Licensing authority", value: "Dubai, UAE" },
  {
    label: "Registered address",
    value: ADDRESS,
  },
  { label: "Privacy contact", value: EMAIL },
  { label: "General contact", value: EMAIL },
  { label: "Phone", value: PHONE_DISPLAY },
] as const;

const CONTACT_ROWS = [
  { label: "Privacy and data protection", value: EMAIL },
  { label: "General enquiries", value: EMAIL },
  { label: "Phone", value: PHONE_DISPLAY },
  {
    label: "Post",
    value: ADDRESS,
  },
] as const;

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      standfirst="What we collect when you use this site or enquire about our services, why we collect it, how long we keep it, who else sees it, and what you can ask us to do with it."
      lastUpdated={LAST_UPDATED}
      version={PRIVACY_POLICY_VERSION}
      sections={S}
    >
      <p>
        Smarthaus is a smart home automation brand operating in Dubai, United Arab Emirates. This
        policy explains what personal information we collect when you use this website or enquire
        about our services.
      </p>
      <p>
        We have written this to be read, not to be impenetrable. If anything here is unclear, ask us
        and we will explain it.
      </p>

      {/* 1 */}
      <LegalSectionBlock section={S[0]!}>
        <p>
          Maple Technologies Security Systems LLC is the data controller for the information
          described in this policy. This means we decide what personal information is collected and
          why.
        </p>
        <LegalDefTable rows={ENTITY_ROWS} caption="Smarthaus entity and contact details" />
        <p>
          Smarthaus is a sub-brand of <Placeholder>parent company name</Placeholder>. Where
          information is shared within the group, it is covered by section 4.
        </p>
      </LegalSectionBlock>

      {/* 2 */}
      <LegalSectionBlock section={S[1]!}>
        <p>
          This policy covers the Smarthaus website at smarthaus.ae and enquiries made through it.
        </p>
        <p>It does not cover:</p>
        <ul>
          <li>
            Installed smart home systems in your property after handover. Devices and control apps
            supplied as part of an installation are operated by their manufacturers under their own
            terms and privacy policies. We will identify these in your project documentation.
          </li>
          <li>Third-party websites we link to.</li>
          <li>
            Your dealings with <Placeholder>parent company name</Placeholder> under any separate
            agreement.
          </li>
        </ul>
      </LegalSectionBlock>

      {/* 3 */}
      <LegalSectionBlock section={S[2]!}>
        <p>
          We collect two kinds of information: what you give us deliberately, and what is recorded
          automatically when any website is served to you.
        </p>

        <h3>Information you give us</h3>
        <p>When you submit an enquiry form on this site, we collect:</p>
        <LegalTable caption="Information collected through enquiry forms, why it is needed, and the lawful basis">
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col">Why we need it</th>
              <th scope="col">Lawful basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Your name</th>
              <td>To address you properly and identify your enquiry</td>
              <td>Consent, and steps toward a contract</td>
            </tr>
            <tr>
              <th scope="row">Email address</th>
              <td>To reply to your enquiry</td>
              <td>Consent, and steps toward a contract</td>
            </tr>
            <tr>
              <th scope="row">Phone number</th>
              <td>To call or message you about your enquiry. Every enquiry form requires it</td>
              <td>Consent, and steps toward a contract</td>
            </tr>
            <tr>
              <th scope="row">Property location or area</th>
              <td>To tell you whether we serve your area and to scope a site visit</td>
              <td>Consent, and steps toward a contract</td>
            </tr>
            <tr>
              <th scope="row">Project details you describe</th>
              <td>To understand what you are asking for and prepare a useful response</td>
              <td>Consent, and steps toward a contract</td>
            </tr>
            <tr>
              <th scope="row">Whether you are an owner, designer, or developer</th>
              <td>To route your enquiry to the right person and respond in the right detail</td>
              <td>Consent</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          We ask for the minimum needed to respond usefully. The fields we need are marked required;
          leaving any other field blank does not stop us replying.
        </p>
        <p>
          <strong>We do not ask for and do not want:</strong> your identity documents, passport or
          Emirates ID numbers, bank or card details, salary or financial information, or health
          information. Do not send these through the website. If a project later requires any such
          document, we will tell you how to provide it securely and why it is needed.
        </p>
        <p>
          <strong>If you contact us on WhatsApp,</strong> using a link on this site opens a
          conversation in your own WhatsApp application with a message pre-filled for convenience.
          You choose whether to send it. That conversation is carried by WhatsApp under WhatsApp’s
          own privacy policy. We receive the message content and your WhatsApp display name and
          number, as in any WhatsApp chat.
        </p>

        <h3>Information recorded automatically</h3>
        <p>
          Serving a web page necessarily involves your device telling our hosting provider where to
          send it. Our hosting provider records, in its server logs:
        </p>
        <ul>
          <li>your IP address</li>
          <li>the pages you requested and when</li>
          <li>your browser and operating system type (the user-agent string)</li>
          <li>the page that referred you, if any</li>
        </ul>
        <p>
          We use this for security, fraud and abuse prevention, and to diagnose faults. The basis is
          our legitimate interest in keeping the site available and secure. These logs are held by
          our hosting provider under its own retention schedule (section 6).
        </p>

        {/*
          Rewritten from consent-content-deck.md §7.1, which supplies this text
          and requires it to ship in the same change as the consent UI. The
          previous version stated in bold that there was no consent banner and
          called it "a deliberate design decision, not an omission" — true until
          the banner existed, and a misrepresentation the moment it did. Legal
          System §5 is explicit that an inaccurate policy is worse than none.

          The `id` is what the banner's "How we use cookies" link targets. It is
          on the heading rather than a wrapper so the anchor lands on the
          heading itself.

          TWO SENTENCES DEVIATE FROM §7.1, deliberately, and are flagged for the
          counsel review that is already pending on this page:

          §7.1 is written for the state where the tags are live, and says "we
          use Google Analytics and Microsoft Clarity". They are not installed:
          the consent gate ships first because the deck's own §13 lists six
          items as blocking before the tags may fire, five of them outside
          engineering. Shipping §7.1 verbatim would swap one false claim for
          another in the opposite direction, so the two sentences that assert
          present use are future-tense here. Everything else is §7.1 as written.
        */}
        <h3 id="cookies">Cookies and analytics</h3>
        <p>
          <strong>Essential cookies</strong> keep the site working. There is one: it remembers your
          cookie choice. It is always active.
        </p>
        <p>
          <strong>Analytics cookies are off until you turn them on.</strong> We are preparing to use
          Google Analytics and Microsoft Clarity to understand which pages are read and where people
          get stuck. Neither is installed yet, and neither will load unless you accept it.
        </p>
        <p>
          <strong>We do measure how the site performs, without cookies.</strong> Vercel Web
          Analytics and Speed Insights count page views and record how quickly pages load. They set
          no cookies, store nothing in your browser, and create no identifier that survives your
          visit, so there is nothing here for you to switch off. You are counted; you are not
          followed.
        </p>
        <p>
          Microsoft Clarity records how pages are used, including scrolling, clicks and pointer
          movement, and can replay a session.{" "}
          <strong>Anything you type into a form will be masked and never recorded.</strong> We will
          verify that before it processes anything.
        </p>
        <p>
          We do not use advertising or remarketing cookies. There is no Meta Pixel, no ad-network
          tag, and no third-party chat widget on this site.
        </p>
        <p>
          You can change your choice at any time from <strong>Cookie preferences</strong> in the
          footer of any page. Turning analytics off stops it immediately.
        </p>

        <h3>Children</h3>
        <p>
          This website and our services are directed at adults arranging work on property. We do not
          knowingly collect information from anyone under 18. If you believe a child has sent us
          personal information, contact us at the privacy address above and we will delete it.
        </p>
      </LegalSectionBlock>

      {/* 4 */}
      <LegalSectionBlock section={S[3]!}>
        <p>
          We do not sell your personal information. We do not share it for anyone else’s marketing.
        </p>
        <p>
          We use a small number of service providers who process information on our instructions.
          Each one is listed below. We would rather name them than describe them vaguely.
        </p>

        <h3>Currently in use</h3>
        <LegalTable caption="Service providers currently processing information for Smarthaus">
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What it does</th>
              <th scope="col">What it sees</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Vercel Inc.</th>
              <td>Hosts and serves this website</td>
              <td>Server log data described in section 3</td>
            </tr>
            <tr>
              <th scope="row">Resend</th>
              <td>Delivers each enquiry you send to our mailbox</td>
              <td>Everything you submit in an enquiry form</td>
            </tr>
            <tr>
              <th scope="row">Vercel Web Analytics and Speed Insights</th>
              <td>Aggregate page performance and visit counts</td>
              <td>
                Aggregated, non-identifying usage data. No cookies, and no identifier that survives
                your visit
              </td>
            </tr>
          </tbody>
        </LegalTable>

        <h3>Not yet active</h3>
        <p>
          The following are planned but not currently operating on this site. We list them for
          transparency about our direction. Each will move into the table above, and this policy
          will be updated and re-dated, before it begins processing anything.
        </p>
        <LegalTable caption="Service providers planned but not yet processing any information">
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">Planned purpose</th>
              <th scope="col">What it would see</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Sanity</th>
              <td>Managing website content</td>
              <td>Nothing you submit: content only, no enquiry data</td>
            </tr>
            <tr>
              <th scope="row">Cloudflare Turnstile</th>
              <td>Spam protection on the enquiry form, if spam volume requires it</td>
              <td>Technical signals about your browser session</td>
            </tr>
          </tbody>
        </LegalTable>

        <h3>Others who may receive information</h3>
        <ul>
          <li>
            <strong>Within our group.</strong> Your enquiry may be seen by colleagues at{" "}
            <Placeholder>parent company name</Placeholder> where they are handling it, for example
            an engineer scoping a site visit.
          </li>
          <li>
            <strong>Installation and trade partners.</strong> Where a project requires a specialist
            subcontractor, we share what that partner needs to do the work, and no more. We tell you
            who they are.
          </li>
          <li>
            <strong>Professional advisers.</strong> Our accountants, auditors and lawyers, where
            they need it to advise us.
          </li>
          <li>
            <strong>Where the law requires it.</strong> A court order, a regulator, or a lawful
            request from a UAE authority. We respond to lawful requests and no more than the request
            requires.
          </li>
          <li>
            <strong>If the business is sold or restructured</strong>, information may transfer to
            the acquiring entity. It would remain subject to a policy no less protective than this
            one.
          </li>
        </ul>
      </LegalSectionBlock>

      {/* 5 */}
      <LegalSectionBlock section={S[4]!}>
        <p>
          Smarthaus operates in the UAE. Some of our service providers are established outside the
          UAE, which means your information may be processed outside the country, for example by our
          hosting provider.
        </p>
        <p>
          Where information leaves the UAE, we rely on the transfer routes the law permits: transfer
          to a jurisdiction offering an adequate level of protection, or contractual safeguards
          binding the recipient to protect the information.
        </p>
      </LegalSectionBlock>

      {/* 6 */}
      <LegalSectionBlock section={S[5]!}>
        <p>We do not keep personal information indefinitely.</p>
        <LegalTable caption="How long each kind of information is kept, and why">
          <thead>
            <tr>
              <th scope="col">Information</th>
              <th scope="col">Retention</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Enquiries that do not become projects</th>
              <td>
                <Placeholder>24 months</Placeholder> from last contact
              </td>
              <td>
                Enquiries in this sector mature slowly: a villa renovation decision can take a year
                or more, and we would rather know we have spoken before than start cold
              </td>
            </tr>
            <tr>
              <th scope="row">Enquiries that become projects</th>
              <td>
                For the life of the project and <Placeholder>7 years</Placeholder> after completion
              </td>
              <td>Warranty, as-built records, and statutory record-keeping</td>
            </tr>
            <tr>
              <th scope="row">Marketing list subscriptions</th>
              <td>Until you unsubscribe, then a minimal suppression record</td>
              <td>
                The suppression record is how we ensure we do not email you again after you ask us
                to stop
              </td>
            </tr>
            <tr>
              <th scope="row">Server logs</th>
              <td>
                Per our hosting provider’s schedule: <Placeholder>confirm period</Placeholder>
              </td>
              <td>Security and fault diagnosis</td>
            </tr>
            {/*
              Rows added per consent-content-deck.md §7.3, in the same change as
              the consent UI.

              The cookie-choice row is the one that matters today: the consent
              record is itself stored information, and a retention table that
              does not mention it is incomplete the moment the banner ships.

              The analytics rows describe what will be kept once the tags are
              live. Clarity's own retention period is still a placeholder in the
              deck ("confirm from Microsoft documentation"), so it renders
              through <Placeholder> rather than carrying an invented figure —
              AGENTS.md's claims audit rules out guessing it.
            */}
            <tr>
              <th scope="row">Your cookie choice</th>
              <td>12 months from the choice</td>
              <td>
                Proving what was consented to and when, and not asking you again inside that period
              </td>
            </tr>
            <tr>
              <th scope="row">Analytics data, once analytics is enabled</th>
              <td>Up to 14 months</td>
              <td>Year-on-year comparison, then deletion</td>
            </tr>
            <tr>
              <th scope="row">Session recordings, once analytics is enabled</th>
              <td>
                Microsoft’s own retention period: <Placeholder>confirm period</Placeholder>
              </td>
              <td>Diagnosing where pages fail</td>
            </tr>
            <tr>
              <th scope="row">Records we must keep by law</th>
              <td>For the period the relevant UAE law requires</td>
              <td>
                Where tax, accounting or other law requires retention, that obligation governs that
                specific record
              </td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          When a retention period ends, we delete the information or anonymise it so it can no
          longer identify you.
        </p>
        <p>
          <strong>On the conflict between deletion and retention:</strong> if you ask us to delete
          your information but we are legally required to keep part of it, an invoice, for instance,
          we will delete what we can, keep only what the law requires, tell you which is which, and
          delete the remainder when that obligation ends.
        </p>
      </LegalSectionBlock>

      {/* 7 */}
      <LegalSectionBlock section={S[6]!}>
        <p>
          You have the following rights over your personal information. Exercising them is free, and
          we will not treat you differently for asking.
        </p>
        <ul>
          <li>
            <strong>Ask what we hold.</strong> Request a copy of the personal information we hold
            about you, and information about how we use it.
          </li>
          <li>
            <strong>Correct it.</strong> Have inaccurate or out-of-date information fixed.
          </li>
          <li>
            <strong>Have it deleted.</strong> Ask us to delete your information where we have no
            continuing lawful reason to keep it (see the note in section 6).
          </li>
          <li>
            <strong>Withdraw consent.</strong> Where we rely on your consent, withdraw it at any
            time. Withdrawing is as easy as giving it. We then stop that processing, though it does
            not undo processing already carried out lawfully.
          </li>
          <li>
            <strong>Restrict or object.</strong> Ask us to stop or limit a particular use of your
            information.
          </li>
          <li>
            <strong>Ask for it in a portable form.</strong> Receive the information you gave us in a
            structured, commonly used, machine-readable format.
          </li>
          <li>
            <strong>Stop marketing.</strong> Opt out at any time, by the unsubscribe link in any
            marketing email or by contacting us. We act on this promptly and permanently.
          </li>
        </ul>
        <p>
          <strong>How to exercise a right:</strong> email {EMAIL} and tell us what you want. We will
          acknowledge your request and respond within <Placeholder>30 days</Placeholder> of
          receiving it. If a request is complex and needs longer, we will tell you why and when to
          expect our response.
        </p>
        <p>
          <strong>We will verify who you are first.</strong> Before we hand over or delete personal
          information, we need to be reasonably satisfied you are the person the information is
          about. Otherwise a request channel becomes a way to obtain someone else’s data. We will
          ask you to confirm details we already hold, and we will not ask for more identification
          than the request requires.
        </p>
        <p>
          <strong>If you are unhappy with how we have handled your information,</strong> tell us
          first: most problems are faster to fix directly. Contact {EMAIL}, and we will investigate
          and respond. If you remain dissatisfied, you may complain to the relevant UAE data
          protection authority.
        </p>
      </LegalSectionBlock>

      {/* 8 */}
      <LegalSectionBlock section={S[7]!}>
        <p>We take practical measures to protect the information we hold:</p>
        <ul>
          <li>
            The website is served over HTTPS, so information you submit is encrypted in transit.
          </li>
          <li>
            Access to enquiry information is limited to the people who need it to do their work, and
            is removed when someone leaves or changes role.
          </li>
          <li>
            Accounts on the systems we use are protected by strong, unique credentials and
            multi-factor authentication where the system supports it.
          </li>
          <li>
            We keep the number of systems holding your information deliberately small, and we ask
            what a new tool would see before we adopt it.
          </li>
          <li>
            We collect less than we could. The information we never collect is the information that
            cannot be exposed.
          </li>
        </ul>
        <p>
          <strong>What we will not claim:</strong> no organisation can promise that information
          transmitted over the internet is completely secure, and we do not make that promise. What
          we commit to is taking reasonable measures, keeping them under review, and telling you
          honestly if something goes wrong.
        </p>
        <p>
          <strong>If a breach occurs</strong> that is likely to harm you, we will notify the
          relevant authority and affected individuals as the law requires, tell you what happened
          and what information was involved, and tell you what we are doing about it.
        </p>
      </LegalSectionBlock>

      {/* 9 */}
      <LegalSectionBlock section={S[8]!}>
        <p>
          We will only send you marketing about Smarthaus if you ask us to, or if you have enquired
          about our services and we think a small amount of relevant follow-up is useful to you.
          Either way:
        </p>
        <ul>
          <li>Every marketing email has a working unsubscribe link.</li>
          <li>Unsubscribing takes effect promptly and permanently.</li>
          <li>
            We do not buy, rent, or scrape marketing lists. If you are hearing from us, it is
            because you contacted us or subscribed.
          </li>
          <li>
            Replying to an enquiry is not marketing, and you cannot unsubscribe from us answering
            your question.
          </li>
        </ul>
      </LegalSectionBlock>

      {/* 10 */}
      <LegalSectionBlock section={S[9]!}>
        <p>
          We do not make decisions about you by automated means. Every enquiry is read and answered
          by a person. Nothing on this site scores, ranks, or profiles you.
        </p>
      </LegalSectionBlock>

      {/* 11 */}
      <LegalSectionBlock section={S[10]!}>
        <p>
          We will update this policy when our practices change or the law requires it. The version
          and date are at the top of this page.
        </p>
        <p>
          Where a change materially affects how we handle information we already hold about you, we
          will tell you directly rather than relying on you noticing an updated page.
        </p>
      </LegalSectionBlock>

      {/* 12 */}
      <LegalSectionBlock section={S[11]!}>
        <LegalDefTable rows={CONTACT_ROWS} caption="How to contact Smarthaus about privacy" />
        <p>
          Our <Link href="/terms">Terms and Conditions</Link> govern your use of this website.
        </p>
      </LegalSectionBlock>
    </LegalPage>
  );
}
