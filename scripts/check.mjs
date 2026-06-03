import { chromium, webkit } from "playwright";

for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await type.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!t.includes("defaultProps will be removed")) errors.push(`console.error: ${t.slice(0, 200)}`);
    }
  });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/shots/dash-${name}.png`, fullPage: true });

  const probe = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("h2")).slice(0, 5);
    return cards.map((h) => {
      const card = h.closest(".card");
      const inner = card?.querySelector(".mt-3");
      const svgs = inner?.querySelectorAll("svg") ?? [];
      const responsiveContainer = inner?.querySelector(".recharts-responsive-container");
      return {
        title: h.textContent,
        cardHeight: Math.round(card?.getBoundingClientRect().height ?? 0),
        innerHeight: Math.round(inner?.getBoundingClientRect().height ?? 0),
        innerWidth: Math.round(inner?.getBoundingClientRect().width ?? 0),
        svgCount: svgs.length,
        respHeight: responsiveContainer ? Math.round(responsiveContainer.getBoundingClientRect().height) : null,
        respWidth: responsiveContainer ? Math.round(responsiveContainer.getBoundingClientRect().width) : null,
      };
    });
  });

  console.log(`\n=== ${name} ===`);
  console.log("errors:", errors.length ? errors : "none");
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
}
