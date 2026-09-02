import { chromium } from "playwright";

const url = `https://dumplinginv-2vomzamo.manus.space/?清除狀態回歸=${Date.now()}`;
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
const loginInput = page.getByLabel("員工工號");
await loginInput.fill("F999001");
await page.getByRole("button", { name: "進入系統" }).click();
await page.getByText("顏嘉輝", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
const homeText = await page.locator("body").innerText();
if (!homeText.includes("庫存總覽")) throw new Error("登入後未進入庫存總覽");
const inventoryEmpty = homeText.includes("目前尚無品項可供排行") && !homeText.includes("最近作業\n") || homeText.includes("目前尚無品項可供排行");
await page.getByRole("button", { name: "查詢報表" }).click();
await page.getByText("完整操作稽核紀錄", { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
const reportText = await page.locator("body").innerText();
const result = {
  employeeNameVisible: homeText.includes("顏嘉輝"),
  inventoryOverviewEmpty: inventoryEmpty,
  reportEmptyMessage: reportText.includes("目前尚無符合條件的紀錄"),
  employeeStoreDataVisible: homeText.includes("門市") || reportText.includes("門市"),
  auditSectionVisible: reportText.includes("完整操作稽核紀錄"),
};
console.log(JSON.stringify(result));
if (!result.employeeNameVisible || !result.inventoryOverviewEmpty || !result.reportEmptyMessage || !result.auditSectionVisible) throw new Error(`登入後清除狀態驗證失敗：${JSON.stringify(result)}`);
await browser.close();
