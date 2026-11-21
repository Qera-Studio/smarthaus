import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd, pageGraph } from "../../../components/Schema";
import { SolutionPage } from "../../../components/Solution";
import { pageMetadata, seoInput } from "../../../lib/metadata";
import { getSolutionPage, SOLUTION_SLUGS, solutionPath } from "../../../sanity/content";

type Props = { params: Promise<{ slug: string }> };

/** One page per solution with a document; every other address is a 404. */
export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SOLUTION_SLUGS.includes(slug)) return {};
  const { seo } = await getSolutionPage(slug);
  return pageMetadata(seoInput(solutionPath(slug), seo));
}

export default async function SolutionRoute({ params }: Props) {
  const { slug } = await params;
  if (!SOLUTION_SLUGS.includes(slug)) notFound();
  const page = await getSolutionPage(slug);
  return (
    <>
      {page.seo.index ? (
        <JsonLd data={pageGraph(seoInput(solutionPath(slug), page.seo), page.updatedAt)} />
      ) : null}
      <SolutionPage slug={slug} />
    </>
  );
}
