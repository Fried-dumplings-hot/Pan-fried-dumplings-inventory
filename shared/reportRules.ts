export type 報表異動 = {
  id: number;
  類型: string;
  日期: string;
  品項: string;
  數量: number;
  單位: string;
  備註?: string;
  使用量?: number;
  操作人?: string;
  操作時間?: string;
};

export type 每日紀錄彙整 = {
  日期: string;
  總筆數: number;
  類型摘要: Record<string, number>;
  明細: 報表異動[];
};

export type 日期門市紀錄彙整 = 每日紀錄彙整 & {
  門市編號?: number;
  門市名稱?: string;
  門市代號?: string;
};

export function 依日期彙整紀錄(records: 報表異動[]): 每日紀錄彙整[] {
  const grouped = new Map<string, 報表異動[]>();
  for (const record of records) {
    const existing = grouped.get(record.日期) ?? [];
    existing.push(record);
    grouped.set(record.日期, existing);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([日期, 明細]) => {
      const 類型摘要: Record<string, number> = {};
      for (const record of 明細) 類型摘要[record.類型] = (類型摘要[record.類型] ?? 0) + 1;
      return {
        日期,
        總筆數: 明細.length,
        類型摘要,
        明細: [...明細].sort((left, right) => (left.操作時間 ?? "").localeCompare(right.操作時間 ?? "")),
      };
    });
}

export function 依日期門市彙整紀錄(records: (報表異動 & { 門市編號?: number; 門市名稱?: string; 門市代號?: string })[]): 日期門市紀錄彙整[] {
  const grouped = new Map<string, (報表異動 & { 門市編號?: number; 門市名稱?: string; 門市代號?: string })[]>();
  for (const record of records) {
    const key = `${record.日期}|${record.門市編號 ?? "未設定"}`;
    const existing = grouped.get(key) ?? [];
    existing.push(record);
    grouped.set(key, existing);
  }
  return Array.from(grouped.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([, 明細]) => {
      const first = 明細[0];
      const 類型摘要: Record<string, number> = {};
      for (const record of 明細) 類型摘要[record.類型] = (類型摘要[record.類型] ?? 0) + 1;
      return {
        日期: first.日期,
        門市編號: first.門市編號,
        門市名稱: first.門市名稱,
        門市代號: first.門市代號,
        總筆數: 明細.length,
        類型摘要,
        明細: [...明細].sort((left, right) => (left.操作時間 ?? "").localeCompare(right.操作時間 ?? "")),
      };
    });
}

export function 是否屬於日期門市紀錄(record: 報表異動 & { 門市編號?: number }, group: { 日期: string; 門市編號?: number }): boolean {
  return record.日期 === group.日期 && (record.門市編號 ?? undefined) === (group.門市編號 ?? undefined);
}

export function 格式化類型摘要(summary: Record<string, number>): string {
  return Object.entries(summary).map(([type, count]) => `${type} ${count} 筆`).join("、");
}


export const 報表作業類型 = ["進貨", "退貨", "報廢", "每日盤點"] as const;
export type 報表作業類型值 = (typeof 報表作業類型)[number];

export type 報表進階篩選 = {
  開始日期?: string;
  結束日期?: string;
  關鍵字?: string;
  作業類型?: 報表作業類型值 | "全部";
  操作人?: string;
  門市編號?: number[];
};

export function 篩選查詢報表紀錄(records: (報表異動 & { 門市編號?: number })[], filter: 報表進階篩選): (報表異動 & { 門市編號?: number })[] {
  const keyword = filter.關鍵字?.trim() ?? "";
  const stores = filter.門市編號?.length ? new Set(filter.門市編號) : null;
  return records.filter(record =>
    (!filter.開始日期 || record.日期 >= filter.開始日期) &&
    (!filter.結束日期 || record.日期 <= filter.結束日期) &&
    (!keyword || record.品項.includes(keyword) || record.類型.includes(keyword)) &&
    (!filter.作業類型 || filter.作業類型 === "全部" || record.類型 === filter.作業類型) &&
    (!filter.操作人 || record.操作人 === filter.操作人) &&
    (!stores || stores.has(record.門市編號 ?? -1)),
  );
}

export function 篩選報表作業類型(records: 報表異動[], type: 報表作業類型值 | "全部"): 報表異動[] {
  if (type === "全部") return records;
  return records.filter(record => record.類型 === type);
}

export type 報表價值品項 = {
  名稱: string;
  單價: number;
  換算比例?: number;
};

export function 計算庫存價值數量(quantity: number, item: 報表價值品項): number {
  // 品項設定的單價是「大值單價」，紀錄數量也已使用大值單位；換算比例僅用於大小值顯示，不再重複套入金額計算。
  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
  const unitPrice = Number.isFinite(item.單價) ? item.單價 : 0;
  return safeQuantity * unitPrice;
}

export function 計算門市庫存價值(
  records: 報表異動[],
  items: 報表價值品項[],
  storeId: number,
): number {
  const itemMap = new Map(items.map(item => [item.名稱, item]));
  return records
    .filter(record => (record as 報表異動 & { 門市編號?: number }).門市編號 === storeId)
    .reduce((total, record) => {
      const item = itemMap.get(record.品項);
      if (!item) return total;
      const quantity = Number(record.數量) || 0;
      const direction = record.類型 === "進貨" ? 1 : record.類型 === "退貨" || record.類型 === "報廢" || record.類型 === "每日盤點" ? -1 : 0;
      return total + 計算庫存價值數量(direction * quantity, item);
    }, 0);
}


export type 門市庫存明細 = {
  貨品代號: string;
  貨物品項: string;
  進貨單價: number;
  庫存數量: number;
  單位: string;
  小計: number;
};

