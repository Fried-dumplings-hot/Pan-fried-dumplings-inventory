export type 批次品項 = {
  貨品代號: string;
  名稱: string;
  單價: number;
  大值單位: string;
  小值單位: string;
  換算比例: number;
  庫存: number;
  低庫存門檻: number;
};

export function 解析批次品項(text: string, existingNames: string[] = []) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const dataLines = lines[0]?.startsWith("貨品代號") || lines[0]?.startsWith("品項名稱") ? lines.slice(1) : lines;
  const parsed: 批次品項[] = [];
  for (let index = 0; index < dataLines.length; index += 1) {
    const fields = dataLines[index].split(",").map(value => value.trim());
    const legacy = fields.length === 7;
    const [貨品代號原值, 名稱原值, 單價原值, 大值單位原值, 小值單位原值, 換算比例原值, 初始庫存原值, 低庫存門檻原值] = legacy ? [`A${String(index + 1).padStart(6, "0")}`, ...fields] : fields;
    const 貨品代號 = String(貨品代號原值 || "").toUpperCase();
    const 名稱 = 名稱原值;
    const 單價 = 單價原值;
    const 大值單位 = 大值單位原值;
    const 小值單位 = 小值單位原值;
    const 換算比例 = 換算比例原值;
    const 初始庫存 = 初始庫存原值;
    const 低庫存門檻 = 低庫存門檻原值;
    if ((!legacy && !/^[A-Z]\d{6}$/.test(貨品代號)) || !名稱 || !單價 || !大值單位 || !小值單位 || Number(單價) < 0 || Number(換算比例) <= 0 || Number(初始庫存) < 0 || Number(低庫存門檻) < 0) {
      return { data: [], error: `第 ${index + 1} 筆資料格式不正確` };
    }
    if (existingNames.includes(名稱) || parsed.some(item => item.名稱 === 名稱) || parsed.some(item => item.貨品代號 === 貨品代號.toUpperCase())) {
      return { data: [], error: `品項「${名稱}」重複，請先整理資料` };
    }
    parsed.push({ 貨品代號: 貨品代號.toUpperCase(), 名稱, 單價: Number(單價), 大值單位, 小值單位, 換算比例: Number(換算比例), 庫存: Number(初始庫存), 低庫存門檻: Number(低庫存門檻) });
  }
  return parsed.length ? { data: parsed, error: "" } : { data: [], error: "請貼上至少一筆批次資料" };
}

export function 找出低庫存<T extends { 庫存: number; 低庫存門檻: number }>(items: T[]) {
  return items.filter(item => item.低庫存門檻 > 0 && item.庫存 <= item.低庫存門檻);
}
