import { Care } from "../components/Care";
import { Hardware } from "../components/Hardware";
import { HomeHero } from "../components/HomeHero";
import { Partners } from "../components/Partners";
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
      {/* Who stands behind the systems, before anything asks to be trusted.
          Took the Maple banner's place; src/components/Maple stays unmounted. */}
      <Partners />
      {/* What the house is made of, between the two plain sections so neither
          runs into the other; what Smarthaus has done; how it gets installed;
          then keeping it running, and the levels. */}
      <Hardware />
      <Stats />
      <Process />
      <Care />
      <Pricing />
      {/* Last thing on the page, directly above the footer. */}
      <HomeEnquiry title={enquiry.title} standfirst={enquiry.standfirst} />
      <ScrollReveal />
    </>
  );
}
