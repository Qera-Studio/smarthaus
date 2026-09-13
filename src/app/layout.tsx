import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
// Must precede every component import. CSS Module styles are emitted in import
// order, and the first file to name a cascade layer fixes that layer's
// position — so if a component loads first, @layer components is registered
// before @layer reset and the reset wins. globals.scss declares the order.
import "../styles/globals.scss";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// One constant for every card's alt text, so the OG and Twitter copies cannot
// drift apart. It describes what the graphic actually shows — brand name,
// tagline, parent company and location — rather than restating the page title.
const OG_IMAGE_ALT =
  "Smarthaus — smarter living for a brighter tomorrow. Home automation by Maple Technologies Security Systems LLC, Dubai, U.A.E.";

export const metadata: Metadata = {
  title: {
    template: "%s | Smarthaus",
    default: "Smarthaus — Premium Smart Home Automation",
  },
  description:
    "Smarthaus delivers premium smart home automation solutions in Dubai. Seamless control of lighting, climate, security, and entertainment.",
  metadataBase: new URL("https://smarthaus.ae"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AE",
    siteName: "Smarthaus",
    // og:url must match the canonical, per SEO System §7. metadataBase makes
    // this absolute, which §6 requires.
    url: "/",
    // Both images are declared here rather than via the opengraph-image file
    // convention. The convention emits exactly ONE og:image and silently drops
    // any images array alongside it (verified: the square never reached the
    // markup), and the square card is worth having — WhatsApp, Slack, iMessage
    // and LinkedIn crop a 1200x630 to a square thumbnail and cut the wordmark.
    //
    // Order is load-bearing: consumers that honour it (Facebook, X) take the
    // first, so the landscape stays the primary card and the square is the
    // alternate for surfaces that pick by aspect ratio.
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
      {
        url: "/og-image-square.png",
        width: 1200,
        height: 1200,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    // summary_large_image, not summary: the card is a wide branded graphic, and
    // summary would crop it to a small square beside the text. The image itself
    // comes from src/app/twitter-image.png (file convention), as above.
    //
    // No `site` or `creator`: both take a real @handle and the brand's X
    // account is still a placeholder link in the footer. An invented handle
    // would attribute the card to someone else's account.
    card: "summary_large_image",
    // The landscape only. X renders one image for summary_large_image, and its
    // 5MB cap is lower than Facebook's 8MB.
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: OG_IMAGE_ALT }],
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
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content">{children}</main>
        {/* Sibling of main, not inside it: contentinfo is only a landmark as a
            direct child of body. The footer reserves the mobile nav's height
            itself, since the reservation on main does not reach it. */}
        <Footer />
      </body>
    </html>
  );
}
