import { Suspense } from "react";
import { Care } from "../components/Care";
import { Hardware } from "../components/Hardware";
import { Hero } from "../components/Hero";
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
  // The hero carries the page's h1. Each section is its own Suspense
  // boundary so hydration yields between them; see the note in layout.tsx.
  return (
    <>
      <JsonLd data={pageGraph(PAGE)} />
      <Suspense>
        <Hero />
      </Suspense>
      {/* What the house is made of, then how it gets installed. */}
      <Suspense>
        <Hardware />
      </Suspense>
      <Suspense>
        <Process />
      </Suspense>
      {/* Price before maintenance: what a system costs, then what keeping it
          running costs, then the enquiry. */}
      <Suspense>
        <Pricing />
      </Suspense>
      <Suspense>
        <Care />
      </Suspense>
      {/* Last thing on the page, directly above the footer. */}
      <Suspense>
        <HomeEnquiry />
      </Suspense>
    </>
  );
}
