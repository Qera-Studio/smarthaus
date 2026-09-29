import type { Instrumentation } from "next";
import { checkConfig } from "./lib/runtime-config";

/**
 * Runs once per server instance, before it takes requests.
 *
 * A production deployment missing its Resend or WhatsApp settings would
 * otherwise go unnoticed until a lead's enquiry failed. This says so at
 * start-up, in one structured line naming each variable and never its value.
 *
 * It logs rather than throws, deliberately. Throwing here fails every server
 * route, the CSP report endpoint included, while the enquiry form already
 * fails safe on its own: it shows the WhatsApp fallback and logs the send
 * failure (Security System §18). Only Vercel production is checked: previews
 * and local builds legitimately run without the keys.
 */
export function register() {
  if (process.env.VERCEL_ENV !== "production") return;
  const problems = checkConfig(process.env);
  if (problems.length > 0) {
    console.error(JSON.stringify({ event: "config-invalid", problems }));
  }
}

/**
 * Every server error, as one structured line with the route it happened on
 * (Security System §13). The error's name and digest, not its message: a
 * message can carry a lead's details, and the digest is what matches the
 * error a visitor saw to the server's own log. The path loses its query
 * string for the same reason.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;
  console.error(
    JSON.stringify({
      event: "request-error",
      name: error instanceof Error ? error.name : typeof error,
      digest,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
    }),
  );
};
