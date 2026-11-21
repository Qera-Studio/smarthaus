/**
 * @jest-environment node
 */
const mockDefine = jest.fn((options: unknown) => {
  void options;
  return { GET: jest.fn() };
});
jest.mock("next-sanity/draft-mode", () => ({
  defineEnableDraftMode: (o: unknown) => mockDefine(o),
}));

const mockWithConfig = jest.fn((config: unknown) => ({ config }));
const mockCreateClient = jest.fn((config: unknown) => {
  void config;
  return { withConfig: mockWithConfig };
});
jest.mock("next-sanity", () => ({ createClient: (c: unknown) => mockCreateClient(c) }));

const mockDisable = jest.fn();
jest.mock("next/headers", () => ({ draftMode: async () => ({ disable: mockDisable }) }));

import { NextRequest } from "next/server";

describe("entering draft mode", () => {
  beforeAll(() => {
    process.env.SANITY_API_TOKEN = "viewer-token";
  });

  it("is next-sanity's route, checking the Studio's secret with the Viewer token", async () => {
    const route = await import("../enable/route");
    expect(mockDefine).toHaveBeenCalledTimes(1);
    expect(mockWithConfig).toHaveBeenCalledWith({ token: "viewer-token" });
    expect(mockDefine.mock.calls[0]![0]).toEqual({ client: { config: { token: "viewer-token" } } });
    expect(typeof route.GET).toBe("function");
  });

  it("reads the published dataset without a token everywhere else", () => {
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ useCdn: false, perspective: "published" }),
    );
    expect(mockCreateClient.mock.calls[0]![0]).not.toHaveProperty("token");
  });
});

describe("leaving draft mode", () => {
  it("clears the draft cookie and goes back to the home page", async () => {
    const { GET } = await import("../disable/route");
    const response = await GET(new NextRequest("https://smarthaus.ae/api/draft-mode/disable"));
    expect(mockDisable).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://smarthaus.ae/");
  });
});
