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

// 1) Members directory
await goto("/members");
await shot("01-members-directory");

// 1b) Add a new member
await page.click('button:has-text("Add member")');
await page.fill('input[placeholder="Full name"]', "Yusuf Karim");
await page.fill('input[placeholder="Email"]', "yusuf.karim@portfolio.local");
await page.fill('input[placeholder="Contact number"]', "+971-50-321-9988");
await page.fill('input[placeholder="Title (optional)"]', "Senior DevOps Engineer");
await page.locator('form button:has-text("Add")').click();
await page.waitForTimeout(400);
await shot("02-members-after-add");

// 2) Core Banking detail showing seeded members, sub-projects, tasks
await goto("/projects/PRJ-001");
await shot("03-project-detail-overview");

// 2b) Add a member to the project
await page.locator('h2:has-text("Project members") + button, button:has-text("+ Add member")').first().click();
await page.waitForTimeout(200);
await page.selectOption('select:has(option:has-text("Select a member"))', { index: 2 });
await page.locator('form button:has-text("Add")').first().click();
await page.waitForTimeout(400);

// 2c) Add a top-level task
await page.locator('button:has-text("+ Add task")').click();
await page.locator('input[placeholder="Task title"]').fill("Brief steerco on cutover readiness");
await page.locator('form input[type="date"]').fill("2026-06-20");
await page.locator('form button:has-text("Add task")').click();
await page.waitForTimeout(400);

// 2d) Add a sub-task under the first existing task
await page.locator('button:has-text("+ sub-task")').first().click();
await page.locator('input[placeholder="Task title"]').fill("Confirm 3rd-party gateway sign-off");
await page.locator('form button:has-text("Add task")').click();
await page.waitForTimeout(400);

// 2e) Create a sub-project
await page.locator('button:has-text("+ Create sub-project")').click();
await page.locator('input[placeholder="Sub-project name"]').fill("Data Migration Reconciliation");
await page.locator('input[placeholder*="Short description"]').fill("Reconcile balances post-cutover.");
await page.locator('input[placeholder*="Budget"], input[type="number"]').fill("600000");
await page.locator('form button:has-text("Create")').click();
await page.waitForTimeout(500);
await shot("04-project-detail-with-additions");

// 3) Show the freshly created sub-project page (parent breadcrumb)
const subProjectLink = page.locator('a:has-text("Data Migration Reconciliation")').first();
if (await subProjectLink.count()) {
  await subProjectLink.click();
  await page.waitForLoadState("networkidle");
  await shot("05-subproject-detail");
}

// 4) Seeded sub-project page (PRJ-001-A) - shows existing parent relationship and detail
await goto("/projects/PRJ-001-A");
await shot("06-seeded-subproject");

// 5) Projects list showing sub-project indentation
await goto("/projects");
await shot("07-projects-list-hierarchy");

await browser.close();
console.log("done");
