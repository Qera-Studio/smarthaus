import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getComingSoonPage } from "../../sanity/content";

const PATH = "/developers";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getComingSoonPage("developers");
  return pageMetadata(seoInput(PATH, seo));
}

export default async function DevelopersPage() {
  const { blurb } = await getComingSoonPage("developers");
  return <ComingSoon blurb={blurb} />;
}
