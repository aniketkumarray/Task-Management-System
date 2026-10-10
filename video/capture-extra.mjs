// Extra shot: Configuration with the first task type expanded (editable TAT + stages visible).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const OUT = fileURLToPath(new URL("./shots/", import.meta.url));
const MANAGER = { email: process.env.MANAGER_EMAIL, password: process.env.MANAGER_PASS };

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email").fill(MANAGER.email);
await page.getByLabel("Password").fill(MANAGER.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"));
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.locator(".card button").first().click();
await page.waitForTimeout(400);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${OUT}desk-settings-expanded.png` });
console.log("✓ desk-settings-expanded");
await browser.close();
