import { z } from "zod";
import { createLimiter } from "./rate-limit";

/**
 * CSP violation reports, from both formats browsers send:
 *
 * - `application/reports+json`, the Reporting API (Chromium), via `report-to`:
 *   an array of reports, each `{ type: "csp-violation", body: {...} }`.
 * - `application/csp-report`, the older `report-uri` format (Firefox, Safari):
 *   one object, `{ "csp-report": {...} }`.
 *
 * Each is reduced to four fields. URLs keep their origin and path only: a
 * query string or fragment can carry personal data, and the log does not need
 * it to say which page broke and what was blocked.
 */

export type Violation = {
  directive: string;
  blocked: string;
  document: string;
  disposition: "enforce" | "report";
};

/** Bytes. A real report is well under 2KB; anything near this is not one. */
export const MAX_REPORT_BYTES = 16 * 1024;

const text = z.string().max(2048);

const reportingApi = z
  .array(
    z.object({
      type: z.string(),
      body: z
        .object({
          documentURL: text.optional(),
          blockedURL: text.optional(),
          effectiveDirective: text.optional(),
          disposition: z.enum(["enforce", "report"]).optional(),
        })
        .passthrough(),
    }),
  )
  .max(50);

const legacy = z.object({
  "csp-report": z
    .object({
      "document-uri": text.optional(),
      "blocked-uri": text.optional(),
      "effective-directive": text.optional(),
      "violated-directive": text.optional(),
      disposition: z.enum(["enforce", "report"]).optional(),
    })
    .passthrough(),
});

/** Origin and path, or the keyword a browser reports ("inline", "eval"). */
export function trimUrl(value: string | undefined): string {
  if (!value) return "unknown";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    // Not a URL: a keyword like "inline" or "eval". Keep it, bounded.
    return value.slice(0, 64);
  }
}

/**
 * The violations in a request body, or null when it is not a CSP report at
 * all. A Reporting API batch can mix report types; only csp-violation entries
 * are kept.
 */
export function parseReport(contentType: string, body: unknown): Violation[] | null {
  const type = contentType.split(";")[0]!.trim().toLowerCase();
  if (type === "application/reports+json") {
    const parsed = reportingApi.safeParse(body);
    if (!parsed.success) return null;
    return parsed.data
      .filter((report) => report.type === "csp-violation")
      .map(({ body: b }) => ({
        directive: b.effectiveDirective ?? "unknown",
        blocked: trimUrl(b.blockedURL),
        document: trimUrl(b.documentURL),
        disposition: b.disposition ?? "enforce",
      }));
  }
  if (type === "application/csp-report") {
    const parsed = legacy.safeParse(body);
    if (!parsed.success) return null;
    const r = parsed.data["csp-report"];
    return [
      {
        directive: r["effective-directive"] ?? r["violated-directive"] ?? "unknown",
        blocked: trimUrl(r["blocked-uri"]),
        document: trimUrl(r["document-uri"]),
        disposition: r.disposition ?? "enforce",
      },
    ];
  }
  return null;
}

/**
 * Each distinct violation is logged once per hour per server instance. The
 * report-only policy is stricter than what Next.js emits, so it reports the
 * same inline bootstrap script on every page view; logging each one would
 * bury a real violation under thousands of known ones.
 */
export function createDeduper({ windowMs = 60 * 60_000, now = Date.now, maxKeys = 1000 } = {}) {
  const seen = new Map<string, number>();
  return (violation: Violation): boolean => {
    const key = `${violation.disposition}|${violation.directive}|${violation.blocked}|${violation.document}`;
    const t = now();
    const last = seen.get(key);
    if (last !== undefined && t - last < windowMs) return false;
    seen.delete(key);
    seen.set(key, t);
    while (seen.size > maxKeys) seen.delete(seen.keys().next().value!);
    return true;
  };
}

/** Reports per client: generous for a real browser, a wall for a flood. */
export const reportLimiter = createLimiter({ capacity: 30, windowMs: 60_000 });
