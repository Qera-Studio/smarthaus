/**
 * @jest-environment node
 */

// The enquiry rate limit: a token bucket per client (Security System §11).
import { clientKey, createLimiter, enquiryLimiter } from "../rate-limit";

function clock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}

describe("createLimiter", () => {
  it("allows up to capacity at once, then refuses", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 3, windowMs: 60_000, now: c.now });
    expect([1, 2, 3].map(() => limiter.take("a").ok)).toEqual([true, true, true]);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("says how long until the next token when it refuses", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 5, windowMs: 10 * 60_000, now: c.now });
    for (let i = 0; i < 5; i += 1) limiter.take("a");
    // One token every two minutes.
    expect(limiter.take("a")).toEqual({ ok: false, retryAfterMs: 120_000 });
    c.advance(30_000);
    expect(limiter.take("a")).toEqual({ ok: false, retryAfterMs: 90_000 });
  });

  it("refills evenly: one token per windowMs / capacity", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 5, windowMs: 10 * 60_000, now: c.now });
    for (let i = 0; i < 5; i += 1) limiter.take("a");
    c.advance(119_999);
    expect(limiter.take("a").ok).toBe(false);
    c.advance(2);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("never refills past capacity, however long it waits", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 2, windowMs: 1000, now: c.now });
    limiter.take("a");
    c.advance(1_000_000);
    expect([1, 2, 3].map(() => limiter.take("a").ok)).toEqual([true, true, false]);
  });

  it("keeps each key's bucket separate", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000, now: c.now });
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
    expect(limiter.take("b").ok).toBe(true);
  });

  it("does not let refused attempts dig the bucket deeper", () => {
    // Hammering while refused must not push recovery further away.
    const c = clock();
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000, now: c.now });
    limiter.take("a");
    for (let i = 0; i < 50; i += 1) limiter.take("a");
    c.advance(60_000);
    expect(limiter.take("a").ok).toBe(true);
  });

  it("refills nothing when the clock steps backwards, and does not go negative", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000, now: c.now });
    limiter.take("a");
    c.advance(-30_000);
    const verdict = limiter.take("a");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.retryAfterMs).toBe(60_000);
  });

  it("drops the least recently used key past maxKeys, so memory is bounded", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000, now: c.now, maxKeys: 3 });
    for (const key of ["a", "b", "c", "d"]) limiter.take(key);
    expect(limiter.size).toBe(3);
    // "a" was evicted, so it starts full again; "d" is still spent.
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("d").ok).toBe(false);
  });

  it("counts a touch as use, so an active key is not the one evicted", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 2, windowMs: 60_000, now: c.now, maxKeys: 2 });
    limiter.take("a");
    limiter.take("b");
    limiter.take("a"); // a is now the most recent, and spent
    limiter.take("c"); // evicts b, not a
    expect(limiter.take("a").ok).toBe(false);
    expect(limiter.take("b").ok).toBe(true);
  });

  it("tracks a refused key too, so it cannot escape by being forgotten", () => {
    const c = clock();
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000, now: c.now, maxKeys: 5 });
    limiter.take("a");
    limiter.take("a");
    expect(limiter.size).toBe(1);
  });

  it.each([
    [0, 1000],
    [-1, 1000],
    [Number.NaN, 1000],
    [1, 0],
    [1, -5],
    [1, Number.NaN],
  ])("refuses to build with capacity %p and windowMs %p", (capacity, windowMs) => {
    expect(() => createLimiter({ capacity, windowMs })).toThrow(
      "createLimiter needs capacity >= 1 and windowMs > 0",
    );
  });

  it("uses the real clock by default", () => {
    const limiter = createLimiter({ capacity: 1, windowMs: 60_000 });
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });
});

describe("clientKey", () => {
  const key = (init: Record<string, string>) => clientKey(new Headers(init));

  it("keys on the first hop of x-forwarded-for", () => {
    expect(key({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })).toBe(
      key({ "x-forwarded-for": "203.0.113.7" }),
    );
  });

  it("ignores whitespace and case around the address", () => {
    expect(key({ "x-forwarded-for": "  2001:DB8::1 , 10.0.0.1" })).toBe(
      key({ "x-forwarded-for": "2001:db8::1" }),
    );
  });

  it("gives different clients different keys", () => {
    expect(key({ "x-forwarded-for": "203.0.113.7" })).not.toBe(
      key({ "x-forwarded-for": "203.0.113.8" }),
    );
  });

  it("falls back to x-real-ip when there is no x-forwarded-for", () => {
    expect(key({ "x-real-ip": "203.0.113.7" })).toBe(key({ "x-forwarded-for": "203.0.113.7" }));
  });

  it("falls back to x-real-ip when x-forwarded-for is empty", () => {
    expect(key({ "x-forwarded-for": " ", "x-real-ip": "203.0.113.7" })).toBe(
      key({ "x-real-ip": "203.0.113.7" }),
    );
  });

  it("puts clients with no address in one shared 'unknown' bucket", () => {
    expect(key({})).toBe(key({ "x-forwarded-for": "" }));
    expect(key({})).not.toBe(key({ "x-real-ip": "203.0.113.7" }));
  });

  it("never exposes the address: a 64-character keyed hash, not the IP or its plain SHA-256", () => {
    const value = key({ "x-forwarded-for": "203.0.113.7" });
    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(value).not.toContain("203.0.113.7");
    // Not the plain SHA-256 of the address, which an attacker could precompute.
    const { createHash } = jest.requireActual<typeof import("node:crypto")>("node:crypto");
    expect(value).not.toBe(createHash("sha256").update("203.0.113.7").digest("hex"));
  });
});

describe("enquiryLimiter", () => {
  it("allows five sends from one client, then refuses the sixth", () => {
    const k = clientKey(new Headers({ "x-forwarded-for": "192.0.2.201" }));
    const verdicts = Array.from({ length: 6 }, () => enquiryLimiter.take(k).ok);
    expect(verdicts).toEqual([true, true, true, true, true, false]);
  });

  it("asks the refused client to wait about two minutes", () => {
    const k = clientKey(new Headers({ "x-forwarded-for": "192.0.2.202" }));
    for (let i = 0; i < 5; i += 1) enquiryLimiter.take(k);
    const verdict = enquiryLimiter.take(k);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.retryAfterMs).toBeGreaterThan(110_000);
      expect(verdict.retryAfterMs).toBeLessThanOrEqual(120_000);
    }
  });
});
