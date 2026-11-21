import { draftMode } from "next/headers";

/**
 * Whether this request is an editor's draft preview. Outside a request (a
 * build script, a test) there is no preview, rather than an error.
 */
export async function inDraftMode(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}
