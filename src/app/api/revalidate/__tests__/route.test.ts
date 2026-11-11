/**
 * @jest-environment node
 */
const mockParseBody = jest.fn();
jest.mock("next-sanity/webhook", () => ({ parseBody: (...a: unknown[]) => mockParseBody(...a) }));
const mockRevalidateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidateTag: (...a: unknown[]) => mockRevalidateTag(...a) }));

import type { NextRequest } from "next/server";
import { POST } from "../route";
import { SANITY_TAG } from "../../../../sanity/env";

const request = {} as NextRequest;
const env = process.env;

beforeEach(() => {
  process.env = { ...env, SANITY_REVALIDATE_SECRET: "s".repeat(32) };
  mockParseBody.mockReset();
  mockRevalidateTag.mockReset();
});

afterAll(() => {
  process.env = env;
});

describe("the publish webhook", () => {
  it("expires every cached content fetch on a correctly signed call", async () => {
    mockParseBody.mockResolvedValue({ isValidSignature: true, body: { _type: "homePage" } });
    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(mockRevalidateTag).toHaveBeenCalledWith(SANITY_TAG, { expire: 0 });
  });

  it("checks the signature against the secret, after waiting out Content Lake", async () => {
    mockParseBody.mockResolvedValue({ isValidSignature: true, body: {} });
    await POST(request);
    expect(mockParseBody).toHaveBeenCalledWith(request, "s".repeat(32), true);
  });

  it.each([false, null])("changes nothing on a signature that is %p", async (valid) => {
    mockParseBody.mockResolvedValue({ isValidSignature: valid, body: {} });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured, rather than trusting anyone", async () => {
    delete process.env.SANITY_REVALIDATE_SECRET;
    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(mockParseBody).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
