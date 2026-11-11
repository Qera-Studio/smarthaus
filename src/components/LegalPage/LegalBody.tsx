import Link from "next/link";
import type { ReactNode } from "react";

import { whatsappLink } from "../../lib/contact";
import type { PtBlock, PtInline, PtNode, PtSpan, SiteSettings } from "../../sanity/types";
import { Placeholder } from "./LegalPage";
import { LegalDefTable, LegalTable } from "./LegalTable";

/**
 * Renders a legal document's Portable Text: paragraphs and subheadings, lists,
 * bold, italic, links, the amber placeholder marker, tables, and contact
 * details read from the site settings so a policy can never print an old
 * number.
 *
 * Written here rather than through @portabletext/react: these pages use a
 * small, fixed set of types, the renderer runs only on the server, and this
 * keeps it testable in Jest, which cannot load that package. A type it does
 * not know throws, so a schema change cannot silently drop text from a policy.
 */

type Context = { contact: SiteSettings["contact"]; date: string };

/** A {braced} part of a table cell is a fact still to be confirmed. */
export function withPlaceholders(text: string): ReactNode[] {
  return text
    .split(/(\{[^}]+\})/)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith("{") && part.endsWith("}") ? (
        <Placeholder key={i}>{part.slice(1, -1)}</Placeholder>
      ) : (
        part
      ),
    );
}

function contactText(field: string, ctx: Context): string {
  const { contact } = ctx;
  if (field === "email") return contact.email;
  if (field === "phone") return contact.phoneDisplay;
  if (field === "address") return contact.addressLines.join(" ");
  throw new Error(`LegalBody: no text for contact field "${field}"`);
}

function renderInline(node: PtInline, ctx: Context): ReactNode {
  if (node._type === "updatedDate") return ctx.date;
  const { contact } = ctx;
  switch (node.field) {
    case "email":
      return <a href={`mailto:${contact.email}`}>{contact.email}</a>;
    case "phone":
      return <a href={`tel:${contact.phoneE164}`}>{contact.phoneDisplay}</a>;
    case "whatsapp":
      return (
        <a
          href={whatsappLink(contact.whatsapp, node.message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {node.label ?? contact.phoneDisplay}
        </a>
      );
    case "address":
      return contactText("address", ctx);
  }
}

function renderSpan(span: PtSpan, block: PtBlock): ReactNode {
  let out: ReactNode = span.text;
  for (const mark of [...(span.marks ?? [])].reverse()) {
    if (mark === "strong") out = <strong>{out}</strong>;
    else if (mark === "em") out = <em>{out}</em>;
    else if (mark === "placeholder") out = <Placeholder>{out}</Placeholder>;
    else {
      const def = block.markDefs?.find((d) => d._key === mark);
      if (!def) throw new Error(`LegalBody: unknown mark "${mark}"`);
      out = def.href.startsWith("/") ? (
        <Link href={def.href}>{out}</Link>
      ) : (
        <a href={def.href} target="_blank" rel="noopener noreferrer">
          {out}
        </a>
      );
    }
  }
  return out;
}

function renderChildren(block: PtBlock, ctx: Context): ReactNode[] {
  return block.children.map((child) => (
    <ChildKey key={child._key}>
      {child._type === "span" ? renderSpan(child, block) : renderInline(child, ctx)}
    </ChildKey>
  ));
}

/** A keyed fragment, so mixed children keep stable keys without a wrapper. */
function ChildKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type ListItem = PtBlock & { listItem: "bullet" | "number" };

/** Consecutive list items become one list; a deeper level nests in the last item. */
function renderList(items: ListItem[], ctx: Context, level = 1): ReactNode {
  const Tag = items[0]!.listItem === "number" ? "ol" : "ul";
  const groups: { item: ListItem; nested: ListItem[] }[] = [];
  for (const item of items) {
    if ((item.level ?? 1) > level && groups.length > 0)
      groups[groups.length - 1]!.nested.push(item);
    else groups.push({ item, nested: [] });
  }
  return (
    <Tag key={items[0]!._key}>
      {groups.map(({ item, nested }) => (
        <li key={item._key}>
          {renderChildren(item, ctx)}
          {nested.length > 0 ? renderList(nested, ctx, level + 1) : null}
        </li>
      ))}
    </Tag>
  );
}

function renderNode(node: PtNode, ctx: Context): ReactNode {
  switch (node._type) {
    case "block":
      if (node.style === "h3") return <h3 key={node._key}>{renderChildren(node, ctx)}</h3>;
      if (node.style && node.style !== "normal") {
        throw new Error(`LegalBody: unknown block style "${node.style}"`);
      }
      return <p key={node._key}>{renderChildren(node, ctx)}</p>;
    case "legalTable": {
      const [first, ...rest] = node.columns;
      return (
        <LegalTable key={node._key} caption={node.caption}>
          <thead>
            <tr>
              <th scope="col">{first}</th>
              {rest.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((row) => {
              const [head, ...cells] = row.cells;
              return (
                <tr key={row._key}>
                  <th scope="row">{withPlaceholders(head ?? "")}</th>
                  {cells.map((cell, i) => (
                    <td key={i}>{withPlaceholders(cell)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </LegalTable>
      );
    }
    case "defTable":
      return (
        <LegalDefTable
          key={node._key}
          caption={node.caption}
          rows={node.rows.map((row) => ({
            label: row.label,
            value: row.contact ? contactText(row.contact, ctx) : (row.value ?? ""),
          }))}
        />
      );
    default:
      throw new Error(`LegalBody: unknown node "${(node as { _type: string })._type}"`);
  }
}

export function LegalBody({
  blocks,
  contact,
  date = "",
}: {
  blocks: readonly PtNode[];
  contact: SiteSettings["contact"];
  /** The document's own date, as written, for an inline date token. */
  date?: string;
}) {
  const ctx: Context = { contact, date };
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const node = blocks[i]!;
    if (node._type === "block" && node.listItem) {
      const run: ListItem[] = [];
      while (i < blocks.length) {
        const next = blocks[i]!;
        if (next._type !== "block" || !next.listItem) break;
        if ((next.level ?? 1) === 1 && next.listItem !== node.listItem && run.length > 0) break;
        run.push(next as ListItem);
        i += 1;
      }
      i -= 1;
      out.push(renderList(run, ctx));
    } else out.push(renderNode(node, ctx));
  }
  return <>{out}</>;
}
