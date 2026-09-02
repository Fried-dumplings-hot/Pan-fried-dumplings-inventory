import { chromium } from "playwright";

const stamp = Date.now();
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
await page.goto(`https://dumplinginv-2vomzamo.manus.space/?驗證=清除登入&報表回歸=${stamp}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByPlaceholder("例如：F001001").fill("F999001");
await page.getByRole("button", { name: "進入系統" }).click();
await page.locator("header").getByText("顏嘉輝", { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
await page.locator('button:visible').filter({ hasText: "查詢報表" }).first().click();
await page.locator("h2").filter({ hasText: "查詢報表" }).waitFor({ state: "visible", timeout: 20_000 });
await page.waitForTimeout(4_000);
const before = await page.locator("body").innerText();
const dailySummaryVisible = await page.getByRole("button", { name: "查看明細" }).first().isVisible().catch(() => false);
const downloadVisible = await page.getByRole("button", { name: "下載報表" }).isVisible();
const expandButton = page.getByRole("button", { name: "查看明細" }).first();
let detailExpanded = false;
if (await expandButton.count()) {
  await expandButton.click();
  await page.getByText("收合明細", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  detailExpanded = true;
}
let downloadCreated = false;
if (downloadVisible) {
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.getByRole("button", { name: "下載報表" }).click();
  const download = await downloadPromise;
  downloadCreated = Boolean(await download.path());
}
await page.screenshot({ path: "verification/public-report-mobile.png", fullPage: true });
console.log(JSON.stringify({ dailySummaryVisible, downloadVisible, detailExpanded, downloadCreated, hasRecords: !before.includes("目前尚無符合條件的紀錄") }));
if (!dailySummaryVisible || !downloadVisible || !detailExpanded || !downloadCreated) process.exitCode = 1;
await browser.close();
