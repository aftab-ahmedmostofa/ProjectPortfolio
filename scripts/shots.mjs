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

async function shot(path, name, prep) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (prep) await prep();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

await shot("/", "01-dashboard");
await shot("/", "02-dashboard-filtered", async () => {
  // Apply a Status=Delayed filter via the FilterBar to show chips + reduced count
  const statusSelect = page.locator('label:has-text("Status") select');
  await statusSelect.selectOption("Delayed");
  await page.waitForTimeout(500);
});
await shot("/projects", "03-projects");
await shot("/projects/PRJ-001", "04-project-detail");
await shot("/approvals", "05-approvals");
await shot("/ai-insights", "06-ai-insights");

await browser.close();
console.log("done");
