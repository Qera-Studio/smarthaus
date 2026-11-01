import { test } from "./fixtures";

// Temporary diagnostic, never merged: what holds rendering on / in Linux WebKit.
for (const route of ["/", "/about"]) {
  test(`${route} resources`, async ({ page }) => {
    test.setTimeout(40_000);
    const pending = new Map<string, string>();
    const failed: string[] = [];
    page.on("request", (r) => pending.set(r.url(), r.resourceType()));
    page.on("requestfinished", (r) => pending.delete(r.url()));
    page.on("requestfailed", (r) => {
      pending.delete(r.url());
      failed.push(`${r.resourceType()} ${r.url()} ${r.failure()?.errorText}`);
    });
    await page.goto(route);
    await page.waitForTimeout(6000);
    const state = await page.evaluate(() => ({
      ready: document.readyState,
      head: [...document.head.querySelectorAll("link")].map(
        (l) =>
          `${l.rel} as=${l.getAttribute("as")} blocking=${l.getAttribute("blocking")} sheet=${
            l.rel === "stylesheet" ? Boolean(l.sheet) : "-"
          } ${l.getAttribute("href") ?? l.getAttribute("imagesrcset")?.slice(0, 80)}`,
      ),
      blockingScripts: [...document.querySelectorAll("script[blocking],style[blocking]")].length,
      visibility: document.visibilityState,
    }));
    console.log(`DIAG ${route} ready=${state.ready} vis=${state.visibility} blocking=${state.blockingScripts}`);
    for (const h of state.head) console.log(`DIAG ${route} head ${h}`);
    for (const [u, t] of pending) console.log(`DIAG ${route} PENDING ${t} ${u}`);
    for (const f of failed) console.log(`DIAG ${route} FAILED ${f}`);
  });
}
