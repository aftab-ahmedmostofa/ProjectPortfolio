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

async function setChartKind(panelTitle, ariaLabel) {
  await page
    .locator(`div:has(> div > div > h2:text-is("${panelTitle}"))`)
    .first()
    .locator(`button[aria-label="${ariaLabel}"]`)
    .click();
  await page.waitForTimeout(400);
}

// 1) Main dashboard default — chart selectors visible in each panel header
await goto("/");
await shot("01-dashboard-default");

// 2) Switch main dashboard charts to alternative kinds
await setChartKind("Budget vs Actual vs AI Forecast", "Line");
await setChartKind("Status Distribution", "Treemap");
await setChartKind("Country Risk", "Horizontal bar");
await setChartKind("Avg Risk by Business Unit", "Donut");
await setChartKind("Delivery Pipeline", "Area");
await shot("02-dashboard-alt-kinds");

// 3) PM Summary with the new accurate world map (default kinds)
await goto("/pm-summary");
await shot("03-pm-summary-with-real-map");

await browser.close();
console.log("done");
