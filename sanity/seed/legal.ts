// Seed for the three legalPage documents: Portable Text made from the
// hand-written pages by extract-legal.run.tsx on 2026-11-11, wording
// unchanged. The drafting notes and placeholder registers that sat beside them
// in markdown are kept, unpublished, in docs/legal/.
import type { LegalDocument } from "../../src/sanity/types";
import accessibility from "./legal/accessibility.json";
import privacy from "./legal/privacy.json";
import terms from "./legal/terms.json";

export const LEGAL = {
  privacy: privacy as LegalDocument,
  terms: terms as LegalDocument,
  accessibility: accessibility as LegalDocument,
};
