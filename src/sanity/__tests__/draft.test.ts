/**
 * @jest-environment node
 */
const mockDraftMode = jest.fn();
jest.mock("next/headers", () => ({ draftMode: () => mockDraftMode() }));

import { inDraftMode } from "../draft";

describe("inDraftMode", () => {
  it("is on when Next says the request carries the draft cookie", async () => {
    mockDraftMode.mockResolvedValue({ isEnabled: true });
    expect(await inDraftMode()).toBe(true);
  });

  it("is off for every other request", async () => {
    mockDraftMode.mockResolvedValue({ isEnabled: false });
    expect(await inDraftMode()).toBe(false);
  });

  it("is off, not an error, outside a request: a build script or a test", async () => {
    mockDraftMode.mockImplementation(() => {
      throw new Error("`draftMode` was called outside a request scope");
    });
    expect(await inDraftMode()).toBe(false);
  });
});
