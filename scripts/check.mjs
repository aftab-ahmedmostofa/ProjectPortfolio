import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") {
    const t = msg.text();
    if (!t.includes("defaultProps will be removed")) errors.push(`console.error: ${t}`);
  }
});

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.localStorage.setItem(
    "pm.chartKinds.v1",
    JSON.stringify({
      "dash.budget": "scatter",
      "dash.status": "lollipop",
      "dash.country": "v-lollipop",
      "dash.riskbu": "v-bar",
      "dash.pipeline": "treemap",
    })
  );
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/shots/dash-stale-kinds.png", fullPage: true });

const cards = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("h2")).map((h) => {
    const card = h.closest(".card");
    const inner = card?.querySelector(".mt-3");
    return {
      title: h.textContent,
      cardHeight: card?.getBoundingClientRect().height,
      contentChildren: inner?.children.length ?? 0,
    };
  });
});
console.log("ERRORS:", errors.length ? errors : "none");
console.log(JSON.stringify(cards, null, 2));
await browser.close();
