import { chromium } from "playwright";

const baseUrl = process.env.REGRESSION_URL || "https://3000-iq47pot37qf8yodtm44b5-b5d39a2e.sg1.manus.computer";
const cases = [
  { name: "桌面管理員", employee: "F999001", viewport: { width: 1280, height: 800 }, roleText: "管理員" },
  { name: "手機管理員", employee: "F999001", viewport: { width: 390, height: 844 }, roleText: "管理員" },
  { name: "手機一般員工", employee: "F001001", viewport: { width: 390, height: 844 }, roleText: "一般員工" },
];

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/?驗證=清除登入&多門市回歸=${Date.now()}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.locator("#員工工號").fill(testCase.employee);
    await page.getByRole("button", { name: "進入系統" }).click();
    await page.locator("header").getByText(testCase.roleText, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await page.getByRole("button", { name: "查詢報表" }).click();
    await page.getByText("查詢門市", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const reportText = await page.locator("body").innerText();
    if (testCase.roleText === "管理員") {
      if (!reportText.includes("管理員可複選門市")) throw new Error(`${testCase.name} 未顯示管理員多選門市說明`);
      if (!(await page.getByRole("button", { name: "全選" }).count())) throw new Error(`${testCase.name} 未顯示全選控制`);
      if (!(await page.getByRole("button", { name: "清除" }).count())) throw new Error(`${testCase.name} 未顯示清除控制`);
      await page.getByRole("button", { name: "清除" }).click();
    } else if (!reportText.includes("一般員工僅能查詢已分派的門市")) {
      throw new Error(`${testCase.name} 未顯示固定門市限制說明`);
    }
    await page.locator('button:visible').filter({ hasText: "每日盤點" }).first().click();
    await page.locator("h1").getByText("每日盤點", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    console.log(JSON.stringify({ name: testCase.name, viewport: testCase.viewport, role: testCase.roleText, reportStoreFilter: true, stocktakePage: true }));
    await context.close();
  }
} finally {
  await browser.close();
}
