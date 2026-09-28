import type { Metadata } from "next";

/**
 * Per-page metadata, built one way everywhere.
 *
 * Why a helper: Next merges metadata SHALLOWLY, so a page that sets `openGraph`
 * replaces the layout's whole object, images and site name included. Pages
 * that set none inherited the layout's `og:url` of "/", so every page told
 * social cards and crawlers it was the homepage (found 2026-09-26). This sets
 * the canonical and og:url from one `path`, so they cannot disagree (SEO
 * System §7), and carries the shared card fields every time.
 */

export const SITE_NAME = "Smarthaus";

/**
 * What the card graphic shows: brand, tagline, parent company and location,
 * rather than the page title.
 */
export const OG_IMAGE_ALT =
  "Smarthaus: smarter living for a brighter tomorrow. Home automation by Maple Technologies Security Systems LLC, Dubai, U.A.E.";

/**
 * Both cards, landscape first. Declared here rather than by the
 * opengraph-image file convention, which emits exactly one og:image and drops
 * any array beside it; the square is what WhatsApp, Slack and iMessage crop to.
 * Order matters: Facebook and X take the first.
 */
export const OG_IMAGES = [
  { url: "/og-image.png", width: 1200, height: 630, alt: OG_IMAGE_ALT },
  { url: "/og-image-square.png", width: 1200, height: 1200, alt: OG_IMAGE_ALT },
];

/**
 * The robots line SEO System §2 asks for on every public page: large image
 * previews and uncapped snippets, which a bare "index, follow" does not grant.
 */
export const INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  "max-image-preview": "large",
  "max-snippet": -1,
  "max-video-preview": -1,
} as const;

/** A draft or placeholder: out of search, links still followed. */
export const NOINDEX_ROBOTS = { index: false, follow: true } as const;

/** SEO System §2, snippet ranges. Only indexable pages are held to them. */
export const TITLE_RANGE = [30, 60] as const;
export const DESCRIPTION_RANGE = [120, 160] as const;

export type PageMetadataInput = {
  /** Site-relative path, "/" or "/contact". The canonical and og:url. */
  path: string;
  /**
   * The page's own title. The layout's template adds " | Smarthaus" unless
   * `absolute` is set, and the length rule counts the result.
   */
  title: string;
  absolute?: boolean;
  description: string;
  /** False for drafts and placeholders. */
  index: boolean;
};

/** The full title a browser tab and a search result show. */
export function fullTitle({ title, absolute }: Pick<PageMetadataInput, "title" | "absolute">) {
  return absolute ? title : `${title} | ${SITE_NAME}`;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { path, description, index } = input;
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) {
    throw new Error(`pageMetadata: "${path}" is not a clean site-relative path`);
  }
  const title = fullTitle(input);
  if (index) {
    const [tMin, tMax] = TITLE_RANGE;
    const [dMin, dMax] = DESCRIPTION_RANGE;
    if (title.length < tMin || title.length > tMax) {
      throw new Error(
        `pageMetadata: "${title}" is ${title.length} characters; an indexable title needs ${tMin}-${tMax} (SEO System §2)`,
      );
    }
    if (description.length < dMin || description.length > dMax) {
      throw new Error(
        `pageMetadata: the description for ${path} is ${description.length} characters; an indexable page needs ${dMin}-${dMax} (SEO System §2)`,
      );
    }
  }
  return {
    title: input.absolute ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical: path },
    robots: index ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS,
    openGraph: {
      type: "website",
      locale: "en_AE",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: OG_IMAGES,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // The landscape only: X shows one image for this card type.
      images: [OG_IMAGES[0]!],
    },
  };
}
