import { Care } from "../components/Care";
import { Hardware } from "../components/Hardware";
import { HomeHero } from "../components/HomeHero";
import { HomeEnquiry } from "../components/HomeEnquiry";
import { Pricing } from "../components/Pricing";
import { Process } from "../components/Process";
import { Stats } from "../components/Stats";
import { JsonLd, pageGraph } from "../components/Schema";
import { ScrollReveal } from "../components/ScrollReveal";
import type { Metadata } from "next";
import { pageMetadata, seoInput } from "../lib/metadata";
import { getHomePage } from "../sanity/content";

// The homepage's own metadata. Without it the page inherited the layout's
// defaults, which is how every other page ended up with og:url "/" too.
// The description is the hero's published sentence, so it claims nothing the
// page does not (AGENTS.md, claims audit).
const PATH = "/";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getHomePage();
  return pageMetadata(seoInput(PATH, seo));
}

export default async function Home() {
  const { seo, enquiry, updatedAt } = await getHomePage();
  const meta = seoInput(PATH, seo);
  // The hero carries the page's h1.
  return (
    <>
      {meta.index ? <JsonLd data={pageGraph(meta, updatedAt)} /> : null}
      {/* FluidHero is unmounted, not deleted (2026-10-28), like the villa;
          src/components/FluidHero stays intact. */}
      <HomeHero />
      {/* The partner cards are unmounted, not deleted (2026-11-14): TIS and
          Fibaro are in the hero's logo rail now. src/components/Partners and
          its content stay intact, as src/components/Maple does. */}
      {/* What Smarthaus has done; what the house is made of; how it gets
          installed; then keeping it running, and the levels (the figures
          above the hardware: Shivanshu, 2026-11-14). The hardware is handed
          to Process, which holds it still while its first sheet rises over
          it. */}
      <Stats />
      <Process held={<Hardware />} />
      <Care />
      <Pricing />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry title={enquiry.title} standfirst={enquiry.standfirst} />
      <ScrollReveal />
    </>
  );
}
