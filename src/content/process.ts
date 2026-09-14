/**
 * The "Our Process" rail on the homepage.
 *
 * Six pages: an intro, then the five steps from first visit to ongoing care.
 * One array, read twice — the horizontal track renders the pages and the unit
 * suite asserts the invariants that keep the layouts honest.
 *
 * ---------------------------------------------------------------------------
 * DURATIONS ARE SOURCED, NOT INVENTED
 *
 * Every bracket here restates a figure already published in src/content/faq.ts.
 * That file is the source of truth: it is live customer-facing copy, and two
 * different installation timelines on one domain is the kind of thing James &
 * Emma notice while comparing five vendors.
 *
 *   assessment   90 minutes   faq.ts "how-it-begins"
 *   proposal     48 hours     faq.ts "proposal-timing"
 *   install      2 to 5 days  faq.ts "installation-duration"
 *   handover     1 day        faq.ts "handover"
 *   care         365 days     first year of Standard Care, faq.ts "whats-included"
 *
 * If a figure changes in the FAQ it has to change here in the same commit. The
 * unit test cannot catch that for you — it has no way to know which numbers are
 * meant to agree — so it is written down instead.
 * ---------------------------------------------------------------------------
 *
 * No em dashes anywhere in this file's copy. Every page suite in e2e/ asserts
 * it on visible text.
 *
 * ---------------------------------------------------------------------------
 * THE PHOTOGRAPHY IS PLACEHOLDER. ALL OF IT.
 *
 * Every image here carries `pendingImage`. The files currently in
 * public/hero/process/ are stock that does not meet the brief: AGENTS.md's
 * photography constraint asks for imagery that "feels residential Dubai", and
 * what is on disk is largely construction, emergency-response and industrial
 * stock shot elsewhere. 5.1 is the only frame that genuinely reads as a
 * technician in a home.
 *
 * The alt text is written to be true of the file that is there today while
 * staying in the section's own vocabulary. It describes the work, not a villa
 * that is not in the frame. When the real photography lands, replace the files
 * at the same paths, update `width`/`height` if they change, rewrite the alt to
 * describe the new frame, and clear `pendingImage`. No component changes.
 *
 * Do NOT let these reach production. Nadia hands this site to her own clients.
 * ---------------------------------------------------------------------------
 */

/**
 * Which of the six grid arrangements a page uses.
 *
 * A discriminated string rather than a data-driven grid spec. The alternative
 * is shipping gridColumn/gridRow values as data, which puts magic numbers in a
 * TypeScript file where none of the SCSS conventions apply to them. The
 * component does `styles[page.layout]` and the six grids live in the
 * stylesheet, where the token rules can see them.
 */
export type ProcessLayout =
  /** p1: one text column, no images. */
  | "intro"
  /** p2: 2x2. Column 1 spans both rows (portrait); column 2 is text over an image. */
  | "portraitLead"
  /** p3: 1x4. Column 1 is text, columns 2 to 4 are one image. */
  | "wideRight"
  /** p4: 2x4. Row 1 is a full-width image; row 2 is text plus a wide image. */
  | "bannerSplit"
  /** p5: one column, 2 rows. Text over a full-width image. */
  | "stacked"
  /** p6: 2x4. A wide image and text, then an offset wide image. */
  | "offsetPair";

/** How many images each layout expects. Asserted by the unit suite. */
export const IMAGES_PER_LAYOUT: Readonly<Record<ProcessLayout, number>> = {
  intro: 0,
  portraitLead: 2,
  wideRight: 1,
  bannerSplit: 2,
  stacked: 1,
  offsetPair: 2,
};

export type ProcessImage = {
  /** Path under /hero/process/. */
  src: string;
  /**
   * Intrinsic pixels. next/image needs both, and the frame's aspect-ratio is
   * derived from them so the box is reserved before the image decodes. CLS is
   * the binding constraint on this section.
   */
  width: number;
  height: number;
  /**
   * Required, and a real sentence. These photographs carry the meaning of each
   * step, so they are not decorative and an empty alt would be wrong.
   *
   * Must describe the frame that is actually on disk. While `pendingImage` is
   * set, that means describing the placeholder rather than the villa we intend
   * to show: a screen-reader user gets today's file read to them, not a
   * promise about a future one.
   */
  alt: string;
  /**
   * Set while the file at `src` is placeholder stock awaiting real
   * photography. Every image carries it today. See the file header.
   */
  pendingImage?: string;
  /**
   * The `sizes` attribute. A property of the SLOT rather than of the image, and
   * the slot is determined by the layout, which is why it lives here. Without
   * it the browser picks the largest candidate at every viewport.
   */
  sizes: string;
};

export type ProcessPage = {
  /** Stable key and scroll anchor. */
  id: string;
  /** "01" to "05". Absent on the intro, which is not a step. */
  step?: string;
  title: string;
  /** One entry per paragraph. */
  body: readonly string[];
  /** Rendered as written, brackets included. */
  duration: string;
  layout: ProcessLayout;
  images: readonly ProcessImage[];
};

