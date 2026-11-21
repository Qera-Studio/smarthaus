import { Footer } from "../../Footer";
import { AnnouncementBar } from "../AnnouncementBar";
import { renderMarkup } from "../../../__tests__/helpers/server";

/**
 * Both read the site settings in Sanity, and a visitor sees both on every
 * page, so they must agree: a number shown one way in one and another way in
 * the other is a published contradiction.
 */

const hrefs = (markup: string, scheme: string) =>
  [...markup.matchAll(new RegExp(`href="(${scheme}[^"]*)"`, "g"))].map((m) => m[1]);

const bar = () => renderMarkup(<AnnouncementBar />);
const footer = () => renderMarkup(<Footer />);

describe("the contact bar and the footer", () => {
  it("dial the same number", async () => {
    const fromBar = hrefs(await bar(), "tel:");
    expect(fromBar).toHaveLength(1);
    expect(hrefs(await footer(), "tel:")).toContain(fromBar[0]);
  });

  it("mail the same address", async () => {
    const fromBar = hrefs(await bar(), "mailto:");
    expect(fromBar).toHaveLength(1);
    expect(hrefs(await footer(), "mailto:")).toContain(fromBar[0]);
  });

  it("open WhatsApp on the same number", async () => {
    const number = (href: string | undefined) => href?.match(/wa\.me\/(\d+)/)?.[1];
    const fromBar = number(hrefs(await bar(), "https://wa.me/")[0]);
    const fromFooter = hrefs(await footer(), "https://wa.me/").map(number);
    expect(fromBar).toBeDefined();
    expect(fromFooter).toContain(fromBar);
  });

  it("show the number grouped the same way", async () => {
    const grouped = (await bar()).match(/call us at ([+\d ]+)</)?.[1]?.trim();
    expect(grouped).toBeDefined();
    expect(await footer()).toContain(grouped);
  });
});
