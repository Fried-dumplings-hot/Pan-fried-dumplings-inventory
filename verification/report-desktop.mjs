import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
const page = await context.newPage();
await page.goto(`https://dumplinginv-2vomzamo.manus.space/?驗證=清除登入&桌面報表=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByPlaceholder("例如：F001001").fill("F999001");
await page.getByRole("button", { name: "進入系統" }).click();
await page.locator("header").getByText("顏嘉輝", { exact: false }).waitFor({ state: "visible", timeout: 30000 });
await page.locator('button:visible').filter({ hasText: "查詢報表" }).first().click();
await page.locator("h2").filter({ hasText: "查詢報表" }).waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(4000);
const body = await page.locator("body").innerText();
const expandButton = page.getByRole("button", { name: "查看明細" }).first();
const dailySummaryVisible = await expandButton.isVisible().catch(() => false);
let detailExpanded = false;
let detailRows = 0;
if (dailySummaryVisible) {
  await expandButton.click();
  await page.getByText("收合明細", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  detailRows = await page.locator("tbody tr").count();
  detailExpanded = detailRows > 0;
}
const downloadButton = page.getByRole("button", { name: "下載報表" });
const downloadVisible = await downloadButton.isVisible();
let downloadCreated = false;
if (downloadVisible) {
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await downloadButton.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  downloadCreated = Boolean(downloadPath);
}
const result = { dailySummaryVisible, detailExpanded, detailRows, downloadVisible, downloadCreated, desktopWidth: true };
await page.screenshot({ path: "verification/public-report-desktop.png", fullPage: true });
console.log(JSON.stringify(result));
if (!result.dailySummaryVisible || !result.detailExpanded || !result.downloadVisible || !result.downloadCreated) process.exitCode = 1;
await browser.close();
