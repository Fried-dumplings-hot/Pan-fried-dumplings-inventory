import { describe, expect, it } from "vitest";
import { 有操作權限, 取得模組權限, 正規化權限資料 } from "./permissionRules";

describe("品項與模組操作權限", () => {
  it("管理員不論權限表內容都具備新增、修改、刪除權限", () => {
    expect(有操作權限("管理員", undefined, "新增")).toBe(true);
    expect(有操作權限("管理員", { 新增: false, 修改: false, 刪除: false }, "修改")).toBe(true);
    expect(有操作權限("管理員", undefined, "刪除")).toBe(true);
  });

  it("一般員工沒有品項操作權限時三種操作都被拒絕", () => {
    const permission = { 新增: false, 修改: false, 刪除: false };
    expect(有操作權限("一般員工", permission, "新增")).toBe(false);
    expect(有操作權限("一般員工", permission, "修改")).toBe(false);
    expect(有操作權限("一般員工", permission, "刪除")).toBe(false);
  });

  it("歷史權限快照使用不帶單字的模組名稱時仍可匹配", () => {
    const 權限清單 = [
      { 模組: "進貨", 新增: true, 修改: false, 刪除: false },
      { 模組: "退貨", 新增: true, 修改: true, 刪除: false },
      { 模組: "報廢", 新增: false, 修改: true, 刪除: true },
    ];
    expect(取得模組權限(權限清單, "進貨單")?.新增).toBe(true);
    expect(取得模組權限(權限清單, "退貨單")?.修改).toBe(true);
    expect(取得模組權限(權限清單, "報廢單")?.刪除).toBe(true);
  });

  it("一般員工只具備權限表明確開啟的操作", () => {
    const permission = { 新增: true, 修改: true, 刪除: false };
    expect(有操作權限("一般員工", permission, "新增")).toBe(true);
    expect(有操作權限("一般員工", permission, "修改")).toBe(true);
    expect(有操作權限("一般員工", permission, "刪除")).toBe(false);
    expect(有操作權限("一般員工", undefined, "新增")).toBe(false);
  });

  it("總覽與含空白的資料庫模組名稱仍可正確對應", () => {
    const 權限清單 = [{ 模組: " 總覽 ", 新增: true }, { 模組: "purchase", 修改: 1 as unknown as boolean }];
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "總覽"), "新增")).toBe(true);
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "進貨單"), "修改")).toBe(false);
  });

  it("總覽可對應資料庫常見模組別名並顯示一般員工明確開啟的按鈕", () => {
    const 權限清單 = [{ 模組: "inventoryOverview", 新增: true, 修改: true, 刪除: false }];
    const 權限 = 取得模組權限(權限清單, "總覽");
    expect(有操作權限("一般員工", 權限, "新增")).toBe(true);
    expect(有操作權限("一般員工", 權限, "修改")).toBe(true);
    expect(有操作權限("一般員工", 權限, "刪除")).toBe(false);
  });

  it("四個工作頁可對應後端英文模組並顯示一般員工新增按鈕", () => {
    const 權限清單 = [
      { 模組: "purchase", 新增: true },
      { 模組: "return", 新增: true },
      { 模組: "scrap", 新增: true },
      { 模組: "count", 新增: true },
    ];
    for (const 頁面 of ["進貨單", "退貨單", "報廢單", "每日盤點"]) {
      expect(有操作權限("一般員工", 取得模組權限(權限清單, 頁面), "新增")).toBe(true);
    }
  });

  it("F900001 的英文權限欄位可套用至總覽與四個工作頁", () => {
    const 權限清單 = 正規化權限資料([
      { role: "一般員工", module: "inventoryOverview", canCreate: true, canUpdate: true, canDelete: false },
      { role: "一般員工", module: "purchase", canCreate: true, canUpdate: true, canDelete: false },
      { role: "一般員工", module: "return", canCreate: true, canUpdate: false, canDelete: false },
      { role: "一般員工", module: "scrap", canCreate: false, canUpdate: true, canDelete: false },
      { role: "一般員工", module: "count", canCreate: true, canUpdate: false, canDelete: false },
    ], "一般員工");
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "總覽"), "新增")).toBe(true);
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "進貨單"), "修改")).toBe(true);
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "退貨單"), "修改")).toBe(false);
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "報廢單"), "新增")).toBe(false);
    expect(有操作權限("一般員工", 取得模組權限(權限清單, "每日盤點"), "新增")).toBe(true);
  });
});
