import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
let intercepted = false;

await page.route("**/api/trpc/inventory.loadSnapshot**", async route => {
  const response = await route.fetch();
  const body = await response.json();
  const historicalPermissions = [
    { 模組: "進貨", 新增: true, 修改: false, 刪除: false },
    { 模組: "退貨", 新增: true, 修改: false, 刪除: false },
    { 模組: "報廢", 新增: true, 修改: false, 刪除: false },
  ];
  const patch = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) value.forEach(patch);
    else {
      if (value.員工 && Array.isArray(value.員工)) {
        value.員工 = value.員工.map(item => item.工號 === "F001001" ? { ...item, 姓名: "瑞豐夜市", 角色: "一般員工", 啟用: true } : item);
      }
      if (Array.isArray(value.權限)) {
        value.權限 = historicalPermissions;
        intercepted = true;
      }
      Object.values(value).forEach(patch);
    }
  };
  patch(body);
  await route.fulfill({ response, body: JSON.stringify(body) });
});

await page.goto(`https://dumplinginv-2vomzamo.manus.space/?驗證=清除登入&歷史權限=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByPlaceholder("例如：F001001").fill("F001001");
await page.getByRole("button", { name: "進入系統" }).click();
await page.locator("header").getByText("瑞豐夜市", { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
await page.waitForTimeout(4_000);

const results = {};
for (const [module, createLabel] of [["進貨單", "新增進貨單"], ["退貨單", "新增退貨單"], ["報廢單", "新增報廢單"]]) {
  await page.locator("button:visible").filter({ hasText: module }).first().click();
  await page.locator("h2").filter({ hasText: module }).waitFor({ state: "visible", timeout: 10_000 });
  results[module] = await page.getByRole("button", { name: createLabel }).isVisible().catch(() => false);
}
console.log(JSON.stringify({ intercepted, employeeNameVisible: true, ...results }));
if (!intercepted || !results.進貨單 || !results.退貨單 || !results.報廢單) process.exitCode = 1;
await browser.close();
