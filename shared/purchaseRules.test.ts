import { describe, expect, it } from "vitest";
import { 計算進貨小計, 驗證單價輸入 } from "./purchaseRules";

describe("進貨單價與小計規則", () => {
  it("允許零與最多兩位小數的單價", () => {
    expect(驗證單價輸入("0").valid).toBe(true);
    expect(驗證單價輸入("200.5").valid).toBe(true);
    expect(驗證單價輸入("200.55").valid).toBe(true);
  });

  it("拒絕負數與超過兩位小數", () => {
    expect(驗證單價輸入("-1").valid).toBe(false);
    expect(驗證單價輸入("200.555").valid).toBe(false);
    expect(驗證單價輸入("").valid).toBe(false);
  });

  it("以單價乘數量並四捨五入至兩位小數", () => {
    expect(計算進貨小計(200, 0.5)).toBe(100);
    expect(計算進貨小計(12.345, 2)).toBe(24.69);
  });
});
