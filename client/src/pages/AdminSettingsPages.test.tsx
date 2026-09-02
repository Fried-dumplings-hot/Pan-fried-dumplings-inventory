// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: () => ({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() }),
  deleteStoreMutate: vi.fn(),
  utils: { inventory: { listItems: { invalidate: vi.fn() } }, admin: { listStores: { invalidate: vi.fn() }, listItemStores: { invalidate: vi.fn() }, listAuditLogs: { invalidate: vi.fn() }, listTemplates: { invalidate: vi.fn() } } },
}));

vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => mocks.utils,
    inventory: { listItems: { useQuery: () => ({ data: [{ id: 1, materialCode: "A000001", name: "高麗菜豬肉水餃", unitPrice: "200", largeUnit: "包", smallUnit: "顆", conversionRatio: 100, active: true }, { id: 2, materialCode: "B000002", name: "玉米豬肉水餃", unitPrice: "180", largeUnit: "包", smallUnit: "顆", conversionRatio: 100, active: true }] }) }, createItem: { useMutation: mocks.mutation }, updateItem: { useMutation: mocks.mutation }, deleteItem: { useMutation: mocks.mutation } },
    admin: { listStores: { useQuery: () => ({ data: [{ id: 1, storeCode: "30001", name: "瑞豐夜市", address: "高雄", active: true }] }) }, listAllStores: { useQuery: () => ({ data: [{ id: 1, storeCode: "30001", name: "瑞豐夜市", address: "高雄", active: true }, { id: 2, storeCode: "30002", name: "停用門市", address: "高雄", active: false }] }) }, listTemplates: { useQuery: () => ({ data: [{ id: 9, type: "purchase", name: "測試進貨表", itemIds: JSON.stringify([{ 品項編號: 1, 預設單位: "包" }]), active: true }] }) }, listTemplateStores: { useQuery: () => ({ data: [] }) }, listItemStores: { useQuery: () => ({ data: [{ itemId: 1, storeId: 1, active: true }] }) }, listEmployees: { useQuery: () => ({ data: [{ id: 1, employeeNo: "F999001", name: "顏嘉輝", role: "admin", active: true }] }) }, listEmployeeStores: { useQuery: () => ({ data: [] }) }, listAuditLogs: { useQuery: () => ({ data: [{ 操作時間: "2026-08-17 10:00", 員工工號: "F999001", 員工姓名: "顏嘉輝", 門市編號: 1, 門市名稱: "瑞豐夜市", 動作: "新增", 內容: "建立品項", 異動前: "", 異動後: "A000001" }] }) }, setItemStores: { useMutation: mocks.mutation }, createTemplate: { useMutation: mocks.mutation }, updateTemplate: { useMutation: mocks.mutation }, deleteTemplate: { useMutation: mocks.mutation }, setTemplateStores: { useMutation: mocks.mutation }, createStore: { useMutation: mocks.mutation }, updateStore: { useMutation: mocks.mutation }, deleteStore: { useMutation: () => ({ isPending: false, mutate: mocks.deleteStoreMutate, mutateAsync: vi.fn() }) } },
  },
}));

import { AdminSettingsHome, AuditLogsPage, ItemSettingsPage, ItemSummaryPage, StoreSettingsPage, TemplateSettingsPage } from "./AdminSettingsPages";

