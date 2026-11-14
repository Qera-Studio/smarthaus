/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";
import { SEED, seedDoc } from "../../../sanity/seed";
import { convert, toDocument } from "../../../sanity/seed/to-documents";
import { localize } from "../localize";
import { COLLECTIONS, FIXED_DOCUMENTS, SINGLETONS, schemaTypes } from "../schema";
import { claimProblem } from "../claims";
// The render types are declarations only. Loading the module once lets the
// coverage report see it has no executable lines, rather than counting every
// declaration as a line no test ran.
import "../types";

/**
 * The seed is today's content in the shape the components render; the schema
 * is what the Studio stores; localize() turns one into the other at read time.
 * These hold the three to each other: every seeded document converts into the
 * schema with nothing left over and nothing required missing, and reading it
 * back gives exactly what the components were given.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** What `sanity dataset import` does with an upload: an asset reference. */
function imported(value: Json): Json {
  if (Array.isArray(value)) return value.map(imported);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "_sanityAsset") {
      out.asset = { _type: "reference", _ref: "image-0a1b2c-10x10-png" };
    } else out[key] = imported(child);
  }
  return out;
}

/** A picture's file and size are the upload's; its words and flag are the seed's. */
function withoutFiles(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutFiles);
  if (value === null || typeof value !== "object") return value;
  const node = value as Record<string, unknown>;
  if (typeof node.src === "string" && "width" in node && "alt" in node) {
    const { src: _src, width: _w, height: _h, ...rest } = node;
    void _src;
    void _w;
    void _h;
    return rest;
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, withoutFiles(v)]));
}

const sanityAssets = (doc: Json): string[] =>
  JSON.stringify(doc).match(/image@file:\/\/[^"]+/g) ?? [];

describe("the seed", () => {
  it.each(SEED.map((entry) => [entry.id, entry] as const))(
    "%s converts into its schema and reads back as the same content",
    (_id, entry) => {
      const doc = toDocument(entry);
      expect(doc._id).toBe(entry.id);
      expect(doc._type).toBe(entry.type);
      expect(withoutFiles(localize(imported(doc)))).toEqual(withoutFiles(entry.value));
    },
  );

  it.each(SEED.map((entry) => [entry.id, entry] as const))(
    "%s uploads only pictures that exist in public/",
    (_id, entry) => {
      for (const asset of sanityAssets(toDocument(entry))) {
        expect(existsSync(asset.replace("image@file://", ""))).toBe(true);
      }
    },
  );

  it("has one document per singleton and per fixed route, the articles, and nothing else", () => {
    const fixed = Object.values(FIXED_DOCUMENTS).flatMap((ids) => Object.keys(ids));
    const creatable: readonly string[] = COLLECTIONS;
    const written = SEED.filter((e) => creatable.includes(e.type));
    expect(
      SEED.filter((e) => !creatable.includes(e.type))
        .map((e) => e.id)
        .sort(),
    ).toEqual([...SINGLETONS, ...fixed].sort());
    // An article's id is its type and its slug, so its address is its id's.
    expect(written.length).toBeGreaterThanOrEqual(4);
    for (const { id, value } of written) {
      expect(id).toBe(`post-${(value as { slug: string }).slug}`);
    }
    expect(new Set(written.map((e) => e.id)).size).toBe(written.length);
  });

  it("gives every document type in the schema a seeded document", () => {
    const seeded = new Set(SEED.map((e) => e.type));
    for (const type of schemaTypes.filter((t) => t.type === "document")) {
      expect(seeded).toContain(type.name);
    }
  });

  it("keeps no id with a dot, which Sanity would make private to a public read", () => {
    for (const { id } of SEED) expect(id).not.toContain(".");
  });

  it("serves a document by id, as getDoc would", () => {
    expect(seedDoc("siteSettings")).toBe(SEED[0]!.value);
    expect(() => seedDoc("nope")).toThrow('no document "nope"');
  });

  it("passes the claims audit in every line of copy it publishes", () => {
    const copy: string[] = [];
    const walk = (value: Json) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        if (
          (value._type === "localeString" || value._type === "localeText") &&
          typeof value.en === "string"
        ) {
          copy.push(value.en);
        } else Object.values(value).forEach(walk);
      }
    };
    for (const entry of SEED) walk(toDocument(entry));
    expect(copy.length).toBeGreaterThan(100);
    expect(copy.map((text) => [text, claimProblem(text)]).filter(([, p]) => p)).toEqual([]);
  });
});

describe("the converter, strict both ways", () => {
  const settings = schemaTypes.find((t) => t.name === "siteSettings")!;
  const value = seedDoc("siteSettings") as Record<string, unknown>;

  it("refuses a seed value no schema field can hold, naming its path", () => {
    expect(() =>
      toDocument({ id: "siteSettings", type: "siteSettings", value: { ...value, extra: 1 } }),
    ).toThrow("siteSettings.extra: no schema field holds this value");
  });

  it("refuses a required field the seed leaves empty", () => {
    const { footer: _footer, ...rest } = value;
    void _footer;
    expect(() => toDocument({ id: "siteSettings", type: "siteSettings", value: rest })).toThrow(
      "siteSettings.footer: required",
    );
  });

  it("refuses a document type that is not one", () => {
    expect(() => toDocument({ id: "x", type: "localeString", value: {} })).toThrow(
      "not a document type",
    );
  });

  it.each([
    [{ name: "t", type: "localeString" }, 3, "copy must be a string"],
    [{ name: "t", type: "string" }, {}, "expected a string"],
    [{ name: "t", type: "array", of: [{ name: "x", type: "string" }] }, "a", "expected a list"],
    [{ name: "t", type: "array" }, [], "array field has no member type"],
    [{ name: "t", type: "figure" }, { src: "relative.png" }, "a picture needs a public path"],
    [{ name: "t", type: "localeBlocks" }, "text", "rich text must be a list of blocks"],
    [{ name: "t", type: "mystery" }, {}, 'unknown field type "mystery"'],
    [{ name: "t", type: "object", fields: [] }, "x", "expected an object"],
  ])("refuses a wrong value for %j", (field, bad, message) => {
    expect(() => convert(field as never, bad, "at")).toThrow(message);
  });

  it("keeps a list of plain values as it is, with no keys to add", () => {
    expect(
      convert({ name: "t", type: "array", of: [{ name: "x", type: "string" }] }, ["a"], "at"),
    ).toEqual(["a"]);
  });

  it("leaves an optional empty field out", () => {
    expect(convert({ name: "t", type: "string" }, undefined, "at")).toBeUndefined();
  });

  it("keys a list item by its own id, or by its place when it has none", () => {
    const field = settings.fields!.find((f) => f.name === "socials")!;
    const socials = convert(field, value.socials, "at") as { _key: string }[];
    expect(socials[0]!._key).toBe("whatsapp");
    const links = convert(
      settings.fields!.find((f) => f.name === "pageLinks")!,
      value.pageLinks,
      "at",
    ) as { _key: string; _type: string }[];
    // Six since the articles page joined the footer (2026-11-14).
    expect(links.map((l) => l._key)).toEqual(["k0", "k1", "k2", "k3", "k4", "k5"]);
    expect(links[0]!._type).toBe("link");
  });
});
