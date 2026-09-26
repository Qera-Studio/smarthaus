import { join } from "node:path";

/**
 * Where the e2e web server writes the emails it would have sent. Shared by
 * playwright.config.ts (which hands it to the server) and e2e/mail.ts (which
 * reads it back), and nothing else, so it has no Playwright imports.
 *
 * Absolute, because the server and the test workers resolve paths from
 * different working directories otherwise. Gitignored.
 */
export const MAIL_SINK = join(process.cwd(), ".e2e-mail");
