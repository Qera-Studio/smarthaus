import { test } from "./fixtures";

// Temporary diagnostic, never merged: why actions on / never find a stable box
// in Linux WebKit.
const VARIANTS: Record<string, string> = {
  shipped: "",
  noHero: "[data-hero] { display: none !important; }",
  noBlur:
    "* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }",
  allPaused: "*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }",
  noHeroImages: "[data-hero] img { display: none !important; }",
};

for (const route of ["/", "/about"]) {
  for (const [name, css] of Object.entries(VARIANTS)) {
    if (route === "/about" && name !== "shipped") continue;
    test(`${route} ${name}`, async ({ page }) => {
      test.setTimeout(40_000);
      if (css)
        await page.addInitScript((c) => {
          const add = () => {
            const s = document.createElement("style");
            s.textContent = c;
            document.head.append(s);
          };
          if (document.head) add();
          else document.addEventListener("DOMContentLoaded", add, { once: true });
        }, css);
      await page.goto(route);
      await page.waitForTimeout(2000);
      const frames = await page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            let n = 0;
            const gaps: number[] = [];
            let last = performance.now();
            const t0 = last;
            const f = () => {
              const now = performance.now();
              gaps.push(Math.round(now - last));
              last = now;
              n++;
              if (now - t0 < 2000) requestAnimationFrame(f);
              else resolve(`frames=${n} maxGap=${Math.max(...gaps)}`);
            };
            requestAnimationFrame(f);
            setTimeout(() => resolve(`TIMEOUT frames=${n} gaps=${gaps.slice(0, 5)}`), 8000);
          }),
      );
      let click = "ok";
      try {
        await page
          .getByRole("button", { name: "Decline", exact: true })
          .first()
          .click({ trial: true, timeout: 6000 });
      } catch (e) {
        click = String(e).split("\n").slice(0, 4).join(" | ");
      }
      const anims = await page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === "running").length,
      );
      console.log(`DIAG ${route} ${name}: ${frames} runningAnims=${anims} click=${click}`);
    });
  }
}
