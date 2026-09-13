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
