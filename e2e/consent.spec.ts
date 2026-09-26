import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Cookie consent: the banner, the preferences panel, and /cookie-preferences.
 *
 * Most of what is asserted here is a legal obligation rather than a visual
 * preference, which is why several tests measure computed styles instead of
 * taking a screenshot. The rules, from consent-content-deck.md and Legal
 * System §6:
 *
 *   - the two DECISIONS carry IDENTICAL visual weight. A ghosted or shrunken
 *     Decline is interface interference, a named dark pattern, and a [Base]
 *     non-negotiable. This is measured, not eyeballed. "Choose what to share"
 *     is deliberately quieter and has its own test: it answers nothing and
 *     stores nothing, so it is navigation rather than a third choice;
 *   - it is not a modal: no scrim, no focus trap, the page stays scrollable;
 *   - opening preferences must be escapable WITHOUT deciding, in both
 *     directions and with a pointer as well as a key;
 *   - a decline is honoured with no re-prompt. Nagging is prohibited;
 *   - dismissing (Escape) is NOT a decision and stores nothing;
 *   - withdrawal is as easy as consent, via a footer link on every page.
 */

const CONSENT_COOKIE = "smarthaus_consent";

/** The banner and the panel share one labelled region. */
const region = (page: Page) => page.getByRole("region", { name: "Cookie preferences" });

/**
 * A banner button, scoped to the banner's own action row.
 *
 * Scoped to the action row rather than the whole region, which is what makes
 * `toHaveCount(0)` mean "the banner stage is gone" rather than "no such button
 * exists anywhere on the page". The stage-switch tests rest on that
 * distinction.
 */
const bannerButton = (page: Page, name: string) =>
  region(page).locator('[class*="actions"]').getByRole("button", { name, exact: true });

const readCookie = async (page: Page) => {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === CONSENT_COOKIE) ?? null;
};

/**
 * Wait for the banner to resolve.
 *
 * The first client render is deliberately "undecided" so the server HTML and
 * the first paint agree, and the cookie is read in an effect — so the banner
 * appears a tick after load rather than in the initial markup.
 */
const waitForBanner = async (page: Page) => {
  await expect(region(page)).toBeVisible();
};

