"use client";

// The Studio at /studio. A client module: the config carries functions, and
// "use client" is what lets the Server Component page hand it to NextStudio.
// No schema types yet; each arrives with the page that reads it.
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
  name: "smarthaus",
  title: "Smarthaus",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: { types: [] },
});
