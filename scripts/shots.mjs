import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1300 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function shot(name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

// Click a chart-type selector button inside a named panel.
async function setChartKind(panelTitle, ariaLabel) {
  await page
    .locator(`div:has(> div > h2:text("${panelTitle}"))`)
    .first()
    .locator(`button[aria-label="${ariaLabel}"]`)
    .click();
  await page.waitForTimeout(400);
}

await goto("/pm-summary");
await shot("01-default");

// Swap to BAR for PROJECT TYPE & PROJECT STATUS, GROUPED BARS for TREND
await setChartKind("PROJECT TYPE", "Horizontal bar");
await setChartKind("PROJECT STATUS", "Horizontal bar");
await setChartKind("BUDGET & EXPENSE TREND", "Grouped bars");
await shot("02-bars");

// Swap to DONUT / TREEMAP / PIE variants
await setChartKind("PROJECT TYPE", "Donut");
await setChartKind("PROJECT STATUS", "Treemap");
await setChartKind("PRIORITY", "Pie");
await setChartKind("OVERALL PROJECT HEALTH", "Pie");
await shot("03-donut-treemap-pie");

// Swap scatter → grouped bars, ranking → lollipop, managers → treemap
await setChartKind("BUDGET VS. EXPENSES", "Grouped bars");
await setChartKind("BUDGET UTILISATION", "Lollipop");
await setChartKind("PROJECT MANAGERS", "Treemap");
await setChartKind("BUDGET & EXPENSE TREND", "Line");
await shot("04-line-and-others");

// Reset back to defaults visually by reloading (state lives in localStorage so
// changes persist; explicitly re-set originals for the final shot)
await setChartKind("PROJECT TYPE", "Lollipop");
await setChartKind("PROJECT STATUS", "Lollipop");
await setChartKind("PROJECT MANAGERS", "Lollipop");
await setChartKind("PRIORITY", "Vertical lollipop");
await setChartKind("OVERALL PROJECT HEALTH", "Donut");
await setChartKind("BUDGET & EXPENSE TREND", "Area");
await setChartKind("BUDGET VS. EXPENSES", "Scatter");
await setChartKind("BUDGET UTILISATION", "Horizontal bar");
await shot("05-restored");

await browser.close();
console.log("done");
