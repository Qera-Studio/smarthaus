import { render, screen, within } from "@testing-library/react";
import { SEED, seedDoc } from "../../../../sanity/seed";
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import type { PtBlock, PtNode } from "../../../sanity/types";
import { LegalBody, withPlaceholders } from "../LegalBody";

/**
 * The legal pages' Portable Text, rendered. What the renderer must never do is
 * drop or alter wording: a type it does not know throws instead.
 */
const { contact } = SITE_SETTINGS;
let key = 0;
const k = () => `k${key++}`;

const span = (text: string, marks: string[] = []) => ({
  _type: "span" as const,
  _key: k(),
  text,
  marks,
});
const block = (children: PtBlock["children"], extra: Partial<PtBlock> = {}): PtBlock => ({
  _type: "block",
  _key: k(),
  style: "normal",
  markDefs: [],
  children,
  ...extra,
});
const item = (text: string, listItem: "bullet" | "number", level = 1) =>
  block([span(text)], { listItem, level });

const draw = (blocks: PtNode[], date?: string) =>
  render(<LegalBody blocks={blocks} contact={contact} date={date} />).container;

describe("LegalBody", () => {
  it("draws paragraphs and subheadings", () => {
    const root = draw([block([span("Heading")], { style: "h3" }), block([span("Body.")])]);
    expect(root.innerHTML).toBe("<h3>Heading</h3><p>Body.</p>");
  });

  it("puts a link target on its subheading or paragraph, and prints nothing for it", () => {
    const anchor = (id: string) => ({ _type: "anchor" as const, _key: k(), id });
    const root = draw([
      block([anchor("cookies"), span("Cookies and analytics")], { style: "h3" }),
      block([span("Body."), anchor("body")]),
    ]);
    expect(root.innerHTML).toBe(
      '<h3 id="cookies">Cookies and analytics</h3><p id="body">Body.</p>',
    );
  });

  it("puts a link target in a list item on that item", () => {
    const root = draw([
      block([{ _type: "anchor", _key: k(), id: "erasure" }, span("Erase it.")], {
        listItem: "bullet",
        level: 1,
      }),
      item("Correct it.", "bullet"),
    ]);
    expect(root.innerHTML).toBe('<ul><li id="erasure">Erase it.</li><li>Correct it.</li></ul>');
  });

  it("finds every /privacy# link in the seed a target in the privacy policy", () => {
    const all = JSON.stringify(SEED);
    const wanted = [...all.matchAll(/\/privacy#([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(wanted).toContain("cookies");
    const privacy = JSON.stringify(seedDoc("legal-privacy"));
    // A section id or an anchor: both render as an element id.
    for (const id of wanted) expect(privacy).toContain(`"id":"${id}"`);
  });

  it("treats a block with no style as a paragraph", () => {
    const root = draw([block([span("Body.")], { style: undefined })]);
    expect(root.innerHTML).toBe("<p>Body.</p>");
  });

  it("draws bold, italic and the amber placeholder marker", () => {
    const root = draw([
      block([
        span("Plain "),
        span("bold", ["strong"]),
        span("both", ["strong", "em"]),
        span("30 days", ["placeholder"]),
        { _type: "span", _key: k(), text: " end" },
      ]),
    ]);
    expect(root.querySelector("strong")).toHaveTextContent("bold");
    expect(root.querySelector("strong em")).toHaveTextContent("both");
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(root.textContent).toBe("Plain boldboth30 days end");
  });

  it("links within the site in place, and elsewhere in a new tab", () => {
    const internal = { _type: "link" as const, _key: "a", href: "/contact" };
    const external = { _type: "link" as const, _key: "b", href: "https://ico.org.uk" };
    draw([
      block([span("contact page", ["a"]), span(" or "), span("the regulator", ["b"])], {
        markDefs: [internal, external],
      }),
    ]);
    expect(screen.getByRole("link", { name: "contact page" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "contact page" })).not.toHaveAttribute("target");
    const out = screen.getByRole("link", { name: "the regulator" });
    expect(out).toHaveAttribute("target", "_blank");
    expect(out).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("throws on a mark it has no definition for, rather than dropping the text", () => {
    expect(() => draw([block([span("x", ["ghost"])], { markDefs: undefined })])).toThrow(
      'unknown mark "ghost"',
    );
  });

  it("groups list items into one list, bullets and numbers apart", () => {
    const root = draw([item("one", "bullet"), item("two", "bullet"), item("first", "number")]);
    expect(root.innerHTML).toBe("<ul><li>one</li><li>two</li></ul><ol><li>first</li></ol>");
  });

  it("nests a deeper item inside the item before it", () => {
    const root = draw([
      item("parent", "bullet"),
      item("child", "bullet", 2),
      item("next", "bullet"),
    ]);
    expect(root.innerHTML).toBe("<ul><li>parent<ul><li>child</li></ul></li><li>next</li></ul>");
  });

  it("reads an item with no level as the first level", () => {
    const root = draw([block([span("one")], { listItem: "bullet" })]);
    expect(root.innerHTML).toBe("<ul><li>one</li></ul>");
  });

  it("ends a list at the first paragraph after it", () => {
    const root = draw([item("one", "bullet"), block([span("After.")]), item("two", "bullet")]);
    expect(root.querySelectorAll("ul")).toHaveLength(2);
  });

  it("ends a list at a table after it", () => {
    const root = draw([
      item("one", "bullet"),
      { _type: "defTable", _key: k(), caption: "c", rows: [] },
    ]);
    expect(root.querySelectorAll("ul")).toHaveLength(1);
    expect(root.querySelectorAll("table")).toHaveLength(1);
  });

  it("prints contact details from the site settings, as working links", () => {
    draw([
      block([
        { _type: "contactValue", _key: k(), field: "email" },
        span(", "),
        { _type: "contactValue", _key: k(), field: "phone" },
        span(", "),
        { _type: "contactValue", _key: k(), field: "whatsapp", label: "message us", message: "Hi" },
        span(", "),
        { _type: "contactValue", _key: k(), field: "address" },
      ]),
    ]);
    expect(screen.getByRole("link", { name: contact.email })).toHaveAttribute(
      "href",
      `mailto:${contact.email}`,
    );
    expect(screen.getByRole("link", { name: contact.phoneDisplay })).toHaveAttribute(
      "href",
      `tel:${contact.phoneE164}`,
    );
    const whatsapp = screen.getByRole("link", { name: "message us" });
    expect(whatsapp).toHaveAttribute("href", `https://wa.me/${contact.whatsapp}?text=Hi`);
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(document.body).toHaveTextContent(contact.addressLines.join(" "));
  });

  it("names a WhatsApp link by the number when it has no text of its own", () => {
    draw([block([{ _type: "contactValue", _key: k(), field: "whatsapp" }])]);
    expect(screen.getByRole("link", { name: contact.phoneDisplay })).toHaveAttribute(
      "href",
      `https://wa.me/${contact.whatsapp}`,
    );
  });

  it("prints the document's own date where the text asks for it", () => {
    const root = draw(
      [block([span("Last assessed "), { _type: "updatedDate", _key: k() }, span(".")])],
      "27 September 2026",
    );
    expect(root.textContent).toBe("Last assessed 27 September 2026.");
  });

  it("prints nothing for the date when the document has none", () => {
    const root = render(
      <LegalBody
        blocks={[block([span("On "), { _type: "updatedDate", _key: k() }])]}
        contact={contact}
      />,
    ).container;
    expect(root.textContent).toBe("On ");
  });

  it("draws a table with column and row headers, and its placeholders marked", () => {
    draw([
      {
        _type: "legalTable",
        _key: k(),
        caption: "How long we keep it",
        columns: ["What", "How long"],
        rows: [
          { _key: k(), cells: ["Enquiries", "{24 months} from last contact"] },
          { _key: k(), cells: [] },
        ],
      },
    ]);
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["What", "How long"]);
    expect(within(table).getAllByRole("rowheader")[0]).toHaveTextContent("Enquiries");
    expect(within(table).getByRole("cell")).toHaveTextContent("24 months from last contact");
    expect(
      screen.getByRole("group", { name: "How long we keep it (scrollable)" }),
    ).toBeInTheDocument();
  });

  it("draws a details table, taking contact rows from the settings", () => {
    draw([
      {
        _type: "defTable",
        _key: k(),
        caption: "Who we are",
        rows: [
          { _key: k(), label: "Trading as", value: "Smarthaus" },
          { _key: k(), label: "Email", contact: "email" },
          { _key: k(), label: "Phone", contact: "phone" },
          { _key: k(), label: "Registered address", contact: "address" },
          { _key: k(), label: "Empty" },
        ],
      },
    ]);
    const value = (label: string) =>
      screen.getByRole("rowheader", { name: label }).closest("tr")!.querySelector("td")!
        .textContent;
    expect(value("Trading as")).toBe("Smarthaus");
    expect(value("Email")).toBe(contact.email);
    expect(value("Phone")).toBe(contact.phoneDisplay);
    expect(value("Registered address")).toBe(contact.addressLines.join(" "));
    expect(value("Empty")).toBe("");
  });

  it("throws on a block style or node it does not know, rather than dropping text", () => {
    expect(() => draw([block([span("x")], { style: "blockquote" })])).toThrow(
      'unknown block style "blockquote"',
    );
    expect(() => draw([{ _type: "image", _key: "i" } as unknown as PtNode])).toThrow(
      'unknown node "image"',
    );
  });

  it("throws on a contact detail with no text form", () => {
    expect(() =>
      draw([
        {
          _type: "defTable",
          _key: k(),
          caption: "c",
          rows: [{ _key: k(), label: "x", contact: "whatsapp" }],
        },
      ]),
    ).toThrow('no text for contact field "whatsapp"');
  });
});

describe("withPlaceholders", () => {
  it("marks each braced part and keeps the rest as text", () => {
    const { container } = render(<p>{withPlaceholders("For {7 years} after {completion}.")}</p>);
    expect(container.textContent).toBe("For 7 years after completion.");
    expect(withPlaceholders("No braces.")).toEqual(["No braces."]);
    expect(withPlaceholders("")).toEqual([]);
  });
});
