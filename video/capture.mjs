// Captures product screenshots for the demo video from the local production server.
// Usage: MANAGER_EMAIL=... MANAGER_PASS=... node capture.mjs   (demo employee creds come from demo-ids.json)
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const OUT = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const demo = JSON.parse(readFileSync(new URL("./demo-ids.json", import.meta.url), "utf8"));
const EMPLOYEE = { email: "priya.nair@example.com", password: demo.password };
const MANAGER = { email: process.env.MANAGER_EMAIL, password: process.env.MANAGER_PASS };
if (!MANAGER.email || !MANAGER.password) throw new Error("Set MANAGER_EMAIL and MANAGER_PASS");

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });

async function login(page, { email, password }) {
  await page.goto(`${BASE}/auth/signout`, { waitUntil: "networkidle" }).catch(() => {});
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

async function shot(page, path, name, opts = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${name}.png`, ...opts });
  console.log("✓", name);
}

// ---------------------------------------------------------------- desktop
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
const d = await desktop.newPage();

await login(d, EMPLOYEE);
await shot(d, "/today", "desk-today");
await shot(d, "/today", "desk-today-full", { fullPage: true });

// Quick-update close-up: fill the first card's form (do not post).
{
  await d.goto(`${BASE}/today`, { waitUntil: "networkidle" });
  const card = d.locator(".card", { has: d.locator("textarea"), hasText: "Sales Performance Dashboard" }).first();
  await card.locator("textarea").fill("Fixed the YoY calc for July and added counsellor drill-down. Preview shared with Sales head for sign-off.");
  await card.getByRole("button", { name: /^Next:/ }).click();
  await card.locator('input[placeholder="hrs"]').fill("4.5");
  await card.getByRole("button", { name: "Deadline" }).click();
  const shifted = new Date(Date.parse("2026-10-13") + (demo.delta_days ?? 0) * 86400000).toISOString().slice(0, 10);
  await card.locator('input[type="date"]').fill(shifted);
  await card.locator('input[placeholder^="e.g."]').fill("Sales head added a feedback round on Monday");
  await d.waitForTimeout(200);
  await card.screenshot({ path: `${OUT}desk-quick-update.png` });
  console.log("✓ desk-quick-update");
}

await shot(d, `/tasks/${demo.tasks.priya_attendance}`, "desk-ticket");
await shot(d, `/tasks/${demo.tasks.priya_attendance}`, "desk-ticket-full", { fullPage: true });

await login(d, MANAGER);
await shot(d, "/tasks", "desk-tasks");
await shot(d, "/calendar", "desk-calendar-month");
await shot(d, "/calendar?view=timeline", "desk-calendar-timeline");
await shot(d, "/team", "desk-team");
await shot(d, "/team", "desk-team-full", { fullPage: true });
await shot(d, "/history", "desk-history");
await shot(d, "/settings", "desk-settings");
await shot(d, "/settings/team", "desk-settings-team");
await desktop.close();

// ---------------------------------------------------------------- phone
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
});
const m = await phone.newPage();
await login(m, EMPLOYEE);
await shot(m, "/today", "phone-today");
await shot(m, "/calendar", "phone-calendar");
await shot(m, "/calendar?view=timeline", "phone-timeline");
await shot(m, "/tasks", "phone-tasks");
await shot(m, `/tasks/${demo.tasks.priya_sales}`, "phone-ticket");
await phone.close();

await browser.close();
