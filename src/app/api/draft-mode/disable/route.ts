import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Leaves the preview: clears the draft cookie and goes back to the home page. */
export async function GET(request: NextRequest): Promise<Response> {
  (await draftMode()).disable();
  return NextResponse.redirect(new URL("/", request.url));
}
