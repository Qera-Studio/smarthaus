// Turns a Sanity document into the shape the components render: copy as plain
// English strings, pictures as { src, width, height, alt }, and Sanity's own
// bookkeeping (_type, _key, _rev) gone. One generic walk instead of a GROQ
// projection per field, so a new field needs no query change.
//
// English only until V2: when Arabic ships, this takes the locale.
import { dataset, projectId } from "./env";

export type Picture = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Set while the picture is licensed stock standing in for our own work. */
  stock?: true;
};

const ASSET_ID = /^image-([0-9a-f]+)-(\d+)x(\d+)-([a-z0-9]+)$/;

/**
 * The CDN URL and size of an image, read from its asset id, which Sanity
 * builds as image-<hash>-<width>x<height>-<format>. No second query.
 */
export function pictureFromRef(ref: string): Omit<Picture, "alt" | "stock"> {
  const m = ref.match(ASSET_ID);
  if (!m) throw new Error(`Sanity: "${ref}" is not an image asset id`);
  const [, hash, width, height, format] = m;
  return {
    src: `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${width}x${height}.${format}`,
    width: Number(width),
    height: Number(height),
  };
}

type Node = { [key: string]: unknown; _type?: string };

export function localize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(localize);
  if (value === null || typeof value !== "object") return value;
  const node = value as Node;

  switch (node._type) {
    case "localeString":
    case "localeText":
      return node.en ?? "";
    // Rich text is handed over untouched: its renderer needs _type and _key.
    case "localeBlocks":
      return node.en ?? [];
    // An article's text is handed over the same way, with each picture in it
    // turned into what the page draws.
    case "localeArticle":
      return ((node.en as Node[] | undefined) ?? []).map((child) =>
        child._type === "articleImage"
          ? {
              _type: child._type,
              _key: child._key,
              image: localize(child.image),
              ...(child.caption ? { caption: localize(child.caption) } : {}),
            }
          : child,
      );
    case "figure": {
      const asset = node.asset as { _ref?: string } | undefined;
      if (!asset?._ref) throw new Error("Sanity: a picture has no image uploaded");
      const picture = { ...pictureFromRef(asset._ref), alt: localize(node.alt ?? "") };
      return node.stock ? { ...picture, stock: true } : picture;
    }
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(node)) {
    if (key === "_updatedAt") out.updatedAt = child;
    else if (!key.startsWith("_")) out[key] = localize(child);
  }
  return out;
}
