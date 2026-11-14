/**
 * @jest-environment node
 */
import { structure } from "../structure";
import { COLLECTIONS, FIXED_DOCUMENTS, SINGLETONS } from "../schema";

/**
 * A stand-in StructureBuilder: every call records itself, so the sidebar can
 * be read back as plain data. What is pinned is what an editor sees: every
 * page, once, opening its one fixed document.
 */
type Node = Record<string, unknown> & { items?: Node[]; child?: Node };

function builder() {
  const chain = (kind: string) => {
    const node: Node = { kind };
    const proxy: Record<string, unknown> = new Proxy(
      {},
      {
        get: (_t, prop: string) =>
          prop === "node"
            ? node
            : (value: unknown) => {
                node[prop] = value;
                return proxy;
              },
      },
    );
    return proxy;
  };
  const unwrap = (v: unknown): unknown => {
    const inner = v && typeof v === "object" ? (v as { node?: unknown }).node : undefined;
    return inner && typeof inner === "object" ? unwrapNode(inner as Node) : v;
  };
  const unwrapNode = (node: Node): Node => {
    const out: Node = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = Array.isArray(v) ? v.map(unwrap) : unwrap(v);
    }
    return out;
  };
  return {
    S: {
      list: () => chain("list"),
      listItem: () => chain("listItem"),
      document: () => chain("document"),
      // The list of a type's documents: the articles.
      documentTypeList: (type: string) => {
        const list = chain("documentTypeList") as { node: Node };
        list.node.schemaType = type;
        return list;
      },
      divider: () => ({ node: { kind: "divider" } }),
    },
    unwrap,
  };
}

const { S, unwrap } = builder();
const sidebar = unwrap(structure(S as never, {} as never)) as Node;
const items = sidebar.items!;
const entries = items.filter((i) => i.kind === "listItem");

/** Every document the sidebar opens, as [type, id]. */
function opened(node: Node): [string, string][] {
  if (node.kind === "document") return [[node.schemaType as string, node.documentId as string]];
  return [...(node.items ?? []), ...(node.child ? [node.child] : [])].flatMap(opened);
}

describe("the Studio sidebar", () => {
  it("is titled for the brand", () => {
    expect(sidebar.title).toBe("Smarthaus");
  });

  it("opens every singleton by its fixed id, once", () => {
    const singles = opened(sidebar).filter(([type]) =>
      (SINGLETONS as readonly string[]).includes(type),
    );
    expect(singles.map(([, id]) => id).sort()).toEqual([...SINGLETONS].sort());
    for (const [type, id] of singles) expect(id).toBe(type);
  });

  it("opens every fixed route's document under its own group", () => {
    for (const [type, ids] of Object.entries(FIXED_DOCUMENTS)) {
      const docs = opened(sidebar).filter(([t]) => t === type);
      expect(docs.map(([, id]) => id)).toEqual(Object.keys(ids));
    }
  });

  it("names each entry for an editor, not by its type", () => {
    expect(entries.map((e) => e.title)).toEqual([
      "Site settings",
      "Homepage",
      "About",
      "Contact",
      "Pricing",
      "FAQ",
      "Coming-soon pages",
      "Blog",
      "Legal",
      "Cookie and consent wording",
    ]);
  });

  it("sets the shared settings, the pages, the blog and the legal text apart", () => {
    expect(items.filter((i) => i.kind === "divider")).toHaveLength(3);
  });

  describe("the blog, the one group editors add to", () => {
    const blog = entries.find((e) => e.title === "Blog")!.child!;

    it("opens the articles page, then the list of articles", () => {
      expect(blog.items!.map((i) => i.title)).toEqual(["Articles page", "Articles"]);
      expect(opened(blog)).toEqual([["blogPage", "blogPage"]]);
    });

    it("lists every article, newest first", () => {
      const list = blog.items![1]!.child!;
      expect(list.kind).toBe("documentTypeList");
      expect(list.schemaType).toBe("post");
      expect(list.defaultOrdering).toEqual([{ field: "date", direction: "desc" }]);
    });

    it("is the only list of a type's documents in the sidebar", () => {
      const lists = (node: Node): Node[] => [
        ...(node.kind === "documentTypeList" ? [node] : []),
        ...[...(node.items ?? []), ...(node.child ? [node.child] : [])].flatMap(lists),
      ];
      expect(lists(sidebar).map((l) => l.schemaType)).toEqual([...COLLECTIONS]);
    });
  });
});