describe("食包材品項設定頁", () => {
  beforeEach(() => { cleanup(); localStorage.setItem("食包材登入", JSON.stringify({ role: "管理員" })); });

  it("以欄位標題呈現新增表單且不顯示輸入框示例文字", () => {
    render(<ItemSettingsPage />);
    expect(screen.getByText("貨品代號")).toBeTruthy();
    expect(screen.getByText("品項名稱")).toBeTruthy();
    expect(screen.getByText("進貨單價")).toBeTruthy();
    expect(screen.getByText(/貨品代號格式為一個英文字母加六個數字/)).toBeTruthy();
    expect((screen.getByLabelText("貨品代號") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("品項名稱") as HTMLInputElement).value).toBe("");
  });

  it("在品項清單以貨品代號搭配品項名稱顯示", () => {
    render(<ItemSettingsPage />);
    expect(screen.getByText("A000001")).toBeTruthy();
    expect(screen.getByText("高麗菜豬肉水餃")).toBeTruthy();
  });

  it("彙總表列出所有品項並保留未設定門市品項", () => {
    render(<ItemSummaryPage />);
    expect(screen.getByText("食包材彙總表")).toBeTruthy();
    expect(screen.getByText("A000001")).toBeTruthy();
    expect(screen.getByText("高麗菜豬肉水餃")).toBeTruthy();
    expect(screen.getAllByText(/30001・瑞豐夜市/).length).toBeGreaterThan(0);
    expect(screen.getByText("未設定門市")).toBeTruthy();
    expect(screen.getByRole("button", { name: "匯出彙總表 CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "全部存檔" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });

  it("變更門市設定後顯示未存檔提示", () => {
    render(<ItemSummaryPage />);
    const storeCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(storeCheckbox);
    expect(screen.getByRole("status").textContent).toContain("已有變更尚未存檔");
  });

  it("可依品項搜尋並依門市篩選彙總清單", () => {
    render(<ItemSummaryPage />);
    fireEvent.change(screen.getByLabelText("搜尋品項"), { target: { value: "玉米" } });
    expect(screen.getByText("B000002")).toBeTruthy();
    expect(screen.queryByText("A000001")).toBeNull();
    fireEvent.change(screen.getByLabelText("搜尋品項"), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("門市篩選"));
    fireEvent.click(screen.getAllByText(/30001・瑞豐夜市/).at(-1)!);
    expect(screen.getByText("A000001")).toBeTruthy();
    expect(screen.queryByText("B000002")).toBeNull();
  });
});

describe("多品項預設表單品項勾選", () => {
  beforeEach(() => { cleanup(); localStorage.setItem("食包材登入", JSON.stringify({ role: "管理員" })); });

  it("品項後方提供勾選控制與大值小值預設單位", () => {
    render(<TemplateSettingsPage />);
    fireEvent.click(screen.getByLabelText("選取高麗菜豬肉水餃"));
    expect(screen.getByLabelText("高麗菜豬肉水餃大值單位")).toBeTruthy();
    expect(screen.getByLabelText("高麗菜豬肉水餃小值單位")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("高麗菜豬肉水餃小值單位"));
    expect((screen.getByLabelText("高麗菜豬肉水餃小值單位") as HTMLButtonElement).getAttribute("data-state")).toBe("checked");
  });

  it("預設表單清單能顯示物件格式已選品項", () => {
    render(<TemplateSettingsPage />);
    expect(screen.getByText("測試進貨表")).toBeTruthy();
    expect(screen.getByText(/A000001 高麗菜豬肉水餃/)).toBeTruthy();
    expect(screen.getByText("預設大值：包")).toBeTruthy();
  });
});


describe("後台門市與操作稽核管理", () => {
  beforeEach(() => { cleanup(); localStorage.setItem("食包材登入", JSON.stringify({ role: "管理員" })); });

  it("後台入口顯示完整操作稽核紀錄與目前筆數", () => {
    render(<AdminSettingsHome />);
    expect(screen.getByText("食包材彙總表")).toBeTruthy();
    expect(screen.getByRole("link", { name: /食包材彙總表/ }).getAttribute("href")).toBe("/admin/item-summary");
    expect(screen.getByText("完整操作稽核紀錄")).toBeTruthy();
    expect(screen.getByText("1 筆")).toBeTruthy();
  });

  it("新增門市代號離開欄位後自動補零", () => {
    render(<StoreSettingsPage />);
    const input = screen.getByLabelText("門市代號") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);
    expect(input.value).toBe("00001");
  });

  it("門市清單顯示五位數門市代號", () => {
    render(<StoreSettingsPage />);
    expect(screen.getByText(/30001・瑞豐夜市/)).toBeTruthy();
  });

  it("門市清單提供停用與啟用按鈕", () => {
    render(<StoreSettingsPage />);
    expect(screen.getByRole("button", { name: "停用" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "啟用" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "刪除" })).toBeNull();
  });

  it("稽核頁提供清除篩選與排序控制", () => {
    render(<StoreSettingsPage />);
    expect(screen.getByRole("button", { name: "停用" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "啟用" })).toBeTruthy();
    cleanup();
    render(<AuditLogsPage />);
    expect(screen.getByRole("button", { name: "清除篩選" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /操作時間/ }));
    expect(screen.getByText(/操作時間（升冪）/)).toBeTruthy();
  });
});
