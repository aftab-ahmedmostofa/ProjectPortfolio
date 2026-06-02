import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
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

// 1) Portfolio risk dashboard
await goto("/risks");
await shot("01-portfolio-risks");

// 2) Project-level risk register (Core Banking)
await goto("/projects/PRJ-001/risks");
await shot("02-project-risks");

// 3) Open the Add risk form
await page.click('button:has-text("+ Add risk")');
await page.waitForTimeout(300);
const form = page.locator('form:has-text("Mitigation plan")');
await form.locator('input[placeholder="Concise risk statement"]').fill("Production cutover regression in payment authorisations");
await form.locator('textarea[placeholder*="What could happen"]').fill("Risk that the new payments microservice rejects a subset of legitimate authorisations during the production cutover, causing customer-facing failures.");
await form.locator('label:has-text("Category") select').selectOption("Technical");
await form.locator('label:has-text("Probability") select').selectOption("4");
await form.locator('label:has-text("Impact") select').selectOption("5");
await form.locator('textarea[placeholder*="reduced or handled"]').fill("Dual-running the new service alongside legacy for 72h post-cutover with auto-rollback if authorisation success rate drops below 99.5%.");
await form.locator('label:has-text("Owner") select').selectOption("M-001");
await form.locator('label:has-text("Due date") input').fill("2026-06-30");
await shot("03-add-risk-form");

await form.locator('button:has-text("Add risk")').click();
await page.waitForTimeout(500);
await shot("04-after-add");

// 4) Open the detail drawer for the newly-created risk
await page.locator('table tbody tr', { hasText: "Production cutover regression" }).first().click();
await page.waitForTimeout(500);
await shot("05-risk-drawer");

// 5) Inside the drawer: change status, post a comment, edit mitigation progress
const drawerStatus = page.locator('aside section').filter({ hasText: "Status" }).first().locator('select').first();
await drawerStatus.selectOption("In Progress");
await page.waitForTimeout(300);

// Set mitigation progress via React-aware value setter
await page.evaluate(() => {
  const sliders = document.querySelectorAll('aside input[type="range"]');
  const slider = sliders[sliders.length - 1];
  if (!slider) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(slider, "60");
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  slider.dispatchEvent(new Event("mouseup", { bubbles: true }));
});
await page.waitForTimeout(300);

await page.locator('aside textarea[placeholder*="Note progress"]').fill("Dual-run lab tests completed; production rehearsal scheduled for 25 Jun.");
await page.locator('aside button:has-text("Post")').click();
await page.waitForTimeout(400);
await shot("06-risk-drawer-after-actions");

// 6) Close drawer via the X button (preserves React state via client-side nav)
await page.locator('aside header button[aria-label="Close"]').click();
await page.waitForTimeout(200);

// 7) Click another seeded risk to demonstrate its drawer
await page.locator('table tbody tr', { hasText: "Data migration integrity" }).first().click();
await page.waitForTimeout(500);
await shot("07-seeded-risk-detail");

// 8) Close drawer, then open inbox via bell → Inbox link (client-side).
// This preserves the assignment notification fired on risk creation.
await page.locator('aside header button[aria-label="Close"]').click();
await page.waitForTimeout(200);
await page.locator('header [aria-label="Notifications"]').click();
await page.waitForTimeout(300);
await page.locator('a:has-text("Inbox")').click();
await page.waitForLoadState("networkidle");
await shot("08-risk-assignment-email");

// 9) Project detail summary panel now shows top open risks linking to register
// Use sidebar nav (client-side); Projects link, then click Core Banking row
await page.locator('aside nav a:has-text("Projects")').click();
await page.waitForLoadState("networkidle");
await page.locator('a:has-text("Core Banking Modernization")').first().click();
await page.waitForLoadState("networkidle");
await page.evaluate(() => window.scrollTo(0, 1200));
await shot("09-project-detail-risk-summary");

await browser.close();
console.log("done");
