import { describe, expect, it } from "vitest";
import { 是否已完成門市盤點, 篩選可見門市紀錄 } from "./storeRules";

describe("門市級每日盤點規則", () => {
  const records = [{ 類型: "每日盤點", 日期: "2026-08-17", 門市編號: 1 }];

  it("同一門市同一天不可再次盤點", () => {
    expect(是否已完成門市盤點(records, "2026-08-17", 1)).toBe(true);
  });

  it("不同門市同一天可以各自盤點", () => {
    expect(是否已完成門市盤點(records, "2026-08-17", 2)).toBe(false);
  });

  it("同一門市不同日期可以盤點", () => {
    expect(是否已完成門市盤點(records, "2026-08-18", 1)).toBe(false);
  });
});


describe("報表門市篩選規則", () => {
  const records = [{ id: 1, 門市編號: 1 }, { id: 2, 門市編號: 2 }, { id: 3 }];

  it("管理員多選時只顯示選取門市與未標記的歷史紀錄", () => {
    expect(篩選可見門市紀錄(records, "管理員", [2], 2).map(record => record.id)).toEqual([2, 3]);
  });

  it("管理員清除全部勾選後不顯示門市紀錄", () => {
    expect(篩選可見門市紀錄(records, "管理員", [], 2)).toEqual([]);
  });

  it("一般員工只能看到固定分派門市", () => {
    expect(篩選可見門市紀錄(records, "一般員工", [1], 2).map(record => record.id)).toEqual([1]);
  });
});

describe("庫存總覽門市可見範圍", () => {
  const records = [
    { id: 11, 門市編號: 1 },
    { id: 12, 門市編號: 2 },
    { id: 13, 門市編號: 3 },
  ];

  it("管理員選取全部門市時可看到全部門市紀錄", () => {
    expect(篩選可見門市紀錄(records, "管理員", [1, 2, 3], 3).map(record => record.id)).toEqual([11, 12, 13]);
  });

  it("一般員工在總覽只能看到已分派門市紀錄", () => {
    expect(篩選可見門市紀錄(records, "一般員工", [2], 3).map(record => record.id)).toEqual([12]);
  });
});
