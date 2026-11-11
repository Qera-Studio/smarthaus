/**
 * One-off: turns the hand-written legal pages (privacy, terms, accessibility,
 * as they were at commit 8a38290) into Portable Text seed files, so the
 * wording moves to Sanity exactly as published. Run once, under Jest because
 * the pages are TSX with SCSS imports:
 *
 *   pnpm jest --rootDir . --testRegex 'sanity/seed/extract-legal\.run\.tsx$'
 *
 * Kept for the record of how sanity/seed/legal/*.json were made. The pages it
 * reads no longer exist after the migration; restore them from git to re-run.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import Link from "next/link";

const CONTACT = {
  EMAIL: "hello@smarthaus.ae",
  PHONE_DISPLAY: "+971 54 375 5150",
  PHONE_E164: "+971543755150",
  ADDRESS: "The Iridium, 2nd Floor, Office 225, Umm Suqeim St, Al Barsha First, Dubai",
};

// The pages imported these before the migration; they are supplied here so the
// old pages render, and the extractor turns each back into a contact token.
jest.mock("../../src/lib/contact", () => ({
  EMAIL: "hello@smarthaus.ae",
  PHONE_DISPLAY: "+971 54 375 5150",
  PHONE_E164: "+971543755150",
  ADDRESS: "The Iridium, 2nd Floor, Office 225, Umm Suqeim St, Al Barsha First, Dubai",
  whatsappLink: (message?: string) => `wa:${message ?? ""}`,
}));

import {
  LegalDefTable,
  LegalPage,
  LegalSectionBlock,
  LegalTable,
  Placeholder,
} from "../../src/components/LegalPage";

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type Inline = { _type: string; _key: string; [k: string]: unknown };
type Block = {
  _type: string;
  _key: string;
  style?: string;
  listItem?: string;
  level?: number;
  markDefs?: { _type: "link"; _key: string; href: string }[];
  children?: (Span | Inline)[];
  [k: string]: unknown;
};

let n = 0;
const key = () => `k${(n++).toString(36)}`;

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    if (el.type === Placeholder) return `{${textOf(el.props.children)}}`;
    return textOf(el.props.children);
  }
  return "";
}

/** Splits text on the contact values, so they become tokens from the settings. */
function withContacts(text: string, marks: string[], date: string | null): (Span | Inline)[] {
  const tokens: [string, Inline][] = [
    [CONTACT.EMAIL, { _type: "contactValue", _key: "", field: "email" }],
    [CONTACT.PHONE_DISPLAY, { _type: "contactValue", _key: "", field: "phone" }],
  ];
  if (date) tokens.push([date, { _type: "updatedDate", _key: "", show: true }]);
  for (const [value, token] of tokens) {
    const at = text.indexOf(value);
    if (at >= 0) {
      return [
        ...withContacts(text.slice(0, at), marks, date),
        { ...token, _key: key() },
        ...withContacts(text.slice(at + value.length), marks, date),
      ];
    }
  }
  return text ? [{ _type: "span", _key: key(), text, marks }] : [];
}

function inline(
  node: ReactNode,
  marks: string[],
  defs: NonNullable<Block["markDefs"]>,
  date: string | null,
): (Span | Inline)[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") {
    return withContacts(String(node), marks, date);
  }
  if (Array.isArray(node)) return node.flatMap((c) => inline(c, marks, defs, date));
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<{ children?: ReactNode; href?: string }>;
  const kids = el.props.children;
  if (el.type === "strong") return inline(kids, [...marks, "strong"], defs, date);
  if (el.type === "em") return inline(kids, [...marks, "em"], defs, date);
  if (el.type === Placeholder) return inline(kids, [...marks, "placeholder"], defs, date);
  if (el.type === "a" || el.type === Link) {
    const href = String(el.props.href);
    if (href.startsWith("mailto:")) return [{ _type: "contactValue", _key: key(), field: "email" }];
    if (href.startsWith("tel:")) return [{ _type: "contactValue", _key: key(), field: "phone" }];
    if (href.startsWith("wa:")) {
      return [
        {
          _type: "contactValue",
          _key: key(),
          field: "whatsapp",
          label: textOf(kids),
          message: href.slice(3),
        },
      ];
    }
    const def = { _type: "link" as const, _key: key(), href };
    defs.push(def);
    return inline(kids, [...marks, def._key], defs, date);
  }
  throw new Error(`extract: unexpected inline <${String(el.type)}>`);
}

