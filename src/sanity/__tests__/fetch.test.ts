/**
 * @jest-environment node
 */
// jest.setup.ts serves every suite the seed through a getDoc mock; this suite
// tests the real one, against a client stand-in that records what it was asked.
jest.unmock("../fetch");

const mockFetch = jest.fn();
const mockWithConfig = jest.fn();
jest.mock("../client", () => ({
  client: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    withConfig: (config: unknown) => {
      mockWithConfig(config);
      return { fetch: (...args: unknown[]) => mockFetch(...args) };
    },
  },
}));

const mockDraft = jest.fn(async () => false);
jest.mock("../draft", () => ({ inDraftMode: () => mockDraft() }));

import { getDoc, getDocs, shouldMark } from "../fetch";
import { SANITY_TAG } from "../env";

const env = process.env;

beforeEach(() => {
  process.env = { ...env };
  mockFetch.mockReset();
  mockWithConfig.mockReset();
  mockDraft.mockReset().mockResolvedValue(false);
});

afterAll(() => {
  process.env = env;
});

describe("getDoc, published", () => {
  it("reads one document by id, cached under the one tag a publish expires", async () => {
    mockFetch.mockResolvedValue({ _id: "homePage", _type: "homePage", title: "x" });
    await getDoc("homePage");
    expect(mockFetch).toHaveBeenCalledWith(
      "*[_id == $id][0]",
      { id: "homePage" },
      { cache: "force-cache", next: { tags: [SANITY_TAG] } },
    );
    expect(mockWithConfig).not.toHaveBeenCalled();
  });

  it("hands back the render shape, copy as English text", async () => {
    mockFetch.mockResolvedValue({
      _id: "homePage",
      _type: "homePage",
      hero: { title: { _type: "localeString", en: "Home at your fingertips" } },
    });
    expect(await getDoc("homePage")).toEqual({ hero: { title: "Home at your fingertips" } });
  });

  it.each([null, undefined])(
    "fails the build on a missing document (%p), never renders empty",
    async (doc) => {
      mockFetch.mockResolvedValue(doc);
      await expect(getDoc("aboutPage")).rejects.toThrow('no published document "aboutPage"');
    },
  );
});

describe("getDoc, in an editor's draft preview", () => {
  beforeEach(() => mockDraft.mockResolvedValue(true));

  it("reads drafts with the Viewer token, uncached, and marks copy for click-to-edit", async () => {
    process.env.SANITY_API_TOKEN = "viewer-token";
    mockFetch.mockResolvedValue({ _id: "drafts.homePage", title: "x" });
    await getDoc("homePage");
    expect(mockWithConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "viewer-token",
        perspective: "drafts",
        stega: expect.objectContaining({ enabled: true, studioUrl: "/studio" }),
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "*[_id == $id][0]",
      { id: "homePage" },
      { cache: "no-store" },
    );
  });

  it("refuses to preview without the token, rather than showing the published page as a draft", async () => {
    delete process.env.SANITY_API_TOKEN;
    await expect(getDoc("homePage")).rejects.toThrow("SANITY_API_TOKEN");
  });

  it("marks only what passes both its own filter and Sanity's default one", async () => {
    process.env.SANITY_API_TOKEN = "viewer-token";
    mockFetch.mockResolvedValue({ title: "x" });
    await getDoc("homePage");
    const { filter } = mockWithConfig.mock.calls[0]![0].stega as {
      filter: (p: { sourcePath: unknown[]; filterDefault: (p: unknown) => boolean }) => boolean;
    };
    const yes = () => true;
    const no = () => false;
    expect(filter({ sourcePath: ["hero", "title", "en"], filterDefault: yes })).toBe(true);
    expect(filter({ sourcePath: ["hero", "title", "en"], filterDefault: no })).toBe(false);
    expect(filter({ sourcePath: ["process", "layout"], filterDefault: yes })).toBe(false);
  });
});

describe("shouldMark", () => {
  it("marks the English text of a field", () => {
    expect(shouldMark(["hero", "title", "en"])).toBe(true);
    expect(shouldMark(["faqs", 0, "answer", 1, "en"])).toBe(true);
  });

  it.each([
    [["process", "pages", 0, "layout"]],
    [["partners", "items", 0, "href"]],
    [["hero", "title", "ar"]],
    [["seo", "title", "en"]],
  ])("leaves %j clean, because the code compares it", (path) => {
    expect(shouldMark(path)).toBe(false);
  });
});

describe("getDocs, the list of a type editors create", () => {
  const LIST = "*[_type == $type] | order(date desc, _id asc)";

  it("reads every document of the type, newest first, under the same tag", async () => {
    mockFetch.mockResolvedValue([]);
    await getDocs("post");
    expect(mockFetch).toHaveBeenCalledWith(
      LIST,
      { type: "post" },
      { cache: "force-cache", next: { tags: [SANITY_TAG] } },
    );
    expect(mockWithConfig).not.toHaveBeenCalled();
  });

  it("hands each back in render shape, in the order the query gave", async () => {
    mockFetch.mockResolvedValue([
      { _id: "post-b", _type: "post", slug: "b", title: { _type: "localeString", en: "Second" } },
      { _id: "post-a", _type: "post", slug: "a", title: { _type: "localeString", en: "First" } },
    ]);
    expect(await getDocs("post")).toEqual([
      { slug: "b", title: "Second" },
      { slug: "a", title: "First" },
    ]);
  });

  it.each([[[]], [null], [undefined]])(
    "treats %p as no documents, not as a failure: there may be none yet",
    async (answer) => {
      mockFetch.mockResolvedValue(answer);
      await expect(getDocs("post")).resolves.toEqual([]);
    },
  );

  it("reads drafts, uncached, when an editor is previewing", async () => {
    process.env.SANITY_API_TOKEN = "viewer-token";
    mockDraft.mockResolvedValue(true);
    mockFetch.mockResolvedValue([]);
    await getDocs("post");
    expect(mockFetch).toHaveBeenCalledWith(LIST, { type: "post" }, { cache: "no-store" });
    expect(mockWithConfig).toHaveBeenCalledWith(
      expect.objectContaining({ token: "viewer-token", perspective: "drafts" }),
    );
  });

  it("refuses to preview without the Viewer token", async () => {
    delete process.env.SANITY_API_TOKEN;
    mockDraft.mockResolvedValue(true);
    await expect(getDocs("post")).rejects.toThrow("Draft preview needs SANITY_API_TOKEN");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