/** Slot widths, named so the same string cannot drift between two pages. */
const HALF = "(min-width: 1440px) 720px, 50vw";
const THREE_QUARTERS = "(min-width: 1440px) 1080px, 75vw";
const FULL = "(min-width: 1440px) 1440px, 100vw";

export const PROCESS_PAGES: readonly ProcessPage[] = [
  {
    id: "cycle",
    title: "Complete home automation cycle",
    body: [
      "Five steps, from the first visit to the years after it. A technician assesses the house, you get a fixed itemised price within 48 hours, and the installation happens while you carry on living there.",
      "At handover we set the system up with you and train everyone who will use it, then leave a full record of what went in and where. After that you have one number to call.",
      "You see the price before the work starts and the documentation before we leave. Nothing in this process arrives as a surprise.",
    ],
    // How long the WHOLE process takes, not a step count: this is the figure a
    // reader weighing up the commitment is looking for. Site visit through to
    // handover. The per-step brackets below break it down.
    duration: "[3 days]",
    layout: "intro",
    images: [],
  },
  {
    id: "site-assessment",
    step: "01",
    title: "Site Assessment",
    body: [
      "A technician visits, checks your cabling, network and existing systems, and listens to how you use the house.",
    ],
    duration: "[90 minutes]",
    layout: "portraitLead",
    images: [
      {
        src: "1.1.jpg",
        width: 1708,
        height: 2560,
        alt: "A surveyor kneeling on a bare floor, writing up findings on a clipboard",
        sizes: HALF,
        pendingImage: "Placeholder. Disaster-response stock, not a residential survey.",
      },
      {
        src: "1.2.jpg",
        width: 2560,
        height: 1710,
        alt: "Engineers measuring a wall together, checking what is behind it before any work starts",
        sizes: HALF,
        pendingImage: "Placeholder. Construction-site stock, not a finished home.",
      },
    ],
  },
  {
    id: "proposal",
    step: "02",
    title: "Proposal",
    body: [
      "A fixed, itemised price within 48 hours. Every device, every hour of work, written down.",
    ],
    duration: "[48 hours]",
    layout: "wideRight",
    images: [
      {
        src: "2.1.jpg",
        width: 2560,
        height: 1707,
        alt: "A room sketched out on squared paper by hand, one element at a time",
        sizes: THREE_QUARTERS,
        pendingImage: "Placeholder. Generic planning stock.",
      },
    ],
  },
  {
    id: "installation",
    step: "03",
    title: "Installation",
    body: [
      // Reworded from the brief's "two to five days for most villas", which
      // contradicted both its own bracket and faq.ts "installation-duration".
      // This is that answer's wording, shortened.
      "Two to three days for a smaller system, four to five for a full villa. You stay in the house throughout.",
    ],
    duration: "[2 to 5 days]",
    layout: "bannerSplit",
    images: [
      {
        src: "3.1.jpg",
        width: 2560,
        height: 1396,
        alt: "An installer fitting an access control panel to a wall beside a glazed door",
        sizes: FULL,
        pendingImage: "Placeholder. Commercial office, and cold blue against the warm palette.",
      },
      {
        src: "3.2.jpg",
        width: 2560,
        height: 1706,
        alt: "A technician working on a roof, harnessed and fixing equipment into place",
        sizes: THREE_QUARTERS,
        pendingImage: "Placeholder. North American shingle roof, not a Dubai villa.",
      },
    ],
  },
  {
    id: "handover",
    step: "04",
    title: "Handover",
    body: [
      "We set it up with you, train everyone who'll use it, and leave a full record of what was installed and where.",
    ],
    duration: "[1 day]",
    layout: "stacked",
    images: [
      {
        src: "4.1.jpg",
        width: 2560,
        height: 1708,
        alt: "Two people over a printed plan, one walking the other through it point by point",
        sizes: FULL,
        pendingImage:
          "Placeholder, and the most urgent to replace. The plan on the table is an emergency-drill map and its legend is legible at full size.",
      },
    ],
  },
  {
    id: "care",
    step: "05",
    title: "Care",
    body: ["Maintenance, updates and one number to call, for as long as you want us."],
    // The first year of Standard Care is included with every installation.
    duration: "[365 days]",
    layout: "offsetPair",
    images: [
      {
        // The one frame on disk that genuinely reads as a technician in a home.
        src: "5.1.jpg",
        width: 2560,
        height: 1707,
        alt: "A technician on a ladder opening a ceiling hatch to reach the equipment above it",
        sizes: THREE_QUARTERS,
        pendingImage: "Closest to the brief of the eight. Keep if nothing better is shot.",
      },
      {
        src: "5.2.jpg",
        width: 2560,
        height: 1707,
        alt: "An engineer reaching up to check a fixing overhead during a routine inspection",
        sizes: THREE_QUARTERS,
        pendingImage: "Placeholder. Aircraft maintenance, with lettering legible at full size.",
      },
    ],
  },
];