/** Joins neighbouring spans with the same marks, as an editor would type them. */
function merge(children: (Span | Inline)[]): (Span | Inline)[] {
  const out: (Span | Inline)[] = [];
  for (const child of children) {
    const last = out[out.length - 1];
    if (
      child._type === "span" &&
      last?._type === "span" &&
      (last as Span).marks.join() === (child as Span).marks.join()
    ) {
      (last as Span).text += (child as Span).text;
    } else out.push(child);
  }
  return out;
}

function textBlock(
  node: ReactNode,
  style: string,
  date: string | null,
  list?: [string, number],
): Block {
  const markDefs: NonNullable<Block["markDefs"]> = [];
  const children = merge(inline(node, [], markDefs, date));
  return {
    _type: "block",
    _key: key(),
    style,
    ...(list ? { listItem: list[0], level: list[1] } : {}),
    markDefs,
    children,
  };
}

function rowsOf(node: ReactNode): ReactElement<{ children?: ReactNode }>[] {
  const out: ReactElement<{ children?: ReactNode }>[] = [];
  const walk = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    if (el.type === "tr") out.push(el);
    else walk(el.props.children);
  };
  walk(node);
  return out;
}

function cells(row: ReactElement<{ children?: ReactNode }>): string[] {
  const list = Array.isArray(row.props.children) ? row.props.children : [row.props.children];
  return list.filter(isValidElement).map((c) => textOf(c).replace(/\s+/g, " ").trim());
}

function blocks(node: ReactNode, date: string | null, level = 1): Block[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap((c) => blocks(c, date, level));
  if (typeof node === "string") {
    if (node.trim()) throw new Error(`extract: stray text "${node}"`);
    return [];
  }
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>;
  if (el.type === "p") return [textBlock(el.props.children, "normal", date)];
  if (el.type === "h3") return [textBlock(el.props.children, "h3", date)];
  if (el.type === "ul" || el.type === "ol") {
    const kind = el.type === "ul" ? "bullet" : "number";
    const items = (
      Array.isArray(el.props.children) ? el.props.children : [el.props.children]
    ).filter(isValidElement) as ReactElement<{ children?: ReactNode }>[];
    return items.flatMap((li) => {
      const kids = Array.isArray(li.props.children) ? li.props.children : [li.props.children];
      const nested = kids.filter((k) => isValidElement(k) && (k.type === "ul" || k.type === "ol"));
      const own = kids.filter((k) => !nested.includes(k));
      return [
        textBlock(own, "normal", date, [kind, level]),
        ...nested.flatMap((k) => blocks(k, date, level + 1)),
      ];
    });
  }
  if (el.type === LegalTable) {
    const caption = String(el.props.caption ?? "");
    const all = rowsOf(el.props.children);
    const [head, ...body] = all;
    return [
      {
        _type: "legalTable",
        _key: key(),
        caption,
        ...(caption.startsWith("Service providers currently")
          ? { role: "processorsActive" }
          : caption.startsWith("Service providers planned")
            ? { role: "processorsPlanned" }
            : {}),
        columns: cells(head!),
        rows: body.map((r) => ({ _type: "row", _key: key(), cells: cells(r) })),
      },
    ];
  }
  if (el.type === LegalDefTable) {
    const rows = el.props.rows as { label: string; value: ReactNode }[];
    return [
      {
        _type: "defTable",
        _key: key(),
        caption: String(el.props.caption),
        rows: rows.map(({ label, value }) => {
          const text = textOf(value);
          const contact =
            text === CONTACT.EMAIL
              ? "email"
              : text === CONTACT.PHONE_DISPLAY
                ? "phone"
                : text === CONTACT.ADDRESS
                  ? "address"
                  : null;
          return {
            _type: "defRow",
            _key: key(),
            label,
            ...(contact ? { contact } : { value: text }),
          };
        }),
      },
    ];
  }
  if (typeof el.type === "function" && el.type.name === "JsonLd") return [];
  // Fragments and wrappers: walk through.
  return blocks(el.props.children, date, level);
}

