import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1200 },
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

// 1) Default state
await goto("/pm-summary");
await shot("01-pm-summary-default");

// 2) Cross-filter: click "Delayed" in PROJECT STATUS lollipop
await page.locator('div:has-text("PROJECT STATUS") li:has-text("Delayed")').first().click();
await page.waitForTimeout(500);
await shot("02-pm-summary-status-delayed");

// 3) Add a Digital business-unit selection on top of the status filter
await page.locator('div:has-text("PROJECT TYPE") li:has-text("Digital")').first().click();
await page.waitForTimeout(400);
await shot("03-pm-summary-status-and-bu");

// 4) Reset, then click Health donut → On Track
await page.getByRole('button', { name: 'Reset filters' }).first().click();
await page.waitForTimeout(400);
await page.locator('div:has-text("OVERALL PROJECT HEALTH") li:has-text("On Track")').first().click();
await page.waitForTimeout(400);
await shot("04-pm-summary-health-ontrack");

// 5) Reset, then click a Priority lollipop
await page.getByRole('button', { name: 'Reset filters' }).first().click();
await page.waitForTimeout(400);
await page.locator('div:has-text("PRIORITY") button:has-text("High")').first().click();
await page.waitForTimeout(400);
await shot("05-pm-summary-priority-high");

await browser.close();
console.log("done");
