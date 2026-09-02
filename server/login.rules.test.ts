import { describe, expect, it } from "vitest";
import { 執行登入介面流程, 執行登入流程, 處理登入提交, 具備逾時, 取得登入錯誤訊息 } from "../shared/loginRules";

describe("登入錯誤與逾時規則", () => {
  it("會把不存在或停用工號轉成清楚的繁體中文訊息", () => {
    expect(取得登入錯誤訊息(new Error("此工號不存在"))).toBe("此工號不存在或已停用，請洽管理員。");
    expect(取得登入錯誤訊息(new Error("帳號已停用"))).toBe("此工號不存在或已停用，請洽管理員。");
  });

  it("會保留服務錯誤訊息", () => {
    expect(取得登入錯誤訊息(new Error("登入服務暫時無法使用"))).toBe("登入服務暫時無法使用");
    expect(取得登入錯誤訊息("未知錯誤")).toBe("登入服務暫時無法使用，請稍後再試。");
  });

  it("後端未回應時會逾時拒絕並結束等待", async () => {
    await expect(具備逾時(new Promise<string>(() => undefined), 5)).rejects.toThrow("登入請求逾時");
  });

  it("後端及時回應時會回傳登入結果", async () => {
    await expect(具備逾時(Promise.resolve("成功"), 50)).resolves.toBe("成功");
  });

  it("登入流程遇到不存在工號會結束載入並回傳失敗彈窗訊息", async () => {
    await expect(執行登入流程(() => Promise.reject(new Error("此工號不存在"))))
      .resolves.toEqual({ 成功: false, 訊息: "此工號不存在或已停用，請洽管理員。" });
  });

  it("登入流程逾時會結束載入並回傳逾時彈窗訊息", async () => {
    await expect(執行登入流程(() => new Promise<string>(() => undefined), 5))
      .resolves.toEqual({ 成功: false, 訊息: "登入請求逾時，請稍後再試。" });
  });

  it("登入介面錯誤工號會解除載入並開啟失敗彈窗", async () => {
    await expect(執行登入介面流程(() => Promise.reject(new Error("此工號不存在"))))
      .resolves.toEqual({ 載入中: false, 顯示失敗彈窗: true, 訊息: "此工號不存在或已停用，請洽管理員。" });
  });

  it("登入介面逾時會解除載入並開啟失敗彈窗", async () => {
    await expect(執行登入介面流程(() => new Promise<string>(() => undefined), 5))
      .resolves.toEqual({ 載入中: false, 顯示失敗彈窗: true, 訊息: "登入請求逾時，請稍後再試。" });
  });

  it("登入提交 mutation 失敗會呼叫 reset 並顯示彈窗訊息", async () => {
    let reset次數 = 0;
    let 錯誤訊息 = "";
    await 處理登入提交({
      工號: " f000000 ",
      request: async () => { throw new Error("此工號不存在"); },
      reset: () => { reset次數 += 1; },
      onSuccess: () => { throw new Error("不應成功"); },
      onError: message => { 錯誤訊息 = message; },
    });
    expect(reset次數).toBe(1);
    expect(錯誤訊息).toBe("此工號不存在或已停用，請洽管理員。");
  });

  it("登入提交逾時會呼叫 reset 並解除錯誤狀態", async () => {
    let reset次數 = 0;
    let 錯誤訊息 = "";
    await 處理登入提交({
      工號: "F000000",
      request: () => new Promise<string>(() => undefined),
      reset: () => { reset次數 += 1; },
      onSuccess: () => { throw new Error("不應成功"); },
      onError: message => { 錯誤訊息 = message; },
      milliseconds: 5,
    });
    expect(reset次數).toBe(1);
    expect(錯誤訊息).toBe("登入請求逾時，請稍後再試。");
  });
});
