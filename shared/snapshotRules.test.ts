import { describe, expect, it } from "vitest";
import { 判斷共用快照保存 } from "./snapshotRules";

describe("共用快照版本規則", () => {
  it("新版本可保存並更新最新版本", () => {
    expect(判斷共用快照保存(3, 4)).toEqual({ 衝突: false, 最新版本: 4 });
  });
  it("相同版本視為衝突，避免重複覆寫", () => {
    expect(判斷共用快照保存(4, 4)).toEqual({ 衝突: true, 最新版本: 4 });
  });
  it("較舊版本視為衝突並保留較新的版本", () => {
    expect(判斷共用快照保存(5, 3)).toEqual({ 衝突: true, 最新版本: 5 });
  });
});
