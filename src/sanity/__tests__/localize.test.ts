/**
 * @jest-environment node
 */
import { localize, pictureFromRef } from "../localize";

const REF = "image-0123abcd4567ef89-1152x451-png";

describe("pictureFromRef", () => {
  it("reads the CDN url and the size from the asset id, with no second query", () => {
    expect(pictureFromRef(REF)).toEqual({
      src: expect.stringMatching(
        /^https:\/\/cdn\.sanity\.io\/images\/[^/]*\/[^/]+\/0123abcd4567ef89-1152x451\.png$/,
      ),
      width: 1152,
      height: 451,
    });
  });

  it("serves the project and dataset the build reads", () => {
    const { src } = pictureFromRef(REF);
    const [, , , , project, dataset] = src.split("/");
    expect(project).toBe(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "");
    expect(dataset).toBe(process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production");
  });

  it.each(["file-abc-pdf", "image-xyz", "image-0123-12x-png", ""])(
    "refuses %p, which is not an image asset id",
    (ref) => {
      expect(() => pictureFromRef(ref)).toThrow("not an image asset id");
    },
  );
});

describe("localize", () => {
  it("turns copy into its English text", () => {
    expect(localize({ _type: "localeString", en: "Lighting", ar: "إضاءة" })).toBe("Lighting");
    expect(localize({ _type: "localeText", en: "A paragraph." })).toBe("A paragraph.");
  });

  it("gives empty copy as an empty string, never undefined", () => {
    expect(localize({ _type: "localeString" })).toBe("");
  });

  it("hands rich text over untouched, keys and all, for its renderer", () => {
    const blocks = [
      { _type: "block", _key: "a", children: [{ _type: "span", _key: "b", text: "x" }] },
    ];
    expect(localize({ _type: "localeBlocks", en: blocks })).toBe(blocks);
    expect(localize({ _type: "localeBlocks" })).toEqual([]);
  });

  it("turns a picture into src, size and alt", () => {
    expect(
      localize({
        _type: "figure",
        asset: { _type: "reference", _ref: REF },
        alt: { _type: "localeString", en: "TIS" },
      }),
    ).toMatchObject({ width: 1152, height: 451, alt: "TIS" });
  });

  it("gives a decorative picture an empty alt", () => {
    expect(localize({ _type: "figure", asset: { _ref: REF } })).toMatchObject({ alt: "" });
  });

  it("keeps the stock mark only while it is set", () => {
    const picture = { _type: "figure", asset: { _ref: REF } };
    expect(localize({ ...picture, stock: true })).toMatchObject({ stock: true });
    expect(localize({ ...picture, stock: false })).not.toHaveProperty("stock");
  });

  it("refuses a picture with nothing uploaded, rather than rendering a broken image", () => {
    expect(() => localize({ _type: "figure", alt: { _type: "localeString", en: "x" } })).toThrow(
      "no image uploaded",
    );
  });

  it("drops Sanity's bookkeeping and keeps when the document was last edited", () => {
    expect(
      localize({
        _id: "homePage",
        _type: "homePage",
        _rev: "r1",
        _createdAt: "2026-01-01T00:00:00Z",
        _updatedAt: "2026-11-11T08:00:00Z",
        title: { _type: "localeString", en: "Home" },
      }),
    ).toEqual({ updatedAt: "2026-11-11T08:00:00Z", title: "Home" });
  });

  it("walks lists and nested objects, dropping each item's key and type", () => {
    expect(
      localize({
        stats: {
          items: [
            { _key: "k0", _type: "stat", value: "150+", label: { _type: "localeString", en: "a" } },
            { _key: "k1", _type: "stat", value: "90%", label: { _type: "localeString", en: "b" } },
          ],
        },
      }),
    ).toEqual({
      stats: {
        items: [
          { value: "150+", label: "a" },
          { value: "90%", label: "b" },
        ],
      },
    });
  });

  it("passes plain values through", () => {
    expect(localize("x")).toBe("x");
    expect(localize(3)).toBe(3);
    expect(localize(false)).toBe(false);
    expect(localize(null)).toBeNull();
    expect(localize(undefined)).toBeUndefined();
  });
});
