// Turns seed content (the render shape the components take) into Sanity
// documents, guided by the Studio's own schema: copy is wrapped as { en },
// pictures become uploads, array items get keys. The inverse of
// src/sanity/localize.ts, and src/sanity/__tests__/seed.test.ts holds the two
// to each other, so the schema, the seed and the components cannot drift.
//
// Strict both ways: a seed value with no field to hold it, or a required field
// with no value, throws, naming the path.
import path from "node:path";
import { schemaTypes } from "../../src/sanity/schema";
import type { SchemaField } from "../../src/sanity/schema/primitives";
import type { Picture } from "../../src/sanity/localize";

const PUBLIC_DIR = path.resolve(__dirname, "../../public");
const byName = new Map(schemaTypes.map((t) => [t.name, t] as const));
const SCALARS = new Set(["string", "text", "boolean", "number", "url", "date", "datetime"]);

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function fail(at: string, message: string): never {
  throw new Error(`seed ${at}: ${message}`);
}

function isRequired(field: SchemaField): boolean {
  if (!field.validation) return false;
  let required = false;
  const rule = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "required") required = true;
        return () => rule;
      },
    },
  );
  field.validation(rule as never);
  return required;
}

function objectFields(field: SchemaField): SchemaField[] | null {
  if (field.fields && field.type !== "image") return field.fields;
  const named = byName.get(field.type);
  if (named?.fields && named.type === "object") return named.fields;
  return null;
}

function convertObject(fields: SchemaField[], value: unknown, at: string): Record<string, Json> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(at, "expected an object");
  }
  const source = value as Record<string, unknown>;
  const known = new Set(fields.map((f) => f.name));
  for (const key of Object.keys(source)) {
    if (!known.has(key)) fail(`${at}.${key}`, "no schema field holds this value");
  }
  const out: Record<string, Json> = {};
  for (const field of fields) {
    const converted = convert(field, source[field.name], `${at}.${field.name}`);
    if (converted !== undefined) out[field.name] = converted;
  }
  return out;
}

function picture(value: unknown, at: string): Json {
  const p = value as Partial<Picture>;
  if (typeof p?.src !== "string" || !p.src.startsWith("/"))
    fail(at, "a picture needs a public path");
  const out: Record<string, Json> = {
    _type: "figure",
    _sanityAsset: `image@file://${path.join(PUBLIC_DIR, p.src)}`,
  };
  if (p.alt) out.alt = { _type: "localeString", en: p.alt };
  if (p.stock) out.stock = true;
  return out;
}

export function convert(field: SchemaField, value: unknown, at: string): Json | undefined {
  if (value === undefined || value === null) {
    if (isRequired(field)) fail(at, "required, and the seed has no value");
    return undefined;
  }
  const { type } = field;

  if (type === "localeString" || type === "localeText") {
    if (typeof value !== "string") fail(at, "copy must be a string");
    return { _type: type, en: value };
  }
  if (type === "figure") return picture(value, at);
  // Rich text is stored as it is written: the seed already holds Portable
  // Text, keys and all, so it is wrapped, not walked.
  if (type === "localeBlocks") {
    if (!Array.isArray(value)) fail(at, "rich text must be a list of blocks");
    return { _type: type, en: value as Json[] };
  }
  // An article's text, likewise, except that its pictures are uploads.
  if (type === "localeArticle") {
    if (!Array.isArray(value)) fail(at, "an article's text must be a list of blocks");
    const nodes = (value as Record<string, unknown>[]).map((node, i): Json => {
      if (node._type !== "articleImage") return node as Json;
      return {
        _type: "articleImage",
        _key: node._key as string,
        image: picture(node.image, `${at}[${i}].image`),
        ...(typeof node.caption === "string"
          ? { caption: { _type: "localeString", en: node.caption } }
          : {}),
      };
    });
    return { _type: type, en: nodes };
  }
  if (SCALARS.has(type)) {
    if (typeof value === "object") fail(at, `expected a ${type}`);
    return value as Json;
  }
  if (type === "array") {
    if (!Array.isArray(value)) fail(at, "expected a list");
    const member = field.of?.[0];
    if (!member) fail(at, "array field has no member type");
    return value.map((item, i) => {
      const converted = convert(member, item, `${at}[${i}]`);
      if (converted === null || typeof converted !== "object" || Array.isArray(converted)) {
        return converted as Json;
      }
      const id = (item as { id?: unknown }).id;
      return {
        _key: typeof id === "string" ? id : `k${i}`,
        ...(converted._type ? {} : { _type: member.name }),
        ...converted,
      } as Json;
    });
  }

  const fields = objectFields(field);
  if (!fields) fail(at, `unknown field type "${type}"`);
  const converted = convertObject(fields, value, at);
  return byName.has(type) ? { _type: type, ...converted } : converted;
}

export type SeedEntry = { id: string; type: string; value: unknown };

/** One Sanity document, ready for `sanity dataset import`. */
export function toDocument({ id, type, value }: SeedEntry): Record<string, Json> {
  const schema = byName.get(type);
  if (!schema || schema.type !== "document") fail(id, `"${type}" is not a document type`);
  return { _id: id, _type: type, ...convertObject(schema.fields!, value, id) };
}
