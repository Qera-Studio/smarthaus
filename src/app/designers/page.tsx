import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getComingSoonPage } from "../../sanity/content";

const PATH = "/designers";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getComingSoonPage("designers");
  return pageMetadata(seoInput(PATH, seo));
}

export default async function DesignersPage() {
  const { blurb } = await getComingSoonPage("designers");
  return <ComingSoon blurb={blurb} />;
}
