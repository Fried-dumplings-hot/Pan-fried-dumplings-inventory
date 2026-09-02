export type 操作權限 = "新增" | "修改" | "刪除";

export type 權限資料 = Partial<Record<操作權限, boolean>>;

const 模組名稱對照: Record<string, string[]> = {
  進貨單: ["purchase", "進貨", "進貨單"],
  退貨單: ["return", "退貨", "退貨單"],
  報廢單: ["scrap", "報廢", "報廢單"],
  每日盤點: ["count", "盤點", "每日盤點"],
  查詢報表: ["report", "查詢報表"],
  後台管理: ["admin", "後台管理"],
  庫存總覽: ["inventory", "inventoryOverview", "庫存總覽", "總覽"],
  總覽: ["inventory", "inventoryOverview", "庫存總覽", "總覽"],
};

export function 取得模組權限<T extends { 模組?: string; module?: string }>(權限清單: T[], 目前模組: string): T | undefined {
  const candidates = 模組名稱對照[目前模組] ?? [目前模組, 目前模組.replace(/單$/, "")];
  return 權限清單.find(item => candidates.includes(String(item.模組 ?? item.module ?? "").trim()));
}

export function 正規化權限資料(權限清單: Array<Record<string, unknown>>, 角色?: string) {
  return 權限清單
    .filter(item => !角色 || !item.role || String(item.role) === 角色 || (角色 === "一般員工" && ["user", "staff", "一般員工"].includes(String(item.role).trim())))
    .map(item => ({
      模組: String(item.模組 ?? item.module ?? "").trim(),
      新增: item.新增 === true || item.canCreate === true,
      修改: item.修改 === true || item.canUpdate === true || item.canModify === true,
      刪除: item.刪除 === true || item.canDelete === true,
    }))
    .filter(item => item.模組.length > 0);
}

export function 有操作權限(角色: string, 權限: 權限資料 | undefined, 操作: 操作權限): boolean {
  if (角色 === "管理員") return true;
  return 權限?.[操作] === true;
}
