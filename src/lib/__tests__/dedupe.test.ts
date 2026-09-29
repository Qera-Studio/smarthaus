/**
 * @jest-environment node
 */
import { createDeduper, enquiryKey, enquiryDedupe } from "../dedupe";

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

/** A send that resolves or rejects when told to, so ordering is explicit. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createDeduper", () => {
  it("runs the first send and reports it as not a duplicate", async () => {
    const d = createDeduper({ windowMs: 1000 });
    const work = jest.fn(async () => {});
    await expect(d.once("a", work)).resolves.toEqual({ duplicate: false });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("does not run an identical send again inside the window", async () => {
    const c = clock();
    const d = createDeduper({ windowMs: 1000, now: c.now });
    const work = jest.fn(async () => {});
    await d.once("a", work);
    c.advance(999);
    await expect(d.once("a", work)).resolves.toEqual({ duplicate: true });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("runs it again once the window has passed, exactly at its edge", async () => {
    const c = clock();
    const d = createDeduper({ windowMs: 1000, now: c.now });
    const work = jest.fn(async () => {});
    await d.once("a", work);
    c.advance(1000);
    await expect(d.once("a", work)).resolves.toEqual({ duplicate: false });
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("measures the window from the first send, not from each duplicate", async () => {
    const c = clock();
    const d = createDeduper({ windowMs: 1000, now: c.now });
    const work = jest.fn(async () => {});
    await d.once("a", work);
    c.advance(600);
    await d.once("a", work);
    c.advance(600);
    await d.once("a", work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("treats different keys independently", async () => {
    const d = createDeduper({ windowMs: 1000 });
    const work = jest.fn(async () => {});
    await d.once("a", work);
    await d.once("b", work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("makes a duplicate that arrives mid-send wait for that send", async () => {
    const d = createDeduper({ windowMs: 1000 });
    const first = deferred();
    const work = jest.fn(() => first.promise);
    const a = d.once("a", work);
    let settled = false;
    const b = d.once("a", work).then((r) => {
      settled = true;
      return r;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    first.resolve();
    await expect(a).resolves.toEqual({ duplicate: false });
    await expect(b).resolves.toEqual({ duplicate: true });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("fails a waiting duplicate when the send it waited on fails", async () => {
    const d = createDeduper({ windowMs: 1000 });
    const first = deferred();
    const a = d.once("a", () => first.promise);
    const b = d.once("a", async () => {});
    first.reject(new Error("resend down"));
    await expect(a).rejects.toThrow("resend down");
    await expect(b).rejects.toThrow("resend down");
  });

  it("forgets a failed send, so the retry is delivered rather than swallowed", async () => {
    const d = createDeduper({ windowMs: 1000 });
    await expect(
      d.once("a", async () => {
        throw new Error("timeout");
      }),
    ).rejects.toThrow("timeout");
    expect(d.has("a")).toBe(false);
    const retry = jest.fn(async () => {});
    await expect(d.once("a", retry)).resolves.toEqual({ duplicate: false });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("reports what is live through has(), and expires it lazily", async () => {
    const c = clock();
    const d = createDeduper({ windowMs: 1000, now: c.now });
    expect(d.has("a")).toBe(false);
    await d.once("a", async () => {});
    expect(d.has("a")).toBe(true);
    c.advance(1000);
    expect(d.has("a")).toBe(false);
    expect(d.size).toBe(0);
  });

  it("keeps an entry when the clock steps backwards", async () => {
    const c = clock();
    const d = createDeduper({ windowMs: 1000, now: c.now });
    await d.once("a", async () => {});
    c.advance(-5000);
    expect(d.has("a")).toBe(true);
  });

  it("drops the oldest key past maxKeys", async () => {
    const d = createDeduper({ windowMs: 1000, maxKeys: 2 });
    for (const key of ["a", "b", "c"]) await d.once(key, async () => {});
    expect(d.size).toBe(2);
    expect(d.has("a")).toBe(false);
    expect(d.has("b")).toBe(true);
    expect(d.has("c")).toBe(true);
  });

  it("clears everything on clear()", async () => {
    const d = createDeduper({ windowMs: 1000 });
    await d.once("a", async () => {});
    d.clear();
    expect(d.size).toBe(0);
    expect(d.has("a")).toBe(false);
  });

  it.each([0, -1, Number.NaN])("refuses a window of %p", (windowMs) => {
    expect(() => createDeduper({ windowMs })).toThrow("windowMs > 0");
  });
});

describe("enquiryKey", () => {
  const lead = { name: "Nadia", phone: "+971501234567", message: "Two villas" };

  it("is the same for the same enquiry, whatever order the fields come in", () => {
    expect(enquiryKey(lead)).toBe(
      enquiryKey({ message: "Two villas", phone: "+971501234567", name: "Nadia" }),
    );
  });

  it("changes when any field changes, so a corrected message is a new lead", () => {
    expect(enquiryKey({ ...lead, message: "Three villas" })).not.toBe(enquiryKey(lead));
    expect(enquiryKey({ ...lead, name: "Nadia R" })).not.toBe(enquiryKey(lead));
  });

  it("tells an absent field from an empty one only as the schema does: both are null", () => {
    expect(enquiryKey({ ...lead, email: undefined })).toBe(enquiryKey({ ...lead, email: null }));
    expect(enquiryKey({ ...lead, email: "" })).not.toBe(enquiryKey({ ...lead, email: null }));
  });

  it("never holds the lead's details in the clear", () => {
    const key = enquiryKey(lead);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("Nadia");
    expect(key).not.toContain("971");
  });
});

describe("enquiryDedupe", () => {
  it("is shared, and holds an enquiry for two minutes", async () => {
    enquiryDedupe.clear();
    const now = jest.spyOn(Date, "now").mockReturnValue(5_000_000);
    await enquiryDedupe.once("k", async () => {});
    now.mockReturnValue(5_000_000 + 119_999);
    expect(enquiryDedupe.has("k")).toBe(true);
    now.mockReturnValue(5_000_000 + 120_000);
    expect(enquiryDedupe.has("k")).toBe(false);
    now.mockRestore();
    enquiryDedupe.clear();
  });
});