type PageModule = {
  default: () => ReactElement;
  metadata: {
    title: string | { absolute: string };
    description: string;
    robots: { index: boolean };
  };
};

function extract(
  mod: PageModule,
  opts: { updated?: string; dateLabel?: string; changelog: object[] },
) {
  n = 0;
  const find = (node: ReactNode): ReactElement | null => {
    if (Array.isArray(node)) {
      for (const c of node) {
        const hit = find(c);
        if (hit) return hit;
      }
      return null;
    }
    if (!isValidElement(node)) return null;
    if (node.type === LegalPage) return node;
    return find((node.props as { children?: ReactNode }).children);
  };
  const root = find(mod.default());
  if (!root) throw new Error("extract: no LegalPage");
  const props = root.props as {
    title: string;
    standfirst: string;
    lastUpdated?: string;
    version?: string;
    children: ReactNode;
  };
  const date = opts.dateLabel ?? null;
  const kids = Array.isArray(props.children) ? props.children : [props.children];
  const intro: Block[] = [];
  const sections: object[] = [];
  for (const child of kids.flat()) {
    if (isValidElement(child) && child.type === LegalSectionBlock) {
      const { section, children } = child.props as {
        section: { id: string; title: string; short?: string };
        children: ReactNode;
      };
      sections.push({
        id: section.id,
        title: section.title,
        ...(section.short ? { short: section.short } : {}),
        body: blocks(children, date),
      });
    } else intro.push(...blocks(child, date));
  }
  const title = mod.metadata.title;
  return {
    seo: {
      title: typeof title === "string" ? title : title.absolute,
      ...(typeof title === "string" ? {} : { absolute: true }),
      description: mod.metadata.description,
      index: mod.metadata.robots.index,
    },
    title: props.title,
    standfirst: props.standfirst,
    status: "draft",
    ...(props.version ? { version: props.version } : {}),
    updatedLabel: opts.dateLabel ? "Assessed" : String(props.lastUpdated),
    ...(opts.updated ? { updated: opts.updated } : {}),
    ...(intro.length ? { intro } : {}),
    sections,
    changelog: opts.changelog,
  };
}

const MIGRATED = "Moved into Sanity from the repository. Wording unchanged.";

it("writes the legal seed", () => {
  const out = path.join(__dirname, "legal");
  /* eslint-disable @typescript-eslint/no-require-imports */
  const privacy = extract(require("../../src/app/privacy/page") as PageModule, {
    changelog: [
      {
        version: "0.5.0-draft",
        date: "2026-11-11",
        note: `Sanity moved to section 4.1: the content studio runs at /studio for our own editors and receives nothing about visitors. ${MIGRATED}`,
      },
      {
        version: "0.4.1-draft",
        date: "2026-11-04",
        note: "Brought the Resend region and the analytics tools together. Nothing else changed.",
      },
      {
        version: "0.4.0-draft",
        date: "2026-11-04",
        note: "Google Analytics 4 moved to section 4.1: it runs only after an accept.",
      },
      {
        version: "0.3.0-draft",
        date: "2026-11-04",
        note: "Microsoft Clarity moved to section 4.1: cookieless until a visitor chooses, off on a decline.",
      },
      {
        version: "0.2.1-draft",
        date: "2026-11-04",
        note: "Resend's region corrected to Tokyo, Japan, and named in section 5.",
      },
      {
        version: "0.2.0-draft",
        date: "2026-09-26",
        note: "Corrected three statements the build contradicted: Resend in use, the only cookie is the consent record, and which form fields are required.",
      },
    ],
  });
  const terms = extract(require("../../src/app/terms/page") as PageModule, {
    changelog: [{ version: "0.1.0-draft", date: "2026-09-13", note: `First draft. ${MIGRATED}` }],
  });
  const accessibility = extract(require("../../src/app/accessibility/page") as PageModule, {
    updated: "2026-09-27",
    dateLabel: "27 September 2026",
    changelog: [{ version: "2026-09-27", date: "2026-09-27", note: `Assessed. ${MIGRATED}` }],
  });
  /* eslint-enable @typescript-eslint/no-require-imports */
  for (const [name, doc] of Object.entries({ privacy, terms, accessibility })) {
    writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(doc, null, 2)}\n`);
  }
  expect(privacy.sections.length).toBe(12);
});
