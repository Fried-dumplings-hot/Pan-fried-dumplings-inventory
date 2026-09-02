import { describe, expect, it } from "vitest";
import { 依貨品代號排序, 驗證數量輸入 } from "./Home";

describe("庫存作業排序與數量規則", () => {
  it("應依貨品代號自然排序且不改動原陣列", () => {
    const items = [{ 貨品代號: "A000010" }, { 貨品代號: "A000002" }, { 貨品代號: "A000001" }];
    expect(依貨品代號排序(items).map(item => item.貨品代號)).toEqual(["A000001", "A000002", "A000010"]);
    expect(items.map(item => item.貨品代號)).toEqual(["A000010", "A000002", "A000001"]);
  });

  it("應接受零值、正數與最多兩位小數", () => {
    expect(驗證數量輸入("0").valid).toBe(true);
    expect(驗證數量輸入("12").valid).toBe(true);
    expect(驗證數量輸入("12.50").valid).toBe(true);
    expect(驗證數量輸入("0.01").valid).toBe(true);
  });

  it("應拒絕負數、空白及超過兩位小數", () => {
    expect(驗證數量輸入("-1").valid).toBe(false);
    expect(驗證數量輸入("").valid).toBe(false);
    expect(驗證數量輸入("1.234").valid).toBe(false);
  });
});
