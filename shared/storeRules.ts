export type 門市盤點紀錄 = {
  類型: string;
  日期: string;
  門市編號?: number;
};

export function 是否已完成門市盤點(records: 門市盤點紀錄[], date: string, storeId: number | ""): boolean {
  return storeId !== "" && records.some(record => record.類型 === "每日盤點" && record.日期 === date && record.門市編號 === storeId);
}

export type 門市篩選角色 = "管理員" | "一般員工";

export function 篩選可見門市紀錄<T extends { 門市編號?: number }>(records: T[], role: 門市篩選角色, selectedStoreIds: number[], availableStoreCount: number): T[] {
  return records.filter(record => role === "一般員工"
    ? record.門市編號 !== undefined && selectedStoreIds.includes(record.門市編號)
    : availableStoreCount === 0
      ? record.門市編號 === undefined
      : selectedStoreIds.length > 0 && (record.門市編號 === undefined || selectedStoreIds.includes(record.門市編號)));
}
