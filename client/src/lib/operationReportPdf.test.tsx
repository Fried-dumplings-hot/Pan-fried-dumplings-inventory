import { describe, expect, it } from "vitest";
import { 建立作業紀錄PDF列, type 作業紀錄PDF列 } from "./operationReportPdf";

describe("作業紀錄 PDF 表格列", () => {
  it("同品項逐行列示並加入品項合計與報表總計", () => {
    const rows: 作業紀錄PDF列[] = [
      { 日期: "2026-08-18", 貨品代號: "A010001", 品項名稱: "高麗菜豬肉水餃", 單價: 100, 單位: "包", 數量: 2, 小計: 200, 操作人: "F999001", 操作時間: "2026-08-18 08:00" },
      { 日期: "2026-08-19", 貨品代號: "A010001", 品項名稱: "高麗菜豬肉水餃", 單價: 100, 單位: "包", 數量: 3, 小計: 300, 操作人: "F999001", 操作時間: "2026-08-19 08:00" },
      { 日期: "2026-08-19", 貨品代號: "Z999999", 品項名稱: "測試品項", 單價: 200, 單位: "箱", 數量: 1, 小計: 200, 操作人: "F900001", 操作時間: "2026-08-19 09:00" },
    ];
    const tableRows = 建立作業紀錄PDF列(rows);
    expect(tableRows).toHaveLength(6);
    expect(tableRows.filter(row => row.類型 === "明細")).toHaveLength(3);
    expect(tableRows.filter(row => row.類型 === "品項合計")).toEqual([
      { 類型: "品項合計", 品項名稱: "高麗菜豬肉水餃", 小計: 500 },
      { 類型: "品項合計", 品項名稱: "測試品項", 小計: 200 },
    ]);
    expect(tableRows.at(-1)).toEqual({ 類型: "報表總計", 小計: 700 });
  });
});