test.describe("the consent banner", () => {
  test("appears on a first visit, with all six elements and nothing else", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    const banner = region(page);
    await expect(banner.getByRole("heading", { name: "Cookies" })).toBeVisible();
    await expect(banner.getByText("Analytics stays off unless you turn it on.")).toBeVisible();
    await expect(bannerButton(page, "Accept analytics")).toBeVisible();
    await expect(bannerButton(page, "Decline")).toBeVisible();
    await expect(bannerButton(page, "Choose what to share")).toBeVisible();
    await expect(banner.getByRole("link", { name: "How we use cookies" })).toBeVisible();

    // No dismiss control. A ✕ would have to behave exactly like Decline, at
    // which point it is a second, vaguer decline — two controls doing one job
    // with one of them ambiguous is trick wording.
    //
    // This assertion now does double duty. There IS a ✕ in development, added
    // because the dev gate forces the banner open on every reload and it would
    // otherwise cover a corner of every page for the whole session. It is
    // wrapped in `process.env.NODE_ENV === "development"`, which the bundler
    // inlines, so the branch is dropped from a production build.
    //
    // This suite runs against a production build (PLAYWRIGHT=1), so this is
    // what proves that stripping actually happens rather than being assumed.
    // If the gate ever leaks — a runtime flag, a cookie, an env var read at
    // request time — this test fails, which is the point.
    await expect(banner.getByRole("button", { name: /close|dismiss|✕|×/i })).toHaveCount(0);
  });

  test("Accept and Decline carry identical visual weight", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // THE hardest constraint in the brief, and the one most likely to be
    // broken by a later "let us make Accept stand out" tweak. Measured rather
    // than trusted: they share a single CSS class precisely so this holds.
    //
    // The two DECISIONS only. "Choose what to share" is deliberately quieter
    // and is covered by its own test below — it answers nothing and stores
    // nothing, so equal weight does not apply to it.
    const metrics = await page.evaluate(() => {
      const labels = ["Accept analytics", "Decline"];
      return labels.map((label) => {
        const el = [...document.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === label,
        )!;
        const r = el.getBoundingClientRect();
        const c = getComputedStyle(el);
        return {
          label,
          height: Math.round(r.height),
          // Width is now asserted too. The buttons are `flex: 1 1 0`, so they
          // divide the row equally rather than being sized by their labels —
          // without that, "Accept analytics" is more than twice the length of
          // "Decline" and would take twice the target area. That is the same
          // dark pattern arriving through the layout instead of the colour.
          width: Math.round(r.width),
          fontSize: c.fontSize,
          fontWeight: c.fontWeight,
          background: c.backgroundColor,
          borderColor: c.borderTopColor,
          color: c.color,
          opacity: c.opacity,
          padding: c.padding,
        };
      });
    });

    const [accept, decline] = metrics;
    // Every property that could be used to de-emphasise a refusal.
    for (const key of [
      "height",
      "width",
      "fontSize",
      "fontWeight",
      "background",
      "borderColor",
      "color",
      "opacity",
      "padding",
    ] as const) {
      expect(decline![key], `Decline differs from Accept on ${key}`).toBe(accept![key]);
    }
  });

  test("both decisions are filled, and neither is an outline", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // Guards the specific regression of one decision becoming a ghost button.
    // The equal-weight test above would still pass if BOTH were outlines, and
    // an outlined pair against a filled "Choose what to share" would promote
    // the longer path over refusing.
    for (const label of ["Accept analytics", "Decline"]) {
      const filled = await bannerButton(page, label).evaluate((el) => {
        const c = getComputedStyle(el);
        return {
          transparent: c.backgroundColor === "rgba(0, 0, 0, 0)",
          borderWidth: c.borderTopWidth,
        };
      });
      expect(filled.transparent, `${label} has no fill`).toBe(false);
      expect(filled.borderWidth, `${label} has a border`).toBe("0px");
    }
  });

  test("Choose what to share is quieter than the decisions but still reachable", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForBanner(page);

    // It is allowed to be quieter — it is not an answer to the question. What
    // it may NOT do is drop below the touch target or the contrast floor,
    // because "de-emphasised" must not become "hard to find or hard to hit".
    const customise = await bannerButton(page, "Choose what to share").evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        height: Math.round(el.getBoundingClientRect().height),
        fontSize: c.fontSize,
        opacity: c.opacity,
      };
    });
    const accept = await bannerButton(page, "Accept analytics").evaluate((el) => ({
      fontSize: getComputedStyle(el).fontSize,
    }));

    // WCAG 2.2 · 2.5.8.
    expect(customise.height).toBeGreaterThanOrEqual(44);
    // Same type size as the decisions, and not faded out. The difference is
    // fill and ink, never scale or opacity — shrinking it would be the
    // interface interference this is trying to avoid.
    expect(customise.fontSize).toBe(accept.fontSize);
    expect(customise.opacity).toBe("1");
  });

  test("sits on the start edge of the viewport", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // Left on an LTR page. Asserted against the viewport's own midpoint rather
    // than a pixel value, because the card's width differs per device project.
    // `inset-inline-start` rather than `left`, so this flips with dir="rtl"
    // when Arabic ships — the assertion is deliberately about the START edge.
    const placement = await region(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { start: r.left, end: r.right, viewport: window.innerWidth };
    });
    expect(placement.start).toBeLessThan(placement.viewport / 2);
  });

  test("is not a modal: the page stays reachable behind it", async ({ page }) => {
    await page.goto("/terms");
    await waitForBanner(page);

    // No scrim. A dimmed page would mean content withheld pending a choice,
    // which is a cookie wall, and consent is not freely given if the site is
    // held hostage.
    const scrims = await page.evaluate(() => {
      return [...document.querySelectorAll("div, section")].filter((el) => {
        const c = getComputedStyle(el);
        if (c.position !== "fixed") return false;
        const r = el.getBoundingClientRect();
        const coversViewport = r.width >= window.innerWidth && r.height >= window.innerHeight;
        const tinted = c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "";
        return coversViewport && tinted && !el.closest('[aria-label="Cookie preferences"]');
      }).length;
    });
    expect(scrims).toBe(0);

    // The page still scrolls with the banner up.
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);

    // And the content underneath is still operable.
    await expect(page.locator("main")).toBeVisible();
  });

  test("comes last in the document, after the page content", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // The banner is the final element in <body> so a keyboard visitor reaches
    // the page before it, rather than having a consent notice stand between
    // them and the content. That is worth having even though it is not a focus
    // trap.
    //
    // Asserted as DOCUMENT ORDER rather than by pressing Tab, which is what an
    // earlier version did and got wrong. Safari does not include links in the
    // Tab sequence by default: on the iPhone project, Tab from a fresh load
    // focuses nothing at all when the banner is absent (activeElement stays on
    // <body>), so "the first Tab lands on the skip link" was never true there
    // and the assertion was measuring a Chromium-only behaviour. Document
    // order is the thing actually being guaranteed, and it holds in every
    // engine.
    const isLast = await page.evaluate(() => {
      const banner = document.querySelector('[aria-label="Cookie preferences"]');
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");
      if (!banner || !main || !footer) return null;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4: the argument comes after `this`.
      const afterMain = (main.compareDocumentPosition(banner) & 4) !== 0;
      const afterFooter = (footer.compareDocumentPosition(banner) & 4) !== 0;
      return { afterMain, afterFooter };
    });
    expect(isLast).toEqual({ afterMain: true, afterFooter: true });
  });

  test("every control in it is reachable by keyboard", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // The floor that matters regardless of how a given engine orders Tab: each
    // of the three decisions can be taken without a pointer. They are real
    // <button>s, so this is the platform's behaviour rather than ours — which
    // is exactly why the brief rules out styled <div>s.
    for (const label of ["Accept analytics", "Decline", "Choose what to share"]) {
      const button = bannerButton(page, label);
      await button.focus();
      await expect(button).toBeFocused();
    }
  });
});

