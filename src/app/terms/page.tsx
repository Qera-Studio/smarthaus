import type { Metadata } from "next";
import { LegalDocumentPage } from "../../components/LegalPage/LegalDocumentPage";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getLegalDocument } from "../../sanity/content";

// The wording is the "legal-terms" document in Sanity, with its version and
// changelog there. An edit to it is a legal change: bump the version, add a
// changelog entry, and have counsel review it before it is marked effective.
const PATH = "/terms";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getLegalDocument("terms");
  return pageMetadata(seoInput(PATH, seo));
}

export default async function TermsAndConditions() {
  return <LegalDocumentPage name="terms" path={PATH} />;
}
