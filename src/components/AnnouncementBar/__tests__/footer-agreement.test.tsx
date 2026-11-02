import { renderToStaticMarkup } from "react-dom/server";

import { Footer } from "../../Footer";
import { AnnouncementBar } from "../AnnouncementBar";

/**
 * The bar reads src/lib/contact.ts; the footer writes its numbers out by
 * hand. A visitor sees both on every page, so they must agree: a number
 * changed in one place and not the other is a published contradiction.
 */

const hrefs = (markup: string, scheme: string) =>
  [...markup.matchAll(new RegExp(`href="(${scheme}[^"]*)"`, "g"))].map((m) => m[1]);

const bar = () => renderToStaticMarkup(<AnnouncementBar />);
const footer = () => renderToStaticMarkup(<Footer />);

describe("the contact bar and the footer", () => {
  it("dial the same number", () => {
    const fromBar = hrefs(bar(), "tel:");
    expect(fromBar).toHaveLength(1);
    expect(hrefs(footer(), "tel:")).toContain(fromBar[0]);
  });

  it("mail the same address", () => {
    const fromBar = hrefs(bar(), "mailto:");
    expect(fromBar).toHaveLength(1);
    expect(hrefs(footer(), "mailto:")).toContain(fromBar[0]);
  });

  it("open WhatsApp on the same number", () => {
    const number = (href: string | undefined) => href?.match(/wa\.me\/(\d+)/)?.[1];
    const fromBar = number(hrefs(bar(), "https://wa.me/")[0]);
    const fromFooter = hrefs(footer(), "https://wa.me/").map(number);
    expect(fromBar).toBeDefined();
    expect(fromFooter).toContain(fromBar);
  });

  it("show the number grouped the same way", () => {
    const grouped = bar()
      .match(/call us at ([+\d ]+)</)?.[1]
      ?.trim();
    expect(grouped).toBeDefined();
    expect(footer()).toContain(grouped);
  });
});
