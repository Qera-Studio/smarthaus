import { test, expect } from "./fixtures";
import { expectAccessible, expectHydrated, expectNoEmDash } from "./checks";

/**
 * /faq — the smoke suite AGENTS.md requires of every real page, plus the two
 * things specific to this one: the answers must be in the HTML whether or not
 * a disclosure is open, and the page must stay noindex while it carries
 * unconfirmed facts.
 */
test.describe("/faq", () => {
  test("responds 200 with one h1", async ({ page }) => {
    const response = await page.goto("/faq");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Frequently Asked Questions" }),
    ).toBeAttached();
  });

  test("passes axe accessibility checks", async ({ page }) => {
    await page.goto("/faq");
    await expectAccessible(page);
  });

  test("answers are in the DOM while collapsed", async ({ page }) => {
    await page.goto("/faq");
    // The reason for <details> over a JS accordion: a closed answer is still
    // text a crawler and a screen reader can reach. If this ever fails, the
    // page has 42 answers nobody outside a mouse can read.
    const answer = page.getByText("Across Dubai.", { exact: true });
    await expect(answer).toBeAttached();
  });

  // Located by element, not by role. Chromium exposes no ARIA role for a bare
  // <summary>, so getByRole("button") matches nothing here — the disclosure is
  // still announced and operated correctly, it simply is not reachable through
  // the role selector. See the "announced as a control" test below, which is
  // what guards the accessible name.
  const disclosure = (page: import("@playwright/test").Page) =>
    page.locator("details").filter({ hasText: "Where do you work?" }).first();

  test("a question opens and closes on click", async ({ page }) => {
    await page.goto("/faq");
    const question = disclosure(page);
    await expect(question).not.toHaveAttribute("open", /.*/);
    await question.locator("summary").click();
    await expect(question).toHaveAttribute("open", /.*/);
    // Closing again matters as much as opening: a row that only opens is a
    // one-way door on a page of 42 of them.
    await question.locator("summary").click();
    await expect(question).not.toHaveAttribute("open", /.*/);
  });

  test("is keyboard operable", async ({ page }) => {
    await page.goto("/faq");
    // 2.1.3 Keyboard (No Exception) is adopted — see CLAUDE.md. <summary> is
    // focusable and Enter-activated natively; this asserts nothing has been
    // styled or wrapped in a way that breaks it.
    const question = disclosure(page);
    const summary = question.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(question).toHaveAttribute("open", /.*/);
  });

  test("each question is announced with its question as the name and its state", async ({
    page,
  }) => {
    await page.goto("/faq");
    const question = disclosure(page);
    const summary = question.locator("summary");

    // The accessible name is the question itself — the chevron is aria-hidden,
    // so it cannot leak into the name.
    await expect(summary).toHaveAccessibleName("Where do you work?");

    // And the open/closed state is exposed, which is the whole reason for using
    // <details> rather than a div with a click handler. Read from the AX tree
    // rather than from the DOM attribute: the attribute is on <details>, while
    // what matters is what the control reports.
    const expanded = async () =>
      summary.evaluate((el) => (el.parentElement as HTMLDetailsElement).open);
    expect(await expanded()).toBe(false);
    await summary.click();
    expect(await expanded()).toBe(true);
  });

  test("arriving from the footer link lands at the top of the page", async ({ page }) => {
    // The page opts into the legal shell's smooth scrolling, which also applies
    // to the scroll reset a route change performs: arriving from a scrolled
    // page ANIMATED downward-to-upward and settled short of the top (measured:
    // scrollY 75), which left the nav in its scrolled capsule on a page the
    // reader had not scrolled. globals.scss now arms the smoothing only while a
    // :target is active.
    await page.goto("/solutions");
    // This asserts a client-side route change, so tap only once the client
    // router is live: on CI's WebKit runner a tap before hydration went
    // nowhere and the test timed out waiting for /faq.
    await expectHydrated(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("link", { name: "FAQs" }).click();
    await page.waitForURL("**/faq");

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    // And therefore the nav is in its full top-of-page state, not the capsule.
    await expect(page.locator("[data-stuck]")).toHaveCount(0);
  });

  test("the ToC follows the section being read", async ({ page }) => {
    await page.goto("/faq");
    // Below lg the rail is not rendered at all.
    const rail = page.locator("nav", { hasText: "On this page" });
    if ((await rail.count()) === 0) test.skip();

    const activeLabel = () =>
      page
        .locator('[data-active="true"]')
        .textContent()
        .then((t) => t?.trim());

    // Put a later section's heading above the reading line and the rail must
    // already name it. Before the fix the line sat at 35% of the viewport, so
    // the rail read a whole section behind what was on screen.
    for (const [id, label] of [
      ["what-it-costs", "Cost"],
      ["your-existing-home", "Your home"],
      ["for-designers", "For designers"],
    ] as const) {
      await page.evaluate((anchor) => {
        const h = document.getElementById(anchor)!;
        window.scrollTo({
          top: window.scrollY + h.getBoundingClientRect().top - 200,
          behavior: "instant" as ScrollBehavior,
        });
      }, id);
      await expect.poll(activeLabel).toBe(label);
    }
  });

  test("the ToC marks the last section once the page is fully scrolled", async ({ page }) => {
    await page.goto("/faq");
    const rail = page.locator("nav", { hasText: "On this page" });
    if ((await rail.count()) === 0) test.skip();

    // The final sections are short, so their headings never climb to the
    // reading line — the document runs out of scroll first. Without the
    // end-of-page case the rail stranded on the second-to-last section even
    // with the reader past the final question.
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant" as ScrollBehavior,
      }),
    );
    await expect
      .poll(() =>
        page
          .locator('[data-active="true"]')
          .textContent()
          .then((t) => t?.trim()),
      )
      .toBe("For designers");
  });

  test("no em dashes in the copy, including the collapsed answers", async ({ page }) => {
    await page.goto("/faq");
    // The house rule the legal, placeholder and contact pages all assert.
    // textContent, not innerText: a closed <details> hides its answer from the
    // rendered text, and on this page 42 of the 42 answers start closed — which
    // is exactly the copy an em dash would slip through in.
    await expectNoEmDash(page.locator("main"));
  });

  test("is noindex and emits no schema while facts are unconfirmed", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // The two flip together — see FAQ_IS_PUBLISHABLE in src/app/faq/page.tsx.
    // Structured data on a noindex page is a contradictory signal, and these
    // answers still contain figures that must not be quoted back by an answer
    // engine. Invert both assertions in the change that clears the placeholders.
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator("[data-placeholder]").first()).toBeAttached();
  });
});
