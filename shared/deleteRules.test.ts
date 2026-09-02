import { describe, expect, it } from "vitest";
import { 取得全部刪除按鈕狀態, 取得刪除成功Toast設定, 是否可開始全部刪除 } from "./deleteRules";

describe("全部刪除載入狀態", () => {
  it("未刪除時顯示全部刪除且可操作", () => {
    expect(取得全部刪除按鈕狀態(false)).toEqual({ disabled: false, label: "全部刪除", showSpinner: false });
    expect(是否可開始全部刪除(false)).toBe(true);
  });

  it("刪除中顯示載入文字與旋轉圖示並停用按鈕", () => {
    expect(取得全部刪除按鈕狀態(true)).toEqual({ disabled: true, label: "刪除中…", showSpinner: true });
    expect(是否可開始全部刪除(true)).toBe(false);
  });
});


describe("刪除成功 Toast 設定", () => {
  it("應固定右下角、顯示十秒並可手動關閉", () => {
    expect(取得刪除成功Toast設定()).toEqual({ duration: 10000, position: "bottom-right", closeButton: true });
  });
});
