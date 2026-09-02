import { chromium } from "playwright";

const baseUrl = process.env.REGRESSION_URL || "https://3000-iq47pot37qf8yodtm44b5-b5d39a2e.sg1.manus.computer";
const cases = [
  { name: "桌面", viewport: { width: 1280, height: 800 } },
  { name: "手機", viewport: { width: 390, height: 844 } },
];
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });

async function login(page, suffix) {
  await page.goto(`${baseUrl}/?驗證=門市化控制-${suffix}`, { waitUntil: "networkidle", timeout: 60_000 });
  const loginInput = page.locator("#員工工號");
  if (await loginInput.isVisible().catch(() => false)) {
    await loginInput.fill("F999001");
    await page.getByRole("button", { name: "進入系統" }).click();
  }
  await page.locator("header").getByText("管理員", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
}

try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport });
    let page = await context.newPage();
    await login(page, `${testCase.name}-總覽`);
    await page.getByRole("button", { name: "總覽" }).first().click();
    await page.getByText("目前查看門市", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    if (!(await page.getByRole("button", { name: "全選" }).count())) throw new Error(`${testCase.name} 庫存總覽缺少管理員全選門市控制`);
    if (!(await page.getByRole("button", { name: "清除" }).count())) throw new Error(`${testCase.name} 庫存總覽缺少管理員清除門市控制`);
    await page.close();

    const targets = [
      { name: "食包材品項設定", heading: "食包材品項設定", mustHave: ["新增品項", "修改", "刪除", "設定門市", "品項批次匯入／匯出", "匯出品項", "批次匯入品項"] },
      { name: "多品項預設表單設定", heading: "多品項預設表單設定", mustHave: ["勾選預設品項", "指定可使用的門市", "預設表單批次匯入／匯出", "新增進貨預設表單"] },
      { name: "員工與權限", heading: "員工與權限", mustHave: ["員工門市與角色", "刪除採停用方式"] },
    ];
    for (const target of targets) {
      page = await context.newPage();
      await login(page, `${testCase.name}-${target.name}`);
      await page.getByRole("button", { name: "後台管理" }).first().click();
      await page.locator("h2").getByText("後台管理", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
      await page.getByRole("link", { name: new RegExp(target.name) }).click();
      await page.getByRole("heading", { name: target.heading, exact: true }).waitFor({ state: "visible", timeout: 10_000 });
      const body = await page.locator("body").innerText();
      for (const label of target.mustHave) if (!body.includes(label)) throw new Error(`${testCase.name} ${target.name} 缺少「${label}」控制`);
      if (target.name === "多品項預設表單設定") {
        const templateList = page.getByText(/預設表單清單$/, { exact: false }).first();
        const templateRows = page.locator("button").filter({ hasText: "修改" });
        if (await templateRows.count() > 0) {
          if (!(await page.getByRole("button", { name: "刪除", exact: true }).count())) throw new Error(`${testCase.name} 預設表單頁有資料但缺少刪除按鈕`);
        }
        if (!templateList) { /* 保留空清單情境的新增控制驗證 */ }
      }
      if (target.name === "員工與權限") {
        const rows = page.locator("[data-testid=employee-row]");
        const rowCount = await rows.count();
        if (rowCount > 0) {
          for (let index = 0; index < rowCount; index++) {
            const row = rows.nth(index);
            if (!(await row.getByRole("button", { name: "修改", exact: true }).count())) throw new Error(`${testCase.name} 第 ${index + 1} 筆員工缺少修改按鈕`);
            if (!(await row.getByRole("button", { name: /刪除|停用/, exact: true }).count())) throw new Error(`${testCase.name} 第 ${index + 1} 筆員工缺少刪除／停用按鈕`);
            if (!(await row.getByText("儲存門市", { exact: true }).count())) throw new Error(`${testCase.name} 第 ${index + 1} 筆員工缺少門市分派控制`);
          }
        }
      }
      await page.close();
    }
    console.log(JSON.stringify({ name: testCase.name, overviewStoreControls: true, storeScopedSettings: true, employeeActions: true }));
    await context.close();
  }
} finally {
  await browser.close();
}
