import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const pages = [
  { path: "/", name: "01-dashboard" },
  { path: "/projects", name: "02-projects" },
  { path: "/projects/PRJ-001", name: "03-project-detail" },
  { path: "/approvals", name: "04-approvals" },
  { path: "/ai-insights", name: "05-ai-insights" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const p of pages) {
  await page.goto(BASE + p.path, { waitUntil: "networkidle" });
  // give Recharts / client effects a moment to paint
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: true });
  console.log("captured", p.name);
}

await browser.close();
console.log("done");
