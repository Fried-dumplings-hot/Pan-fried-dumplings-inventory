import { describe, expect, it } from "vitest";
import { 取得員工列操作狀態, 排序低庫存門市, 解析批次CSV列 } from "./adminRules";

describe("管理員設定規則", () => {
  it("可解析品項與預設表單批次 CSV 列", () => {
    expect(解析批次CSV列('名稱,單價\n"高麗菜水餃",120\n')).toEqual([
      ["名稱", "單價"],
      ["高麗菜水餃", "120"],
    ]);
  });

  it("啟用員工可修改、刪除並保存門市，管理員角色可辨識", () => {
    expect(取得員工列操作狀態({ active: true, role: "admin" })).toEqual({
      可修改: true,
      可刪除: true,
      可停用: true,
      可儲存門市: true,
      是管理員: true,
    });
  });

  it("已停用員工仍可修改與查看門市，但不再顯示刪除操作", () => {
    expect(取得員工列操作狀態({ active: false, role: "staff" }).可刪除).toBe(false);
    expect(取得員工列操作狀態({ active: false, role: "staff" }).可修改).toBe(true);
  });

  it("低庫存門市依數量由高至低排序，同數量按門市名稱排序", () => {
    expect(排序低庫存門市([
      { 門市名稱: "乙店", 低庫存數量: 2 },
      { 門市名稱: "甲店", 低庫存數量: 4 },
      { 門市名稱: "丙店", 低庫存數量: 2 },
    ])).toEqual([
      { 門市名稱: "甲店", 低庫存數量: 4 },
      { 門市名稱: "乙店", 低庫存數量: 2 },
      { 門市名稱: "丙店", 低庫存數量: 2 },
    ]);
  });
});