export function 建立門市庫存明細(
  records: 報表異動[],
  items: (報表價值品項 & { 貨品代號?: string; 大值單位?: string })[],
  storeId: number,
): 門市庫存明細[] {
  const storeRecords = records.filter(record => (record as 報表異動 & { 門市編號?: number }).門市編號 === storeId);
  return items
    .slice()
    .sort((left, right) => String(left.貨品代號 ?? "").localeCompare(String(right.貨品代號 ?? ""), "en", { numeric: true }))
    .map(item => {
      const 庫存數量 = storeRecords
        .filter(record => record.品項 === item.名稱)
        .reduce((total, record) => {
          const quantity = Number(record.數量) || 0;
          return total + (record.類型 === "進貨" ? quantity : record.類型 === "退貨" || record.類型 === "報廢" || record.類型 === "每日盤點" ? -quantity : 0);
        }, 0);
      return {
        貨品代號: item.貨品代號 ?? "",
        貨物品項: item.名稱,
        進貨單價: Number(item.單價) || 0,
        庫存數量,
        單位: item.大值單位 ?? "箱",
        小計: 計算庫存價值數量(庫存數量, item),
      };
    });
}


export type 用量報表異動 = 報表異動 & { 單價?: number; 門市編號?: number };
export type 用量報表品項 = 報表價值品項 & { 貨品代號?: string; 大值單位?: string; 庫存?: number };
export type 食包材用量報表列 = {
  貨品代號: string;
  品項名稱: string;
  單價: number;
  單位: string;
  庫存數量盤點前: number;
  庫存數量盤點後: number;
  使用量: number;
  成本: number;
  庫存價值: number;
};

type 用量批次 = { 單價: number; 數量: number };

function 依先進先出扣除(批次: 用量批次[], quantity: number) {
  let remaining = Math.max(0, Number(quantity) || 0);
  for (const batch of 批次) {
    if (remaining <= 0) break;
    const deducted = Math.min(batch.數量, remaining);
    batch.數量 -= deducted;
    remaining -= deducted;
  }
}

function 重建盤點前批次(records: 用量報表異動[], item: 用量報表品項, countDate: string): 用量批次[] {
  const batches: 用量批次[] = [];
  const ordered = records.filter(record => record.日期 < countDate).slice().sort((left, right) => `${left.日期}|${left.操作時間 ?? ""}|${left.id}`.localeCompare(`${right.日期}|${right.操作時間 ?? ""}|${right.id}`));
  for (const record of ordered) {
    const quantity = Math.max(0, Number(record.數量) || 0);
    if (record.類型 === "進貨") batches.push({ 單價: Number(record.單價 ?? item.單價) || 0, 數量: quantity });
    else if (record.類型 === "退貨" || record.類型 === "報廢") 依先進先出扣除( batches, quantity );
    else if (record.類型 === "每日盤點") {
      batches.length = 0;
      batches.push({ 單價: Number(item.單價) || 0, 數量: quantity });
    }
  }
  return batches.filter(batch => batch.數量 > 0.000001);
}

export function 建立食包材用量報表(
  records: 用量報表異動[],
  items: 用量報表品項[],
  selectedStoreIds: number[],
  startDate: string,
  endDate: string,
): 食包材用量報表列[] {
  const selected = new Set(selectedStoreIds);
  const output = new Map<string, 食包材用量報表列>();
  for (const item of items) {
    const stores = Array.from(selected);
    for (const storeId of stores) {
      const storeRecords = records.filter(record => record.門市編號 === storeId && record.品項 === item.名稱);
      const count = storeRecords.filter(record => record.類型 === "每日盤點" && record.日期 >= startDate && record.日期 <= endDate).sort((left, right) => `${right.日期}|${right.操作時間 ?? ""}|${right.id}`.localeCompare(`${left.日期}|${left.操作時間 ?? ""}|${left.id}`))[0];
      if (!count) continue;
      const beforeBatches = 重建盤點前批次(storeRecords, item, count.日期);
      const afterQuantity = Math.max(0, Number(count.數量) || 0);
      let remainingAfter = afterQuantity;
      const afterBatches = beforeBatches.map(batch => {
        const after = Math.min(batch.數量, remainingAfter);
        remainingAfter -= after;
        return { 單價: batch.單價, 盤點前: batch.數量, 盤點後: after };
      });
      if (remainingAfter > 0) afterBatches.push({ 單價: Number(item.單價) || 0, 盤點前: 0, 盤點後: remainingAfter });
      for (const batch of afterBatches) {
        if (batch.盤點前 <= 0 && batch.盤點後 <= 0) continue;
        const key = `${item.名稱}|${batch.單價}`;
        const previous = output.get(key);
        const 使用量 = batch.盤點前 - batch.盤點後;
        const row: 食包材用量報表列 = {
          貨品代號: item.貨品代號 ?? "",
          品項名稱: item.名稱,
          單價: batch.單價,
          單位: item.大值單位 ?? "箱",
          庫存數量盤點前: batch.盤點前,
          庫存數量盤點後: batch.盤點後,
          使用量,
          成本: 使用量 * batch.單價,
          庫存價值: batch.盤點後 * batch.單價,
        };
        output.set(key, previous ? { ...previous, 庫存數量盤點前: previous.庫存數量盤點前 + row.庫存數量盤點前, 庫存數量盤點後: previous.庫存數量盤點後 + row.庫存數量盤點後, 使用量: previous.使用量 + row.使用量, 成本: previous.成本 + row.成本, 庫存價值: previous.庫存價值 + row.庫存價值 } : row);
      }
    }
  }
  return Array.from(output.values()).sort((left, right) => `${left.貨品代號}|${left.單價}`.localeCompare(`${right.貨品代號}|${right.單價}`, "en", { numeric: true }));
}
