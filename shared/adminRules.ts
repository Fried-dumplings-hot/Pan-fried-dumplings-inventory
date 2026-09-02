export const 貨品代號正規表示式 = /^[A-Z]\d{6}$/;

export function 是否為有效貨品代號(value: string): boolean {
  return 貨品代號正規表示式.test(value.trim().toUpperCase());
}

export function 正規化貨品代號(value: string): string {
  return value.trim().toUpperCase();
}

export type 員工列狀態 = {
  active: boolean;
  role: "admin" | "staff";
};

export function 解析批次CSV列(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map(line => line.split(",").map(value => value.trim().replace(/^"|"$/g, "")))
    .filter(row => row.some(Boolean));
}

export function 取得員工列操作狀態(employee: 員工列狀態) {
  return {
    可修改: true,
    可刪除: employee.active,
    可停用: employee.active,
    可儲存門市: true,
    是管理員: employee.role === "admin",
  };
}

export function 排序低庫存門市<T extends { 低庫存數量: number; 門市名稱: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.低庫存數量 - a.低庫存數量 || a.門市名稱.localeCompare(b.門市名稱, "zh-Hant"));
}