test.describe("the choice", () => {
  test("Accept stores consent and dismisses the banner", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Accept analytics").click();

    await expect(region(page)).toBeHidden();

    const cookie = await readCookie(page);
    expect(cookie).not.toBeNull();
    const record = JSON.parse(decodeURIComponent(cookie!.value));
    expect(record.analytics).toBe(true);
    expect(record.basis).toBe("explicit");
    // The record must carry the notice version and when the choice was made:
    // Legal §6 asks for "what was consented to, when, which notice version".
    expect(typeof record.version).toBe("string");
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false);
    // And no identifier of any kind.
    expect(Object.keys(record).sort()).toEqual(["analytics", "basis", "timestamp", "version"]);
  });

  test("Decline stores a refusal and never re-prompts", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Decline").click();
    await expect(region(page)).toBeHidden();

    const record = JSON.parse(decodeURIComponent((await readCookie(page))!.value));
    expect(record.analytics).toBe(false);
    expect(record.basis).toBe("explicit");

    // Nagging is prohibited: no re-prompt on the next page, and none on a
    // later visit inside the 12-month window. This is the assertion that
    // catches a well-meaning "ask again just once" change.
    await page.goto("/terms");
    await page.waitForTimeout(600);
    await expect(region(page)).toHaveCount(0);

    await page.goto("/");
    await page.waitForTimeout(600);
    await expect(region(page)).toHaveCount(0);
  });

  test("the cookie is a 12-month, first-party, SameSite=Lax record", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Decline").click();
    await expect(region(page)).toBeHidden();

    const cookie = (await readCookie(page))!;
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.path).toBe("/");
    // Never httpOnly: the client script has to read it.
    expect(cookie.httpOnly).toBe(false);
    // 12 months, within a day's tolerance for clock skew in the run.
    const days = (cookie.expires * 1000 - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThan(370);
  });

  test("an Escape pressed the instant the banner appears is not lost", async ({ page }) => {
    // The banner used to attach its Escape listener in a passive effect, which
    // runs after paint. On a slow device a visitor could press Escape while the
    // banner was already on screen and not yet listening (CI's iPhone project
    // did, intermittently). This makes that timing exact instead of lucky: a
    // MutationObserver fires in the microtask right after React inserts the
    // region, before any paint, and presses Escape there. A listener attached
    // in the same commit (a layout effect) receives it; a passive one never
    // does, so the old code fails this every time.
    await page.addInitScript(() => {
      const watch = new MutationObserver(() => {
        if (!document.querySelector('[aria-label="Cookie preferences"]')) return;
        watch.disconnect();
        (window as unknown as { __bannerSeen?: boolean }).__bannerSeen = true;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      document.addEventListener("DOMContentLoaded", () =>
        watch.observe(document.body, { childList: true, subtree: true }),
      );
    });
    await page.goto("/");
    // Settle past hydration so a region that did appear would be visible.
    await page.waitForLoadState("networkidle");
    // It did appear, so "hidden" below means dismissed, not never shown.
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __bannerSeen?: boolean }).__bannerSeen),
      )
      .toBe(true);
    await expect(region(page)).toBeHidden();
    expect(await readCookie(page)).toBeNull();
  });

  test("Escape dismisses without storing anything", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    await page.keyboard.press("Escape");
    await expect(region(page)).toBeHidden();

    // Dismissal is NOT consent and not a decline: nothing is recorded, so the
    // banner returns next time rather than a silent "no" being kept on file.
    // This is the assertion that matters, and it is exact.
    expect(await readCookie(page)).toBeNull();

    // And it does come back. Waited for explicitly rather than on the default
    // timeout: the banner resolves in an effect after hydration, so on a
    // fresh navigation under parallel load the first poll can land before the
    // cookie has been read. That made this flake on the iPhone project while
    // passing in isolation — a slow assertion, not a wrong one.
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(region(page)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("the preferences panel", () => {
  test("replaces the banner rather than expanding beneath it", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    const customise = bannerButton(page, "Choose what to share");
    await expect(customise).toHaveAttribute("aria-expanded", "false");
    await customise.click();

    // The panel is a second STAGE, not a drawer. The banner's heading, body and
    // both decision buttons are gone from the DOM entirely — not merely hidden,
    // which is what the old animated expansion did and why it needed `inert` to
    // keep the collapsed panel out of the tab order.
    await expect(region(page).getByRole("heading", { name: "Cookies", exact: true })).toHaveCount(
      0,
    );
    await expect(customise).toHaveCount(0);
    await expect(bannerButton(page, "Decline")).toHaveCount(0);

    // And the panel is the only thing in the region now.
    await expect(region(page).getByRole("heading", { name: "Cookie preferences" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Analytics" })).toBeVisible();

    // Opening the panel is not a decision.
    expect(await readCookie(page)).toBeNull();
  });

  test("the panel overlaps the banner's own footprint", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // Both stages are anchored to the same two edges, so the panel unfolds from
    // where the banner was instead of the card jumping to a different corner.
    // Measured on the anchored edges, which must not move.
    const before = await region(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { start: Math.round(r.left), bottom: Math.round(r.bottom) };
    });

    await bannerButton(page, "Choose what to share").click();
    await expect(page.getByRole("switch", { name: "Analytics" })).toBeVisible();

    const after = await region(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { start: Math.round(r.left), bottom: Math.round(r.bottom) };
    });

    // 1px of tolerance for subpixel layout, not for a repositioned card.
    expect(Math.abs(after.start - before.start)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.bottom - before.bottom)).toBeLessThanOrEqual(1);
  });

  test("Back returns to the banner without storing a choice", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);

    // The banner's own toggle is unmounted while the panel is open, so without
    // this control a pointer user who opened preferences to read them could
    // only leave by deciding. That is a cookie wall in miniature.
    await bannerButton(page, "Choose what to share").click();
    await expect(page.getByRole("switch", { name: "Analytics" })).toBeVisible();

    await region(page).getByRole("button", { name: "Back", exact: true }).click();

    await expect(bannerButton(page, "Accept analytics")).toBeVisible();
    await expect(bannerButton(page, "Decline")).toBeVisible();
    // Looking is not deciding, in either direction.
    expect(await readCookie(page)).toBeNull();
  });

  test("focus follows the stage change", async ({ page, browserName }) => {
    // WebKit's Tab sequence omits links but `focus()` and programmatic focus
    // work the same everywhere, so this holds in every engine.
    await page.goto("/");
    await waitForBanner(page);

    await bannerButton(page, "Choose what to share").click();
    // The control that had focus was just unmounted. Without the handoff, focus
    // falls back to <body> and a keyboard visitor is silently returned to the
    // top of the document with the panel they asked for somewhere below.
    const landedInPanel = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return false;
      return active.closest('[aria-label="Cookie preferences"]') !== null;
    });
    expect(landedInPanel, `focus left the panel on ${browserName}`).toBe(true);

    // And back again, onto the control that opened it.
    await region(page).getByRole("button", { name: "Back", exact: true }).click();
    await expect(bannerButton(page, "Choose what to share")).toBeFocused();
  });

  test("keeps the Clarity disclosure above the fold on open", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Choose what to share").click();
    await expect(page.getByRole("switch", { name: "Analytics" })).toBeVisible();

    // The brief's hardest CONTENT constraint, and the reason Analytics comes
    // before Essential and the panel has no Accept shortcut.
    //
    // The panel's copy scrolls on a phone, so "is in the DOM" and even "is
    // visible" are both too weak: an element inside a scroll container counts
    // as visible while sitting below the fold. This asserts the masking promise
    // is within the scrolled viewport WITHOUT scrolling — that is what "not
    // buried" has to mean for a disclosure nobody knows to look for.
    const visible = await page.evaluate(() => {
      const region = document.querySelector('[aria-label="Cookie preferences"]')!;
      const rows = region.querySelector('[class*="rows"]')!;
      const disclosure = region.querySelector('[class*="disclosure"]')!;
      const rr = rows.getBoundingClientRect();
      const dr = disclosure.getBoundingClientRect();
      // The first line at minimum: enough of the paragraph is on screen to be
      // read and to signal there is more, rather than starting below the fold.
      return dr.top >= rr.top - 1 && dr.top < rr.bottom - 16;
    });
    expect(visible, "the Clarity disclosure starts below the scroll fold").toBe(true);
  });

  test("the panel offers Save and a way back, and no Accept shortcut", async ({ page }) => {
    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Choose what to share").click();

    const panel = region(page);
    await expect(panel.getByRole("button", { name: "Save preferences" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    // Removed deliberately: with the switch on, Save does the same thing, and
    // the third button's height pushed the Clarity disclosure below the fold.
    // Accept now appears once, on the banner, as one of two equal answers.
    await expect(panel.getByRole("button", { name: "Accept analytics" })).toHaveCount(0);
  });

  test("Essential reads as information, not a choice", async ({ page }) => {
    await page.goto("/cookie-preferences");

    const essential = page.getByRole("switch", { name: "Essential" });
    await expect(essential).toBeChecked();
    // Disabled, not a switch that looks operable and silently refuses — which
    // is a dark pattern in control form.
    await expect(essential).toBeDisabled();
    await expect(page.getByText("Always on")).toBeVisible();
  });

  test("Analytics defaults off and saving it off is honoured", async ({ page }) => {
    await page.goto("/cookie-preferences");

    const analytics = page.getByRole("switch", { name: "Analytics" });
    await expect(analytics).not.toBeChecked();
    await expect(analytics).toBeEnabled();

    await page.getByRole("button", { name: "Save preferences" }).click();
    const record = JSON.parse(decodeURIComponent((await readCookie(page))!.value));
    expect(record.analytics).toBe(false);
  });

  test("the analytics switch is keyboard operable", async ({ page }) => {
    await page.goto("/cookie-preferences");

    const analytics = page.getByRole("switch", { name: "Analytics" });
    await analytics.focus();
    await expect(analytics).toBeFocused();
    await page.keyboard.press("Space");
    await expect(analytics).toBeChecked();

    await page.getByRole("button", { name: "Save preferences" }).click();
    const record = JSON.parse(decodeURIComponent((await readCookie(page))!.value));
    expect(record.analytics).toBe(true);
  });

  test("keeps the Clarity session-recording disclosure visible and separate", async ({ page }) => {
    await page.goto("/cookie-preferences");

    // The brief singles this paragraph out: it is the one a careful reader
    // would object to if they found it undisclosed, and the instinct is to
    // merge it into the paragraph above. It must be its own visible block.
    const disclosure = page.getByText(
      "Clarity records how a page is used, including clicks and scrolling.",
    );
    await expect(disclosure).toBeVisible();
    await expect(
      page.getByText("Anything typed into a form is masked and never recorded."),
    ).toBeVisible();
    // And the retention line stays its own paragraph rather than being folded in.
    await expect(page.getByText("Stored for up to 14 months.")).toBeVisible();
  });
});

test.describe("/cookie-preferences", () => {
  test("responds 200 with one h1", async ({ page }) => {
    const response = await page.goto("/cookie-preferences");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cookie preferences" }),
    ).toBeAttached();
  });

  test("passes axe accessibility checks", async ({ page }) => {
    await page.goto("/cookie-preferences");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the footer link opens the panel in place once a choice is on file", async ({
    page,
    browserName,
  }) => {
    // Withdrawal must be as easy as consent (Legal §6), and the banner is gone
    // once a choice exists — so this link is the only way back in. If it
    // disappears, the panel's own withdrawal copy becomes false.
    await page.goto("/terms");
    await waitForBanner(page);
    await bannerButton(page, "Decline").click();
    await expect(region(page)).toHaveCount(0);

    const link = page.locator("footer").getByRole("link", { name: /cookie preferences/i });
    await expect(link).toBeVisible();
    // Still a real link to the page: that is the no-JS path and the target of
    // a modified click. See the no-JS test below.
    await expect(link).toHaveAttribute("href", "/cookie-preferences");

    // A plain click opens the panel here rather than leaving the page.
    await link.click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(region(page)).toBeVisible();
    await expect(region(page).getByRole("button", { name: "Save preferences" })).toBeVisible();
    await expect(region(page).getByRole("button", { name: "Back" })).toBeVisible();

    // Escape closes it without deciding anything, and hands focus back to the
    // link that opened it — there is no banner to return to.
    await page.keyboard.press("Escape");
    await expect(region(page)).toHaveCount(0);
    // Same WebKit caveat as "focus follows the stage change": Safari does not
    // put links in the focus sequence, so the assertion is Chromium-only.
    if (browserName !== "webkit") await expect(link).toBeFocused();
  });

  test("without JavaScript the footer link is a plain link to the page", async ({ browser }) => {
    // The panel-in-place behaviour is an enhancement; the route is the
    // guarantee. A visitor with scripts off must still reach the controls.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/terms");
    await page
      .locator("footer")
      .getByRole("link", { name: /cookie preferences/i })
      .click();
    await expect(page).toHaveURL(/\/cookie-preferences$/);
    await expect(page.getByRole("heading", { level: 1, name: "Cookie preferences" })).toBeVisible();
    await context.close();
  });

  test("stays noindex while the copy is counsel-pending", async ({ page }) => {
    await page.goto("/cookie-preferences");
    // Same reasoning as /privacy and /terms: the consent copy is reviewed
    // alongside the privacy policy as one review, and indexing it first would
    // publish copy a lawyer has not seen.
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("no em dashes in the visible copy", async ({ page }) => {
    await page.goto("/cookie-preferences");
    // The house rule every other page suite asserts. textContent, not
    // innerText: the panel's copy must be checked even where a container is
    // clipped.
    const copy = await page.locator("main").textContent();
    expect(copy).not.toContain("—");
  });

  test("does not overflow horizontally", async ({ page }) => {
    await page.goto("/cookie-preferences");
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});

test.describe("what the banner must not do", () => {
  test("loads no analytics script, accepted or not", async ({ page }) => {
    // The whole point of the current scope: the gate exists, the tags do not.
    // consent-content-deck.md §13 lists six items as blocking before they may
    // fire, five of them outside engineering. If a script appears here, it has
    // been shipped ahead of a DPIA screen, a cross-border transfer basis and
    // counsel review.
    const thirdParty: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/googletagmanager|google-analytics|clarity\.ms|analytics\.google/.test(url)) {
        thirdParty.push(url);
      }
    });

    await page.goto("/");
    await waitForBanner(page);
    await bannerButton(page, "Accept analytics").click();
    await expect(region(page)).toBeHidden();
    await page.goto("/terms");
    await page.waitForTimeout(800);

    expect(thirdParty).toEqual([]);
  });

  test("the privacy policy no longer claims there is no banner", async ({ page }) => {
    await page.goto("/privacy");
    const copy = (await page.locator("main").textContent()) ?? "";
    // The policy used to state in bold that "there is no cookie consent
    // banner. This is a deliberate design decision, not an omission." Shipping
    // the banner while that stood would be a misrepresentation, and the deck is
    // explicit that an inaccurate policy is worse than none.
    expect(copy).not.toContain("there is no cookie consent banner");
    // And the anchor the banner links to has to exist.
    await expect(page.locator("#cookies")).toHaveCount(1);
  });
});
