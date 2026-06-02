import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function shot(name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

// Dashboard, default
await goto("/");
await shot("01-dashboard");

// Open the Country multi-select, tick UAE + Saudi Arabia + UK; screenshot the open menu
await page.click('button:has-text("Country")');
await page.waitForTimeout(300);
await page.click('label:has-text("UAE") input');
await page.click('label:has-text("Saudi Arabia") input');
await page.click('label:has-text("UK") input');
await page.waitForTimeout(300);
await shot("02-multiselect-open");
// Close popover by clicking outside
await page.mouse.click(900, 100);
await shot("03-dashboard-multi-country");

// Reset filters and visit timeline
await page.click('button:has-text("Reset filters")');
await goto("/timeline");
await shot("04-timeline");

// Per-project timeline with alerts (PRJ-002 = Enterprise Data Lakehouse, delayed)
await goto("/projects/PRJ-002");
await shot("05-project-detail-timeline");

// Alerts page
await goto("/alerts");
await shot("06-alerts");

// Watchlist: star a couple of projects via the projects table, then visit /watchlist
await goto("/projects");
await page.locator('table tbody tr button[aria-label*="watchlist"]').nth(0).click();
await page.locator('table tbody tr button[aria-label*="watchlist"]').nth(1).click();
await page.locator('table tbody tr button[aria-label*="watchlist"]').nth(4).click();
await page.waitForTimeout(200);
await goto("/watchlist");
await shot("07-watchlist");

// Approvals: act on one pending approval as Admin → triggers notifications
await goto("/approvals");
const goButton = page.locator('button:has-text("Go")').first();
if (await goButton.count() > 0) {
  await page.locator('input[placeholder*="Comment"]').first().fill("Approved — aligned to FY plan.");
  await goButton.click();
  await page.waitForTimeout(500);
}
await shot("08-approvals-acted");

// Open the notifications bell
await page.locator('button[aria-label="Notifications"]').click();
await page.waitForTimeout(400);
await shot("09-notifications-bell");

// Click the bell's "Inbox →" link — client-side nav preserves the in-memory
// notifications state (page.goto would hard-reload and wipe it).
await page.locator('a:has-text("Inbox")').click();
await page.waitForLoadState("networkidle");
await shot("10-notifications-inbox");

await browser.close();
console.log("done");
