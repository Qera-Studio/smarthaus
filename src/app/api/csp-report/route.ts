import { clientKey } from "../../../lib/rate-limit";
import {
  createDeduper,
  MAX_REPORT_BYTES,
  parseReport,
  reportLimiter,
} from "../../../lib/csp-report";

/**
 * Where browsers send Content-Security-Policy violation reports, from both
 * the enforced policy and the stricter report-only one (next.config.ts).
 * Security System §8: report-only CSP on every build, so what an enforced
 * policy would break is known before it is enforced.
 *
 * Unauthenticated by nature, so it is bounded on every axis: rate-limited per
 * client, capped in size, schema-checked, and it logs each distinct violation
 * once an hour. It never echoes anything back: 204 on success, a bare status
 * otherwise.
 */
const firstSighting = createDeduper();

export async function POST(request: Request): Promise<Response> {
  if (!reportLimiter.take(clientKey(request.headers)).ok) {
    return new Response(null, { status: 429 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_REPORT_BYTES) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const violations = parseReport(request.headers.get("content-type") ?? "", body);
  if (violations === null) return new Response(null, { status: 400 });

  for (const violation of violations) {
    if (firstSighting(violation)) {
      // One structured line, so the platform's log search can filter on it.
      console.info(JSON.stringify({ event: "csp-violation", ...violation }));
    }
  }
  return new Response(null, { status: 204 });
}
