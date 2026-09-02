// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutationMock = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    employee: {
      login: {
        useMutation: () => mutationMock,
      },
    },
    brand: {
      get: {
        useQuery: () => ({ data: { 公司名稱: "顏 水煎餃", Logo網址: null } }),
      },
    },
  },
}));

import { Login, 明細操作可見, 取得工作頁權限模組, 每日盤點操作按鈕, 計算報表快速日期區段, 顯示日期與星期, 統計每日筆數, 篩選工作頁明細 } from "./Home";

describe("四個工作頁權限模組", () => {
  it("新增與修改按鈕使用各自的員工權限模組", () => {
    expect(["進貨", "退貨", "報廢", "每日盤點"].map(取得工作頁權限模組)).toEqual(["進貨單", "退貨單", "報廢單", "每日盤點"]);
  });
});

describe("每日紀錄筆數", () => {
  it("同日期逐行紀錄會顯示該日總筆數", () => {
    expect(統計每日筆數([{ 日期: "2026-08-18" }, { 日期: "2026-08-18" }, { 日期: "2026-08-17" }])).toEqual({ "2026-08-18": 2, "2026-08-17": 1 });
  });
});

describe("四個工作頁明細同步篩選", () => {
  const records = [
    { id: 1, 類型: "進貨", 日期: "2026-08-18", 品項: "高麗菜豬肉水餃", 數量: 2, 單位: "包", 門市編號: 1, 門市名稱: "瑞豐夜市", 備註: "", 操作人: "", 操作時間: "" },
    { id: 2, 類型: "退貨", 日期: "2026-08-18", 品項: "高麗菜豬肉水餃", 數量: 1, 單位: "包", 門市編號: 1, 門市名稱: "瑞豐夜市", 備註: "", 操作人: "", 操作時間: "" },
    { id: 3, 類型: "報廢", 日期: "2026-08-18", 品項: "高麗菜豬肉水餃", 數量: 1, 單位: "包", 門市編號: 2, 門市名稱: "其他門市", 備註: "", 操作人: "", 操作時間: "" },
    { id: 4, 類型: "每日盤點", 日期: "2026-08-18", 品項: "高麗菜豬肉水餃", 數量: 10, 單位: "包", 門市編號: 1, 門市名稱: "瑞豐夜市", 備註: "", 操作人: "", 操作時間: "" },
  ] as any;
  it("四種工作類型皆只保留指定門市與類型", () => {
    expect(["進貨單", "退貨單", "報廢單", "每日盤點"].map(type => 篩選工作頁明細(records, type as any, 1).length)).toEqual([1, 1, 0, 1]);
  });
});

describe("首頁登入元件", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mutationMock.isPending = false;
    mutationMock.mutateAsync.mockReset();
    mutationMock.reset.mockReset();
  });

  it("顯示公司 Logo 與公司名稱", () => {
    render(<Login onLogin={() => undefined} />);
    expect(screen.getByAltText("顏 水煎餃公司標誌").getAttribute("src")).toBe("/manus-storage/yan-dumpling-logo_9d368cbd.jpeg");
    expect(screen.getByText("顏 水煎餃")).toBeTruthy();
  });

  it("錯誤工號會解除提交流程並顯示登入失敗彈窗", async () => {
    mutationMock.mutateAsync.mockRejectedValueOnce(new Error("此工號不存在"));
    const user = userEvent.setup();
    render(<Login onLogin={() => undefined} />);

    await user.type(screen.getByLabelText("員工工號"), "F000000");
    await user.click(screen.getByRole("button", { name: "進入系統" }));

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("登入失敗")).toBeTruthy();
    expect(screen.getByText("此工號不存在或已停用，請洽管理員。")).toBeTruthy();
    expect(mutationMock.reset).toHaveBeenCalledTimes(1);
  });
});


describe("日期顯示格式", () => {
  it("日期後顯示星期幾", () => { expect(顯示日期與星期("2026-08-17")).toBe("2026-08-17（星期一）"); });
});

describe("報表日期快速選項", () => {
  const now = new Date(2026, 7, 17);
  it("今日套用同一天日期", () => { expect(計算報表快速日期區段("today", now)).toEqual({ startDate: "2026-08-17", endDate: "2026-08-17" }); });
  it("近七日包含今天共七天", () => { expect(計算報表快速日期區段("sevenDays", now)).toEqual({ startDate: "2026-08-11", endDate: "2026-08-17" }); });
  it("本月從當月一日開始", () => { expect(計算報表快速日期區段("month", now)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-17" }); });
});

describe("明細彈窗操作權限", () => {
  it("一般員工不顯示刪除，管理員可顯示刪除", () => {
    expect(明細操作可見(true, false)).toEqual({ 儲存: true, 修改: true, 刪除: false });
    expect(明細操作可見(true, true)).toEqual({ 儲存: true, 修改: true, 刪除: true });
  });
});

describe("每日盤點門市操作元件", () => {
  it("同門市同日已完成時阻擋新增，切換到未完成門市後可操作", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { rerender } = render(<每日盤點操作按鈕 type="每日盤點" countedToday={true} canCreate={true} onOpen={onOpen} />);

    expect((screen.getByRole("button", { name: "今日已完成盤點" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();

    rerender(<每日盤點操作按鈕 type="每日盤點" countedToday={false} canCreate={true} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "新增每日盤點" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
