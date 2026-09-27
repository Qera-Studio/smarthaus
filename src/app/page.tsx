import { Care } from "../components/Care";
import { Hardware } from "../components/Hardware";
import { Hero } from "../components/Hero";
import { HomeEnquiry } from "../components/HomeEnquiry";
import { Pricing } from "../components/Pricing";
import { Process } from "../components/Process";
import { pageMetadata } from "../lib/metadata";

// The homepage's own metadata. Without it the page inherited the layout's
// defaults, which is how every other page ended up with og:url "/" too.
// The description is the hero's published sentence, so it claims nothing the
// page does not (AGENTS.md, claims audit).
export const metadata = pageMetadata({
  path: "/",
  title: "Smarthaus | Home Automation and Security in Dubai",
  absolute: true,
  description:
    "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
  index: true,
});

export default function Home() {
  // The hero carries the page's h1.
  return (
    <>
      <Hero />
      {/* What the house is made of, then how it gets installed. */}
      <Hardware />
      <Process />
      {/* Price before maintenance: what a system costs, then what keeping it
          running costs, then the enquiry. */}
      <Pricing />
      <Care />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry />
    </>
  );
}
