// Logs in as the manager, downloads the monthly export, and verifies a non-manager is refused.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const OUT = fileURLToPath(new URL("./work/", import.meta.url));
const demo = JSON.parse(readFileSync(new URL("./demo-ids.json", import.meta.url), "utf8"));
const month = demo.today.slice(0, 7);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function login(email, password) {
  await page.goto(`${BASE}/auth/signout`).catch(() => {});
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

// employee must be refused
await login("priya.nair@example.com", demo.password);
const refused = await page.request.get(`${BASE}/api/export?month=${month}`);
console.log("employee →", refused.status(), await refused.text());

// manager downloads
await login(process.env.MANAGER_EMAIL, process.env.MANAGER_PASS);
await page.goto(`${BASE}/team`, { waitUntil: "networkidle" });
await page.locator("button[title='How to get insights with AI']").click();
await page.screenshot({ path: `${OUT}export-ui.png` });
const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export Excel" }).click()]);
await download.saveAs(`${OUT}${download.suggestedFilename()}`);
console.log("manager → downloaded", download.suggestedFilename());
const bad = await page.request.get(`${BASE}/api/export?month=2026-13`);
console.log("bad month →", bad.status(), await bad.text());
await browser.close();
