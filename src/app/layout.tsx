import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "../styles/globals.scss";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={manrope.variable}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
