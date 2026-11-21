// For the Sanity CLI (dataset import, CORS, tokens), run from the repo root
// with Node 22.12 or later. Same project as the site. A plain object: the
// CLI's loader could not resolve defineCliConfig here ("Class extends value
// undefined"), and defineCliConfig only returns its argument.
const config = {
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "nqc5m5ls",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  },
};

export default config;
