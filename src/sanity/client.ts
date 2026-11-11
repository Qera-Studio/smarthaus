// The Content Lake client, unauthenticated: the dataset is public and the site
// reads only published documents. The draft preview adds a Viewer token per
// request (src/sanity/fetch.ts), never here.
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // The live API, not the CDN: reads happen only at build and after a
  // publish, a handful a day, and the CDN could hand back the version just
  // replaced.
  useCdn: false,
  perspective: "published",
});
