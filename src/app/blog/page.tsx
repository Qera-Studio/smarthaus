import type { Metadata } from "next";

import { BlogIndex } from "../../components/Blog";
import { JsonLd, pageGraph } from "../../components/Schema";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getBlogPage } from "../../sanity/content";

const PATH = "/blog";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getBlogPage();
  return pageMetadata(seoInput(PATH, seo));
}

/** The articles page: every article, newest first. */
export default async function BlogPage() {
  const page = await getBlogPage();
  return (
    <>
      {page.seo.index ? (
        <JsonLd data={pageGraph(seoInput(PATH, page.seo), page.updatedAt)} />
      ) : null}
      <BlogIndex />
    </>
  );
}
