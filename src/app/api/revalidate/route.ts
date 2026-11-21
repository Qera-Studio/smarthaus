import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { SANITY_TAG } from "../../../sanity/env";

/**
 * Sanity's publish webhook. A signed POST expires every cached content fetch,
 * so the next visit renders the published content.
 *
 * The signature is the only gate, and it is checked before anything happens:
 * an unsigned or mis-signed call changes nothing and learns nothing. Expiring
 * the cache is the whole effect, so even a replayed valid call costs one
 * re-render, never a change of content.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 503 });

  // true: wait out Content Lake's eventual consistency, so the re-render reads
  // what was just published rather than the version before it.
  const { isValidSignature } = await parseBody(request, secret, true);
  if (!isValidSignature) return new Response(null, { status: 401 });

  // expire: 0, not "max": the editor who just pressed Publish reloads and
  // expects to see it, not the old page once more while the new one renders.
  revalidateTag(SANITY_TAG, { expire: 0 });
  return new Response(null, { status: 204 });
}
