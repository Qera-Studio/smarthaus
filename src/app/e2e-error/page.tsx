import { notFound } from "next/navigation";

/**
 * A page that throws, so e2e/error-pages.spec.ts can show the error boundary
 * in a real browser. It exists only under Playwright: everywhere else it is a
 * 404, and it is in no sitemap or navigation. Dynamic, so the check runs per
 * request rather than once at build, when the e2e build would fail on it.
 */
export const dynamic = "force-dynamic";

export default function E2EError(): never {
  if (process.env.PLAYWRIGHT !== "1") notFound();
  throw new Error("e2e: the error boundary under test");
}
