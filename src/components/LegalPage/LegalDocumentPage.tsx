import { getLegalDocument, getSettings, type LegalName } from "../../sanity/content";
import { JsonLd, pageGraph } from "../Schema";
import { seoInput } from "../../lib/metadata";
import { LegalBody } from "./LegalBody";
import { LegalPage, LegalSectionBlock } from "./LegalPage";

/** An ISO date as the legal pages print it: "27 September 2026". */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One legal document from Sanity, in the legal shell: header, contents rail,
 * sections. The privacy policy, the terms and the accessibility statement are
 * all this, with their own wording.
 */
export async function LegalDocumentPage({ name, path }: { name: LegalName; path: string }) {
  const [doc, { contact }] = await Promise.all([getLegalDocument(name), getSettings()]);
  const date = doc.updated ? formatDate(doc.updated) : "";
  const seo = seoInput(path, doc.seo);
  return (
    <>
      {seo.index ? <JsonLd data={pageGraph(seo, doc.updatedAt)} /> : null}
      <LegalPage
        title={doc.title}
        standfirst={doc.standfirst}
        lastUpdated={date ? `${doc.updatedLabel} ${date}` : doc.updatedLabel}
        version={doc.version}
        sections={doc.sections}
      >
        {doc.intro ? <LegalBody blocks={doc.intro} contact={contact} date={date} /> : null}
        {doc.sections.map((section) => (
          <LegalSectionBlock key={section.id} section={section}>
            <LegalBody blocks={section.body} contact={contact} date={date} />
          </LegalSectionBlock>
        ))}
      </LegalPage>
    </>
  );
}
