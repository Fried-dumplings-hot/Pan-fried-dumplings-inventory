import { describe, expect, it } from "vitest";
import { canHydrateSnapshot } from "../shared/snapshot";

describe("快照水合規則", () => {
  it("資料庫查詢尚未完成時不應水合", () => {
    expect(canHydrateSnapshot({ isLoading: true, isFetching: true, isError: false, hydrated: false })).toBe(false);
    expect(canHydrateSnapshot({ isLoading: false, isFetching: true, isError: false, hydrated: false })).toBe(false);
  });

  it("查詢錯誤或已水合時不應再次套用資料", () => {
    expect(canHydrateSnapshot({ isLoading: false, isFetching: false, isError: true, hydrated: false })).toBe(false);
    expect(canHydrateSnapshot({ isLoading: false, isFetching: false, isError: false, hydrated: true })).toBe(false);
  });

  it("最新查詢成功且尚未水合時才允許套用資料庫快照", () => {
    expect(canHydrateSnapshot({ isLoading: false, isFetching: false, isError: false, hydrated: false })).toBe(true);
  });
});
