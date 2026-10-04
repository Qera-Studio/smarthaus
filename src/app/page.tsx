import { Hardware } from "../components/Hardware";
import { FluidHero } from "../components/FluidHero";
import { HomeEnquiry } from "../components/HomeEnquiry";
import { Pricing } from "../components/Pricing";
import { Process } from "../components/Process";
import { JsonLd, pageGraph } from "../components/Schema";
import { pageMetadata } from "../lib/metadata";

// The homepage's own metadata. Without it the page inherited the layout's
// defaults, which is how every other page ended up with og:url "/" too.
// The description is the hero's published sentence, so it claims nothing the
// page does not (AGENTS.md, claims audit).
const PAGE = {
  path: "/",
  title: "Smarthaus | Home Automation and Security in Dubai",
  absolute: true,
  description:
    "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
  index: true,
} as const;

export const metadata = pageMetadata(PAGE);

export default function Home() {
  // The hero carries the page's h1.
  return (
    <>
      <JsonLd data={pageGraph(PAGE)} />
      <FluidHero />
      {/* What the house is made of, then how it gets installed. */}
      <Hardware />
      <Process />
      {/* Care (the maintenance plan) is unmounted, not deleted, until the
          section is rewritten; src/components/Care stays intact. */}
      <Pricing />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry />
    </>
  );
}
