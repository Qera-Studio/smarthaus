import { OG_IMAGES, SITE_NAME } from "../lib/metadata";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
// First, so the reset and base styles are in the first chunk. The cascade
// layer ORDER no longer depends on this: every module's chunk opens with the
// order statement via _variables.scss, because on a notFound() route the
// browser sees the page's chunk before this one.
import "../styles/globals.scss";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Splash } from "../components/Loader/Splash";
import { Consent } from "../components/Consent";
import { ScrollToTop } from "../components/ScrollToTop";
import { JsonLd, siteGraph } from "../components/Schema";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The origin every relative metadata URL is resolved against.
 *
 * smarthaus.ae in production, because that is the canonical host and what must
 * appear in og:url and the canonical link once the domain is live.
 *
 * Anywhere else, the deployment's own host. Hardcoding the production domain
 * made og:image absolute to smarthaus.ae on EVERY deployment, including preview
 * builds and the vercel.app URL — so a shared link carried an image URL that
 * does not resolve while the domain is unconfigured, and WhatsApp, Slack and
 * iMessage all rendered a text-only card. The tags were correct; the image
 * behind them 404'd.
 *
 * VERCEL_ENV is "production" only for production deploys, so previews resolve
 * to themselves and their cards work too. VERCEL_PROJECT_PRODUCTION_URL is the
 * production domain as Vercel knows it, which is the vercel.app host until a
 * custom domain is attached and the real domain afterwards.
 */
function metadataOrigin(): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return new URL(site);

  if (process.env.VERCEL_ENV !== "production") {
    const preview = process.env.VERCEL_URL;
    if (preview) return new URL(`https://${preview}`);
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return new URL(`https://${production}`);

  return new URL("https://smarthaus.ae");
}

// The site-wide fallback. Every page sets its own through pageMetadata()
// (src/lib/metadata.ts), which owns the canonical, og:url and robots; this is
// only what a route without one (the 404, the error pages) is left with. It
// sets no og:url and no canonical, because a fallback that names "/" is
// exactly how every page came to claim it was the homepage.
export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} | Home Automation and Security in Dubai`,
  },
  description:
    "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
  metadataBase: metadataOrigin(),
  openGraph: {
    type: "website",
    locale: "en_AE",
    siteName: SITE_NAME,
    images: OG_IMAGES,
  },
  twitter: {
    // No `site` or `creator`: both take a real @handle, and the brand's X
    // account is still a placeholder link in the footer.
    card: "summary_large_image",
    images: [OG_IMAGES[0]!],
  },
};

// themeColor paints the browser chrome (mobile Safari/Chrome address bar) to
// match --color-bg-canvas, so the viewport reads as one surface. No
// maximumScale or userScalable limits — pinch-zoom is a WCAG 1.4.4 requirement.
export const viewport: Viewport = {
  themeColor: "#f0e9dd",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={manrope.variable}>
      <body>
        {/*
          FIRST child of <body>, deliberately: it is in the server HTML, so it
          covers the viewport from the very first paint rather than appearing
          after hydration over content the user can already see.

          Development only for this trial. A fixed 2s splash in production
          withholds content for two seconds on every navigation and sits on top
          of the homepage's LCP element, which would fail the project's own LCP
          and Lighthouse gates. Wiring it to real progress, and deciding whether
          it runs on first load only, is the next decision — see Splash.tsx.
        */}
        {process.env.NODE_ENV === "development" ? <Splash /> : null}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content">{children}</main>
        {/* Sibling of main, not inside it: contentinfo is only a landmark as a
            direct child of body. The footer reserves the mobile nav's height
            itself, since the reservation on main does not reach it. */}
        <Footer />
        {/*
          After the footer, so it is last in the tab order rather than standing
          between a keyboard visitor and the page.

          Anchored bottom-inline-END, and the consent banner is
          bottom-inline-start — but that does NOT keep them apart. Below lg the
          banner spans the full width between the nav insets and both are
          anchored to the same inset-block-end calc, so they land on the same
          line: measured on a Pixel 7, both ended at 747 with the banner's
          "Choose what to share" directly over this button. The banner is
          --z-overlay against this button's --z-sticky, so it swallowed every
          click and e2e/scroll-to-top.spec.ts failed on both phone projects.

          ScrollToTop.module.scss moves the button above the banner while it is
          up, keyed off a height the banner publishes as --consent-block-size.
        */}
        <ScrollToTop />
        {/*
          Last in the body, after the footer.

          Position in the source matters for two reasons. It is a
          fixed-position region, so it paints last and sits above the page
          without needing to out-rank anything in the stacking context beyond
          the nav. And it is last in document order, so it comes after the
          content rather than standing between a keyboard visitor and the page.

          Document order is the guarantee — NOT "the banner never takes the
          first Tab". Safari omits links from the Tab sequence by default, so on
          iOS the banner's buttons are the first tab stops simply because they
          are the first focusable elements Safari counts. That is Safari's
          behaviour for the whole site rather than something this introduces
          (with no banner, Tab on a fresh load focuses nothing there at all),
          and it is why e2e/consent.spec.ts asserts DOM position instead.

          Deliberately NOT a modal: no scrim, no focus trap, and the page stays
          scrollable and readable behind it. A visitor may ignore this
          indefinitely. See Consent.tsx for why, and for what it does not do
          (it loads no analytics).
        */}
        <Consent />
        {/*
          Vercel Web Analytics and Speed Insights.

          NOT consent-gated, and that is a decision rather than an oversight.
          The consent banner above exists for GA4 and Microsoft Clarity, which
          set cookies and build a cross-session profile. These two do neither:
          Vercel's own privacy documentation states there are no cookies of any
          kind, no cross-site identifier, and that a visitor is a hash of the
          incoming request which is discarded after 24 hours. There is nothing
          for a visitor to consent to or withdraw, and a banner entry offering
          to turn off something that stores nothing would be noise.

          If that ever changes — a cookie, a persistent id, anything that
          survives the session — they move behind the banner with the other two
          and the privacy policy is rewritten in the same change.

          Last in the body, after Consent, so nothing analytics-related stands
          between a keyboard visitor and the page.

          ON VERCEL ONLY. Both scripts load from /_vercel/insights/script.js and
          /_vercel/speed-insights/script.js — first-party paths served by the
          PLATFORM, not by this app, which is why no CSP change was needed:
          `default-src 'self'` already covers them.

          Off-platform those paths do not exist. `next start` falls through to
          the 404 handler and returns text/plain, the browser refuses to execute
          it, and Lighthouse's errors-in-console audit fails: best-practices
          dropped 0.96 to 0.93 and failed the >= 0.95 gate on a build that would
          have been perfectly healthy in production. A gate that is red locally
          and green in production is the failure mode CLAUDE.md already
          describes for the JS budget — a real regression would look identical
          to the standing noise.

          So they mount only where they work. VERCEL is set on every Vercel
          build and on no other, which also keeps two dead script tags out of
          local and CI HTML.
        */}
        {process.env.VERCEL ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
        {/* The business and the site, once per page (SEO System §9). Last, so the
            skip link stays the first child of <body>. */}
        <JsonLd data={siteGraph()} />
      </body>
    </html>
  );
}
