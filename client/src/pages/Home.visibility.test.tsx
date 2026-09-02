import { describe, expect, it } from "vitest";
import { 依貨品代號排序, 正規化門市資料, 取得角色可見門市 } from "./Home";

describe("門市可見範圍與貨品排序", () => {
  const assigned = [{ 編號: 1, 門市代號: "00001", 名稱: "瑞豐夜市", 地址: "" }];
  const all = [...assigned, { 編號: 2, 門市代號: "90001", 名稱: "實驗", 地址: "" }];

  it("一般員工只取得被分派門市，管理員取得全部門市", () => {
    expect(取得角色可見門市("一般員工", assigned, all)).toEqual(assigned);
    expect(取得角色可見門市("管理員", assigned, all)).toEqual(all);
  });

  it("登入回傳英文欄位時可轉成中文門市格式，並排除無效門市", () => {
    expect(正規化門市資料([
      { id: 7, storeCode: "00007", name: "中央門市", address: "台北" } as any,
      { id: 0, storeCode: "", name: "" } as any,
    ])).toEqual([{ 編號: 7, 門市代號: "00007", 名稱: "中央門市", 地址: "台北" }]);
  });

  it("品項依貨品代號由小到大排列且不修改原陣列", () => {
    const items = [{ 貨品代號: "Z999999" }, { 貨品代號: "A010001" }];
    expect(依貨品代號排序(items).map(item => item.貨品代號)).toEqual(["A010001", "Z999999"]);
    expect(items.map(item => item.貨品代號)).toEqual(["Z999999", "A010001"]);
  });
});
