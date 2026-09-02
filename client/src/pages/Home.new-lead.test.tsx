import { describe, expect, it } from "vitest";
import { 新增頁返回動作, 取得儲存成功Toast設定, 取得手機新增表單尺寸, 檢查表格可水平捲動 } from "./Home";

describe("新增單據引導頁返回流程", () => {
  it("有未儲存變更時應先顯示確認提示", () => {
    expect(新增頁返回動作(true)).toBe("提示");
  });

  it("沒有未儲存變更時可直接返回工作頁", () => {
    expect(新增頁返回動作(false)).toBe("返回");
  });

  it("儲存成功提示使用短暫動畫通知設定", () => {
    expect(取得儲存成功Toast設定("進貨單已新增 1 項")).toEqual({
      description: "進貨單已新增 1 項",
      duration: 3000,
      position: "bottom-right",
      closeButton: true,
    });
  });

  it("手機新增表單提供可捲動表格與最小可讀控制項尺寸", () => {
    expect(取得手機新增表單尺寸("進貨")).toEqual({ 表格內容寬度: 620, 表格容器最小寬度: "100%", 控制項高度: 32, 控制項文字尺寸: "text-xs", 表格水平捲動: true, 觸控滑動: "pan-x" });
    expect(取得手機新增表單尺寸("退貨").表格內容寬度).toBe(420);
    expect(取得手機新增表單尺寸("報廢").表格水平捲動).toBe(true);
    expect(取得手機新增表單尺寸("每日盤點").觸控滑動).toBe("pan-x");
    for (const type of ["進貨", "退貨", "報廢", "每日盤點"]) {
      const width = 取得手機新增表單尺寸(type).表格內容寬度;
      expect(檢查表格可水平捲動(width, 358)).toBe(true);
      expect(檢查表格可水平捲動(358, 358)).toBe(false);
    }
  });
});
