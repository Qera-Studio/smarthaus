import { SITE_URL } from "../../components/Schema";
import { getSettings, routes } from "../../sanity/content";

/**
 * /llms.txt, a summary for answer engines (llmstxt.org), built from the same
 * content as the site so it cannot fall out of step: the brand summary and the
 * facts from the site settings, and one line per page that is in search, in
 * that page's own title and description. A noindex page is one the site has
 * said is not ready to be quoted, so it is not listed.
 */
export const dynamic = "force-static";

export async function buildLlmsTxt(): Promise<string> {
  const [{ contact, identity, seo }, pages] = await Promise.all([
    getSettings(),
    routes().then((all) =>
      Promise.all(all.map(async (r) => ({ path: r.path, doc: await r.load() }))),
    ),
  ]);
  const lines = [
    "# Smarthaus",
    "",
    `> ${seo.llmsSummary}`,
    "",
    `- Dubai trade licence: ${identity.tradeLicence}`,
    `- SIRA licence (Security Industry Regulatory Agency): ${identity.siraLicence}`,
    `- Phone and WhatsApp: ${contact.phoneE164}`,
    `- Email: ${contact.email}`,
    "",
    "## Pages",
    "",
    ...pages
      .filter(({ doc }) => doc.seo.index)
      .map(({ path, doc }) => {
        const page = doc as typeof doc & { seo: { title: string; description: string } };
        const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
        return `- [${page.seo.title}](${url}): ${page.seo.description}`;
      }),
  ];
  return `${lines.join("\n")}\n`;
}

export async function GET(): Promise<Response> {
  return new Response(await buildLlmsTxt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
