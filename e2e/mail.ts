import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "./fixtures";
import { MAIL_SINK } from "./mail-sink";

/**
 * Reading back the emails the e2e server wrote instead of sending them. See
 * the sink note in src/app/contact/actions.ts.
 *
 * Workers run in parallel against one server, so a test finds its own email
 * by a marker it put in the form (a unique name), never by "the latest file".
 */

export type SentMail = {
  from: string;
  to: string | null;
  subject: string;
  text: string;
  replyTo?: string;
};

/** A name no other test, on any device or worker, will use. */
export function uniqueName(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

async function all(): Promise<SentMail[]> {
  const files = await readdir(MAIL_SINK).catch(() => [] as string[]);
  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => JSON.parse(await readFile(join(MAIL_SINK, file), "utf8")) as SentMail),
  );
}

/** Every email whose subject names this marker. */
export async function mailFor(marker: string): Promise<SentMail[]> {
  return (await all()).filter((mail) => mail.subject.includes(marker));
}

/** The one email for this marker, waiting for the server to write it. */
export async function sentMail(marker: string): Promise<SentMail> {
  await expect.poll(async () => (await mailFor(marker)).length, { timeout: 10_000 }).toBe(1);
  return (await mailFor(marker))[0]!;
}

/** The value after a label in the email's body, trimmed. */
export function line(mail: SentMail, label: string): string | undefined {
  return mail.text
    .split("\n")
    .find((row) => row.startsWith(`${label}:`))
    ?.slice(label.length + 1)
    .trim();
}
