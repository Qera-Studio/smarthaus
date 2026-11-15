// The Studio's sidebar: one entry per page, in the order the site is read,
// rather than Sanity's default list of document types. Every document is
// fixed: editors fill pages in, they do not create or delete them, because a
// route is code.
import type { StructureResolver } from "sanity/structure";
import { FIXED_DOCUMENTS } from "./schema";

const PAGES: [id: string, title: string][] = [
  ["homePage", "Homepage"],
  ["aboutPage", "About"],
  ["contactPage", "Contact"],
  ["pricingPage", "Pricing"],
  ["faqPage", "FAQ"],
];

export const structure: StructureResolver = (S) => {
  const doc = (type: string, id: string, title: string) =>
    S.listItem()
      .title(title)
      .id(id)
      .child(S.document().schemaType(type).documentId(id).title(title));
  const fixed = (type: keyof typeof FIXED_DOCUMENTS, title: string) =>
    S.listItem()
      .title(title)
      .child(
        S.list()
          .title(title)
          .items(Object.entries(FIXED_DOCUMENTS[type]).map(([id, name]) => doc(type, id, name))),
      );

  return S.list()
    .title("Smarthaus")
    .items([
      doc("siteSettings", "siteSettings", "Site settings"),
      S.divider(),
      ...PAGES.map(([id, title]) => doc(id, id, title)),
      fixed("solutionPage", "Solution pages"),
      fixed("comingSoonPage", "Coming-soon pages"),
      S.divider(),
      // The one list editors add to and remove from, newest first.
      S.listItem()
        .title("Blog")
        .child(
          S.list()
            .title("Blog")
            .items([
              doc("blogPage", "blogPage", "Articles page"),
              S.listItem()
                .title("Articles")
                .child(
                  S.documentTypeList("post")
                    .title("Articles")
                    .defaultOrdering([{ field: "date", direction: "desc" }]),
                ),
            ]),
        ),
      S.divider(),
      fixed("legalPage", "Legal"),
      doc("consentCopy", "consentCopy", "Cookie and consent wording"),
    ]);
};
