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

async function send(text) {
  const input = page.locator('input[placeholder*="Ask, search, create"]').first();
  await input.fill(text);
  await page.locator('form button:has-text("Send")').first().click();
  await page.waitForTimeout(800);
}

// 1) Dashboard with the floating chat bubble visible
await goto("/");
await shot("01-floating-bubble");

// 2) Open the bubble — small chat panel
await page.click('button[aria-label="Open AI assistant"]');
await page.waitForTimeout(400);
await shot("02-floating-chat-open");

// 3) Use the bubble: ask about Enterprise Data Lakehouse
await page.locator('input[placeholder*="Ask, search, create"]').first().fill("Tell me about Enterprise Data Lakehouse");
await page.locator('form button:has-text("Send")').first().click();
await page.waitForTimeout(800);
await shot("03-floating-chat-project-card");

// Close floating, switch to the full assistant page
await page.locator('button[aria-label="Close"]').first().click();
await goto("/assistant");
await shot("04-assistant-page");

// 4) Inquiry intent
await send("Tell me about AIOps Observability Platform");
await shot("05-assistant-inquiry");

// 5) Search / filter intent
await send("Show high risk projects in UAE");
await shot("06-assistant-filter");

// 6) Create project
await send("Create project Mobile Banking Modernization with budget 2.5M");
await shot("07-assistant-create-project");

// 7) Create sub-project
await send("Create sub-project Card Issuance under Mobile Banking Modernization");
await shot("08-assistant-create-subproject");

// 8) Create task and sub-task
await send("Create task Document new API in Core Banking due 2026-07-15");
await page.waitForTimeout(400);
await send("Add sub-task Confirm gateway sign-off to Document new API");
await shot("09-assistant-tasks");

// 9) Add member to directory
await send("Add member Yusuf Karim email yusuf.karim@portfolio.local phone +971-50-321-9988 as Senior DevOps Engineer");
await shot("10-assistant-add-member");

// 10) Send email
await send("Email Hind about Zero-Trust Security Program rollout progress");
await shot("11-assistant-email");

// 11) Click "Open /notifications →" in the email reply — client-side nav
// preserves in-memory state (the bot-sent email and project-created notifs).
await page.locator('a:has-text("Open /notifications")').last().click();
await page.waitForLoadState("networkidle");
await shot("12-inbox-after-bot");

// 12) Navigate back to Projects via the sidebar (client-side) to see the
// newly-created Mobile Banking project and Card Issuance sub-project.
await page.locator('aside a:has-text("Projects")').click();
await page.waitForLoadState("networkidle");
await shot("13-projects-after-bot-actions");

await browser.close();
console.log("done");
