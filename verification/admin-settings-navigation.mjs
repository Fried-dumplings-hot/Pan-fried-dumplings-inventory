import { chromium } from "playwright";

const baseUrl = process.env.REGRESSION_URL || "https://3000-iq47pot37qf8yodtm44b5-b5d39a2e.sg1.manus.computer";
const cases = [
  { name: "桌面", viewport: { width: 1280, height: 800 } },
  { name: "手機", viewport: { width: 390, height: 844 } },
];
const targets = [
  { button: "食包材品項設定", path: "/admin/items", heading: "食包材品項設定" },
  { button: "員工與權限", path: "/admin/employees", heading: "員工與權限" },
  { button: "多品項預設表單設定", path: "/admin/templates", heading: "多品項預設表單設定" },
];
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/?驗證=清除登入&後台導覽回歸=${Date.now()}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.locator("#員工工號").fill("F999001");
    await page.getByRole("button", { name: "進入系統" }).click();
    await page.locator("header").getByText("管理員", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('button:visible').filter({ hasText: "後台管理" }).first().click();
    for (const target of targets) {
      if (!(await page.getByRole("link", { name: new RegExp(target.button) }).count())) throw new Error(`${testCase.name} 未顯示${target.button}按鈕`);
      if ((await page.locator("body").innerText()).includes("新增品項") || (await page.locator("body").innerText()).includes("員工門市與角色") || (await page.locator("body").innerText()).includes("進貨預設表單")) throw new Error(`${testCase.name} 後台仍顯示舊設定內容區塊`);
      await page.getByRole("link", { name: new RegExp(target.button) }).click();
      await page.locator("h1").getByText(target.heading, { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
      if (!page.url().includes(target.path)) throw new Error(`${testCase.name} ${target.button} 未導向 ${target.path}`);
      await page.getByRole("link", { name: "返回後台管理" }).click();
      await page.locator("h1").getByText("後台管理", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
      if (!page.url().includes("/admin/settings")) throw new Error(`${testCase.name} ${target.button} 缺少返回後台管理入口`);
      await page.locator("a").filter({ hasText: target.button }).first().waitFor({ state: "visible", timeout: 10_000 });
    }
    console.log(JSON.stringify({ name: testCase.name, buttons: targets.length, independentPages: true }));
    await context.close();
  }
} finally {
  await browser.close();
}
