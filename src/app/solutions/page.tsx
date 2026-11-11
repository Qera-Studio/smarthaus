import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getComingSoonPage } from "../../sanity/content";

const PATH = "/solutions";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getComingSoonPage("solutions");
  return pageMetadata(seoInput(PATH, seo));
}

export default async function SolutionsPage() {
  const { blurb } = await getComingSoonPage("solutions");
  return <ComingSoon blurb={blurb} />;
}
