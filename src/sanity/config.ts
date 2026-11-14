"use client";

// The Studio at /studio. A client module: the config carries functions, and
// "use client" is what lets the Server Component page hand it to NextStudio.
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "./env";
import { COLLECTIONS, schemaTypes } from "./schema";
import { structure } from "./structure";

export { dataset, projectId };

/**
 * Types whose documents are all fixed: no create, duplicate or delete. Every
 * document type but the articles, which editors write.
 */
const creatable: readonly string[] = COLLECTIONS;
const FIXED = new Set(
  schemaTypes
    .filter((t) => t.type === "document" && !creatable.includes(t.name))
    .map((t) => t.name),
);

export default defineConfig({
  name: "smarthaus",
  title: "Smarthaus",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    // The live preview: the site in a frame beside the form, showing drafts.
    // Same origin, so the frame is /, and draft mode is turned on by the route
    // below with the server's Viewer token.
    presentationTool({
      previewUrl: { origin: "same-origin", previewMode: { enable: "/api/draft-mode/enable" } },
    }),
  ],
  schema: {
    types: schemaTypes as never,
    // Nothing to create from the "+" menu but an article: every page already
    // exists.
    templates: (templates) => templates.filter((t) => !FIXED.has(t.schemaType)),
  },
  document: {
    actions: (actions, { schemaType }) =>
      FIXED.has(schemaType)
        ? actions.filter(({ action }) => action !== "delete" && action !== "duplicate")
        : actions,
    newDocumentOptions: (items) => items.filter((item) => !FIXED.has(item.templateId)),
  },
});
