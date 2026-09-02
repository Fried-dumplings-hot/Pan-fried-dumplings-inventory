import { chromium } from "playwright";

const cacheBust = Date.now();
const url = `https://dumplinginv-2vomzamo.manus.space/?驗證=清除登入&回歸=${cacheBust}`;
const appUrl = `https://dumplinginv-2vomzamo.manus.space/?回歸=${cacheBust}`;
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-gpu"] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
let latestLoadedAuditActions = [];
page.on("response", async response => { if (response.url().includes("inventory.loadSnapshot")) { try { const body = await response.json(); const snapshot = body?.[0]?.result?.data?.json ?? body?.result?.data?.json; if (snapshot?.操作稽核) latestLoadedAuditActions = snapshot.操作稽核.map((item) => item.動作); } catch {} } });
page.on("request", request => { if (request.url().includes("inventory.saveSnapshot")) { const raw = request.postData(); try { const parsed = JSON.parse(raw || "{}"); const payload = parsed?.["0"]?.json?.payload ?? parsed?.json?.[0]?.json?.payload; console.log("SAVE_REQUEST_SUMMARY", JSON.stringify({ 版本: payload?.版本, 品項數: payload?.品項?.length, 稽核動作: payload?.操作稽核?.slice(0, 4)?.map((item) => item.動作) })); } catch { console.log("SAVE_REQUEST", raw?.slice(0, 500)); } } });
page.on("response", async response => { if (response.url().includes("inventory.saveSnapshot")) { try { console.log("SAVE_RESPONSE", response.status(), (await response.text()).slice(0, 300)); } catch { console.log("SAVE_RESPONSE", response.status(), "回應已因導覽離開而不可讀"); } } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.screenshot({ path: "verification/public-login-mobile.png", fullPage: true });
await page.getByPlaceholder("例如：F001001").fill("F999001");
await page.getByRole("button", { name: "進入系統" }).click();
await page.locator("header").getByText("顏嘉輝", { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
await page.screenshot({ path: "verification/public-admin-mobile.png", fullPage: true });
await page.locator('button:visible').filter({ hasText: "後台管理" }).first().click();
await page.getByText("批次匯入", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
await page.screenshot({ path: "verification/public-admin-items-mobile.png", fullPage: true });

while (await page.locator("p:visible").filter({ hasText: "回歸驗證品項" }).count()) {
  const oldRow = page.locator("p:visible").filter({ hasText: "回歸驗證品項" }).first().locator("..").locator("..");
  await oldRow.getByRole("button", { name: "刪除" }).click();
  await page.waitForTimeout(250);
}
const testItem = `回歸驗證品項${Date.now()}`;
await page.getByRole("button", { name: "新增品項" }).click();
const dialog = page.getByRole("dialog");
const inputs = dialog.locator("input");
await inputs.nth(0).fill(testItem);
await inputs.nth(1).fill("10");
await inputs.nth(2).fill("箱");
await inputs.nth(3).fill("包");
await inputs.nth(4).fill("20");
await inputs.nth(5).fill("0");
await inputs.nth(6).fill("1");
console.log("FORM_VALUES", await inputs.evaluateAll(nodes => nodes.map(node => node instanceof HTMLInputElement ? node.value : "")));
console.log("DIALOG_TEXT", await dialog.innerText());
await dialog.getByRole("button", { name: "儲存品項" }).click();
await page.waitForTimeout(3_000);
await page.screenshot({ path: "verification/public-after-add-mobile.png", fullPage: true });
const afterAddText = await page.locator("body").innerText();
console.log("AFTER_ADD_HAS_ITEM", afterAddText.includes(testItem));
console.log("AFTER_ADD_HAS_SUCCESS", afterAddText.includes("品項已新增"));
console.log("AFTER_ADD_CONTEXT", afterAddText.slice(0, 1200));
console.log("AFTER_ADD_STORAGE", await page.evaluate(() => localStorage.getItem("食包材品項")));
await page.locator("p:visible").filter({ hasText: testItem }).first().waitFor({ state: "visible", timeout: 10_000 });
await page.locator('button:visible').filter({ hasText: "總覽" }).first().click();
await page.getByText("低庫存警示", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
const overviewTextBeforeDelete = await page.locator("body").innerText();
if (!overviewTextBeforeDelete.includes(testItem) || !overviewTextBeforeDelete.includes("低庫存警示")) throw new Error("低庫存警示或測試品項未在總覽顯示");
await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
const afterAddReloadText = await page.locator("body").innerText();
if (!afterAddReloadText.includes(testItem)) throw new Error("新增品項重新載入後未保留");
await page.locator('button:visible').filter({ hasText: "後台管理" }).first().click();

const itemRow = page.locator("p:visible").filter({ hasText: testItem }).first().locator(".." ).locator("..");
await itemRow.getByRole("button", { name: "修改" }).click();
const editDialog = page.getByRole("dialog");
await editDialog.locator("input").nth(1).fill("12");
await editDialog.getByRole("button", { name: "儲存品項" }).click();
await page.waitForTimeout(3_000);
await page.locator("p:visible").filter({ hasText: testItem }).first().waitFor({ state: "visible", timeout: 10_000 });
await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('button:visible').filter({ hasText: "後台管理" }).first().click();
await page.locator("p:visible").filter({ hasText: testItem }).first().waitFor({ state: "visible", timeout: 10_000 });
const afterEditReloadText = await page.locator("body").innerText();
if (!afterEditReloadText.includes(testItem) || !afterEditReloadText.includes("$12")) throw new Error("修改結果重新載入後未保留");

const updatedRow = page.locator("p:visible").filter({ hasText: testItem }).first().locator(".." ).locator("..");
await updatedRow.getByRole("button", { name: "刪除" }).click();
await expectGone(page, testItem);
await page.waitForTimeout(1_000);
await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: "查詢報表" }).click();
await page.getByText("完整操作稽核紀錄", { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
const auditText = await page.locator("body").innerText();
const auditActions = new Set([...latestLoadedAuditActions, ...["新增品項", "修改品項", "刪除品項"].filter(action => auditText.includes(action))]);
if (!["新增品項", "修改品項", "刪除品項"].every(action => auditActions.has(action))) throw new Error(`品項三種操作的稽核紀錄未完整保留：${JSON.stringify({ loaded: latestLoadedAuditActions, text: auditText.includes("新增品項") })}`);
await page.screenshot({ path: "verification/public-audit-mobile.png", fullPage: true });
await page.locator('button:visible').filter({ hasText: "總覽" }).first().click();
const overviewText = await page.locator("body").innerText();
const lowStockVisible = overviewTextBeforeDelete.includes("低庫存警示");
const testItemRemoved = !overviewText.includes(testItem);
await page.locator('button:visible').filter({ hasText: "登出" }).first().click();
await page.getByPlaceholder("例如：F001001").waitFor({ state: "visible", timeout: 10_000 });
console.log(JSON.stringify({ employeeNameVisible: auditText.includes("顏嘉輝"), batchImportVisible: true, auditPreserved: true, lowStockVisible, testItemRemoved, logoutVisible: true }));
await browser.close();

async function expectGone(currentPage, text) {
  await currentPage.waitForFunction((value) => !document.body.innerText.includes(value), text, { timeout: 10_000 });
}
