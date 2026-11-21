import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ArticleBlock, ArticleNode, PtSpan } from "../../sanity/types";
import styles from "./Blog.module.scss";

/**
 * Renders an article's text: paragraphs, two levels of heading, lists, a
 * quote, a box, bold, italic, links, and pictures between them. Server only.
 *
 * Written here rather than through @portabletext/react, as LegalBody is and
 * for its reasons: a small fixed set of types, and Jest cannot load that
 * package. A type or a style it does not know throws, so a schema change
 * cannot silently drop a paragraph from a published article.
 */

function renderSpan(span: PtSpan, block: ArticleBlock): ReactNode {
  let out: ReactNode = span.text;
  for (const mark of [...(span.marks ?? [])].reverse()) {
    if (mark === "strong") out = <strong>{out}</strong>;
    else if (mark === "em") out = <em>{out}</em>;
    else {
      const def = block.markDefs?.find((d) => d._key === mark);
      if (!def) throw new Error(`ArticleBody: unknown mark "${mark}"`);
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

const children = (block: ArticleBlock): ReactNode[] =>
  block.children.map((span) => <Span key={span._key}>{renderSpan(span, block)}</Span>);

/** A keyed fragment, so spans keep stable keys without a wrapper element. */
function Span({ children: content }: { children: ReactNode }) {
  return <>{content}</>;
}

function renderBlock(block: ArticleBlock): ReactNode {
  switch (block.style ?? "normal") {
    case "normal":
      return <p key={block._key}>{children(block)}</p>;
    case "h2":
      return <h2 key={block._key}>{children(block)}</h2>;
    case "h3":
      return <h3 key={block._key}>{children(block)}</h3>;
    case "blockquote":
      return <blockquote key={block._key}>{children(block)}</blockquote>;
    // A note set apart from the text around it. An aside is a landmark only
    // when it is named, and this one is not: it is part of the article.
    case "callout":
      return (
        <p key={block._key} className={styles.box}>
          {children(block)}
        </p>
      );
    default:
      throw new Error(`ArticleBody: unknown block style "${block.style}"`);
  }
}

/** A run of list items is one list. Articles' lists are one level deep. */
function renderList(items: ArticleBlock[]): ReactNode {
  const Tag = items[0]!.listItem === "number" ? "ol" : "ul";
  return (
    <Tag key={items[0]!._key}>
      {items.map((item) => (
        <li key={item._key}>{children(item)}</li>
      ))}
    </Tag>
  );
}

export function ArticleBody({ nodes }: { nodes: readonly ArticleNode[] }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]!;
    if (node._type === "articleImage") {
      out.push(
        <figure key={node._key}>
          <Image
            src={node.image.src}
            width={node.image.width}
            height={node.image.height}
            alt={node.image.alt}
            sizes="(min-width: 65rem) 1000px, 100vw"
          />
          {node.caption ? <figcaption>{node.caption}</figcaption> : null}
        </figure>,
      );
    } else if (node._type === "block" && node.listItem) {
      const run: ArticleBlock[] = [];
      while (i < nodes.length) {
        const next = nodes[i]!;
        if (next._type !== "block" || next.listItem !== node.listItem) break;
        run.push(next);
        i += 1;
      }
      i -= 1;
      out.push(renderList(run));
    } else if (node._type === "block") {
      out.push(renderBlock(node));
    } else {
      throw new Error(`ArticleBody: unknown node "${(node as { _type: string })._type}"`);
    }
  }
  return <div className={styles.body}>{out}</div>;
}
