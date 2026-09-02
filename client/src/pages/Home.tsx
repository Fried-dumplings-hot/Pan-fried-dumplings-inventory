import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, ClipboardCheck, Download, FileInput, FileOutput, LayoutDashboard, LoaderCircle, MapPin, Package, Recycle, Search, Settings, ShieldCheck, Store, Trash2, Truck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { 下載食包材用量報表PDF } from "@/lib/usageReportPdf";
import { 下載作業紀錄PDF, type 作業紀錄PDF列 } from "@/lib/operationReportPdf";
import { trpc } from "@/lib/trpc";
import { canHydrateSnapshot } from "@shared/snapshot";
import { 找出低庫存, 解析批次品項 } from "@shared/inventoryFeatures";
import { 處理登入提交 } from "@shared/loginRules";
import { 計算進貨小計, 驗證單價輸入 } from "@shared/purchaseRules";
import { 有操作權限, 取得模組權限, 正規化權限資料 } from "@shared/permissionRules";
import { 建立門市庫存明細, 建立食包材用量報表, 格式化類型摘要, 依日期門市彙整紀錄, 是否屬於日期門市紀錄, 依日期彙整紀錄, 報表作業類型, 篩選報表作業類型, 計算庫存價值數量, 計算門市庫存價值 } from "@shared/reportRules";
import { 取得全部刪除按鈕狀態, 取得刪除成功Toast設定, 是否可開始全部刪除 } from "@shared/deleteRules";
import { 是否已完成門市盤點, 篩選可見門市紀錄 } from "@shared/storeRules";

type 角色 = "管理員" | "一般員工";
type 模組 = "總覽" | "進貨單" | "退貨單" | "報廢單" | "每日盤點" | "查詢報表" | "後台管理";
type 品項 = { 編號?: number; 貨品代號: string; 名稱: string; 單價: number; 大值單位: string; 小值單位: string; 換算比例: number; 庫存: number; 低庫存門檻: number };
type 門市 = { 編號: number; 門市代號: string; 名稱: string; 地址: string };
type 異動 = { id: number; 類型: string; 日期: string; 品項: string; 數量: number; 單位: string; 單價?: number; 小計?: number; 備註: string; 使用量?: number; 操作人?: string; 操作時間?: string; 門市編號?: number; 門市名稱?: string };
type 稽核 = { id: number; 動作: string; 操作人: string; 操作時間: string; 內容: string; 異動前?: string; 異動後?: string };
type 表單行 = { 品項: string; 數量: string; 預設輸入單位?: string; 品項編號?: number; 單價?: string };
type 預設表單 = { id: number; type: "purchase" | "return" | "scrap" | "count"; name: string; itemIds: string; active?: boolean };
type 員工 = { 工號: string; 姓名: string; 角色: 角色; 啟用: boolean };
type 權限設定 = { 模組: string; 新增: boolean; 修改: boolean; 刪除: boolean };

const 初始品項: 品項[] = [];
const 初始異動: 異動[] = [];
function 刪除成功Toast內容({ id, 筆數, 類型, 可下載摘要, onRestore, onDownload }: { id: string | number; 筆數: number; 類型: string; 可下載摘要: boolean; onRestore: () => void; onDownload: () => void }) {
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const isUndoWarning = seconds <= 3 && seconds > 0;
  return <div className={`relative w-[min(22rem,calc(100vw-2rem))] rounded-xl border p-4 pr-10 shadow-lg ${isUndoWarning ? "border-[#c45745] bg-[#fff4f1] text-[#7f2f24] yan-undo-warning" : "border-[#d9b995] bg-[#fffdf9] text-[#3e2a1f]"}`}>
    <button type="button" aria-label="關閉刪除成功提示" onClick={() => toast.dismiss(id)} className="absolute right-2 top-2 rounded-md p-1 text-[#806653] hover:bg-[#f3e6d8]">×</button>
    <p className="font-semibold">刪除成功</p>
    <p className={`mt-1 text-sm ${isUndoWarning ? "text-[#a13f31]" : "text-[#806653]"}`}>已刪除 {筆數} 筆{類型}紀錄</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" disabled={seconds === 0} onClick={() => { onRestore(); toast.dismiss(id); }} className="bg-[#70452d] hover:bg-[#5b3724]">{isUndoWarning ? "即將逾時，" : ""}復原（{seconds}秒）</Button>
      {可下載摘要 && <Button type="button" size="sm" variant="outline" onClick={onDownload} className="border-[#d9b995] text-[#70452d]">下載摘要</Button>}
    </div>
  </div>;
}

const today = new Date().toISOString().slice(0, 10);

function 讀取安全品項(): 品項[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("食包材品項") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is 品項 => Boolean(item && typeof item.名稱 === "string" && item.名稱.trim())).map((item, index) => ({ 編號: Number(item.編號) || undefined, 貨品代號: /^[A-Z]\d{6}$/.test(String(item.貨品代號 || "")) ? String(item.貨品代號).toUpperCase() : `A${String(index + 1).padStart(6, "0")}`, 名稱: item.名稱, 單價: Number(item.單價) || 0, 大值單位: item.大值單位 || "箱", 小值單位: item.小值單位 || "包", 換算比例: Number(item.換算比例) || 1, 庫存: Number(item.庫存) || 0, 低庫存門檻: Number(item.低庫存門檻) || 0 }));
  } catch { return []; }
}

function 讀取安全異動(): 異動[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("食包材異動") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is 異動 => Boolean(record && typeof record.id !== "undefined" && typeof record.品項 === "string" && record.品項.trim())).map(record => ({ ...record, id: Number(record.id) || Date.now(), 數量: Number(record.數量) || 0 }));
  } catch { return []; }
}

export function Login({ onLogin }: { onLogin: (角色: 角色, 工號: string, 姓名: string, 門市: 門市[]) => void }) {
  const [工號, set工號] = useState("");
  const [登入錯誤, set登入錯誤] = useState("");
  const loginMutation = trpc.employee.login.useMutation();
  const brand = trpc.brand.get.useQuery();
  const 公司名稱 = brand.data?.公司名稱 || "顏 水煎餃";
  const 公司Logo = brand.data?.Logo網址 || "/manus-storage/yan-dumpling-logo_9d368cbd.jpeg";
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7eadc,transparent_42%),linear-gradient(135deg,#fbf8f2,#efe5d8)] flex items-center justify-center p-6">
    <Card className="w-full max-w-md border-[#e4d4c0] bg-[#fffdf9]/95 shadow-[0_24px_70px_rgba(101,70,43,.15)] rounded-3xl">
      <CardHeader className="pb-5 text-center"><img src={公司Logo} alt={`${公司名稱}公司標誌`} className="mx-auto mb-3 h-24 w-24 rounded-2xl object-contain shadow-sm" /><p className="text-base font-semibold tracking-[.22em] text-[#70452d]">{公司名稱}</p><p className="mt-1 text-sm tracking-[.3em] text-[#a07a5f]">食包材庫存管理</p><CardTitle className="mt-3 text-3xl text-[#3e2a1f]">歡迎登入</CardTitle><p className="text-sm text-[#8c7768]">請使用員工工號進入系統</p></CardHeader>
      <CardContent className="space-y-5"><div><label htmlFor="員工工號" className="mb-2 block text-sm font-medium text-[#5b4335]">員工工號</label><Input id="員工工號" value={工號} onChange={e => { set工號(e.target.value); set登入錯誤(""); }} placeholder="" className="h-12 rounded-xl border-[#decbb8] bg-white" /></div><div className="rounded-xl border border-[#eadfd5] bg-[#faf3eb] p-3 text-sm text-[#806653]">登入後將依員工資料自動套用管理員或一般員工權限。</div><Button className="h-12 w-full rounded-xl bg-[#70452d] text-white hover:bg-[#5b3724]" disabled={loginMutation.isPending} onClick={async () => { await 處理登入提交({ 工號, request: 輸入 => loginMutation.mutateAsync(輸入), reset: () => loginMutation.reset(), onSuccess: result => onLogin(result.角色 as 角色, result.工號, result.姓名, (result.門市 ?? []) as 門市[]), onError: 訊息 => set登入錯誤(訊息) }); }}>進入系統</Button><p className="text-center text-xs text-[#a38a77]">管理員可使用後台設定與完整資料管理功能</p></CardContent>
    </Card>
    <Dialog open={Boolean(登入錯誤)} onOpenChange={open => !open && set登入錯誤("")}><DialogContent className="rounded-2xl border-[#e8b7a8] bg-[#fffaf7]"><DialogHeader><DialogTitle className="text-[#9b4536]">登入失敗</DialogTitle><DialogDescription className="sr-only">登入失敗原因</DialogDescription></DialogHeader><p className="text-sm leading-6 text-[#70452d]">{登入錯誤}</p><Button onClick={() => set登入錯誤("")} className="bg-[#70452d] hover:bg-[#5b3724]">知道了</Button></DialogContent></Dialog>
  </div>;
}

export function 正規化門市資料(source: Array<門市 & { id?: number; storeCode?: string; name?: string; address?: string }>) {
  return source.map(store => ({ 編號: Number(store.編號 ?? store.id) || 0, 門市代號: String(store.門市代號 ?? store.storeCode ?? ""), 名稱: String(store.名稱 ?? store.name ?? "未命名門市"), 地址: String(store.地址 ?? store.address ?? "") })).filter(store => store.編號 > 0 && store.名稱.trim());
}

export function 取得角色可見門市(role: 角色, assignedStores: 門市[], allStores: 門市[]) {
  return role === "管理員" ? allStores : assignedStores;
}
export function 依貨品代號排序<T extends { 貨品代號: string }>(items: T[]) {
  return items.slice().sort((a, b) => String(a.貨品代號).localeCompare(String(b.貨品代號), "en", { numeric: true }));
}
export function 驗證數量輸入(value: string) {
  if (value.trim() === "") return { valid: false, message: "數量不可空白" };
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return { valid: false, message: "數量不可為負數，小數最多兩位" };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return { valid: false, message: "數量不可為負數" };
  return { valid: true, message: "" };
}
export function 明細操作可見(canModify: boolean, canDelete: boolean) {
  return { 儲存: true, 修改: canModify, 刪除: canDelete };
}
export function 新增頁返回動作(有未儲存變更: boolean) {
  return 有未儲存變更 ? "提示" : "返回";
}

export function 取得儲存成功Toast設定(說明?: string) {
  return { description: 說明 || "資料已保存", duration: 3000, position: "bottom-right" as const, closeButton: true };
}

export function 取得手機新增表單尺寸(類型: string) {
  return {
    表格內容寬度: 類型 === "進貨" ? 620 : 420,
    表格容器最小寬度: "100%",
    控制項高度: 32,
    控制項文字尺寸: "text-xs",
    表格水平捲動: true,
    觸控滑動: "pan-x",
  } as const;
}
export function 檢查表格可水平捲動(scrollWidth: number, clientWidth: number) {
  return Number.isFinite(scrollWidth) && Number.isFinite(clientWidth) && scrollWidth > clientWidth + 1;
}
export function 取得工作頁權限模組(type: string) {
  return type === "進貨" ? "進貨單" : type === "退貨" ? "退貨單" : type === "報廢" ? "報廢單" : "每日盤點";
}
function AppShell({ role, employee, employeeName, stores, onLogout }: { role: 角色; employee: string; employeeName: string; stores: 門市[]; onLogout: () => void }) {
  const storesQuery = trpc.admin.listStores.useQuery(undefined, { enabled: role === "管理員", staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false });
  const formTemplatesQuery = trpc.inventory.listFormTemplates.useQuery(undefined, { staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false });
  const inventoryItemsQuery = trpc.inventory.listItems.useQuery(undefined, { staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false });
  const availableStores = useMemo<門市[]>(() => { const source = role === "管理員" && storesQuery.data !== undefined ? storesQuery.data.map(store => ({ 編號: store.id, 門市代號: store.storeCode, 名稱: store.name, 地址: store.address })) : stores; const normalized = 正規化門市資料(source); return 取得角色可見門市(role, normalized, normalized); }, [role, stores, storesQuery.data]);
  const [active, setActive] = useState<模組>("總覽");
  const [items, setItems] = useState<品項[]>(() => 讀取安全品項());
  const 有效品項 = 依貨品代號排序(items.length ? items : (inventoryItemsQuery.data ?? []).map(item => ({ 編號: item.id, 貨品代號: item.materialCode, 名稱: item.name, 單價: Number(item.unitPrice) || 0, 大值單位: item.largeUnit || "箱", 小值單位: item.smallUnit || "包", 換算比例: Number(item.conversionRatio) || 1, 庫存: 0, 低庫存門檻: 0 })));
  const [records, setRecords] = useState<異動[]>(() => 讀取安全異動());
  const [auditLogs, setAuditLogs] = useState<稽核[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>(() => role === "管理員" ? availableStores.map(store => store.編號) : availableStores.slice(0, 1).map(store => store.編號));
  const [operationStoreId, setOperationStoreId] = useState<number | "">(() => availableStores[0]?.編號 ?? "");
  const formTemplatesForStoreQuery = trpc.inventory.listFormTemplatesForStore.useQuery({ 門市編號: Number(operationStoreId) }, { enabled: typeof operationStoreId === "number" && operationStoreId > 0, staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false });
  useEffect(() => {
    const allowed = role === "管理員" ? availableStores.map(store => store.編號) : availableStores.slice(0, 1).map(store => store.編號);
    setSelectedStoreIds(previous => role === "管理員" ? (previous.length ? previous.filter(id => allowed.includes(id)) : allowed) : allowed);
    setOperationStoreId(previous => allowed.includes(Number(previous)) ? previous : (allowed[0] ?? ""));
  }, [role, availableStores]);
  const operationStore = availableStores.find(store => store.編號 === Number(operationStoreId));
  const formTemplatesForStore = (formTemplatesForStoreQuery.data ?? []) as 預設表單[];
  const [showForm, setShowForm] = useState(false); const [showMobileScrollHint, setShowMobileScrollHint] = useState(true); const mobileTableDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null); const handleMobileTableScroll = (event: React.UIEvent<HTMLDivElement>) => { const element = event.currentTarget; setShowMobileScrollHint(element.scrollWidth - element.clientWidth > 4 && element.scrollLeft + element.clientWidth < element.scrollWidth - 4); }; const handleMobileTablePointerDown = (event: React.PointerEvent<HTMLDivElement>) => { if (event.pointerType === "mouse" && event.button !== 0) return; const element = event.currentTarget; mobileTableDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: element.scrollLeft }; element.setPointerCapture?.(event.pointerId); }; const handleMobileTablePointerMove = (event: React.PointerEvent<HTMLDivElement>) => { const drag = mobileTableDragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const element = event.currentTarget; const deltaX = event.clientX - drag.startX; if (Math.abs(deltaX) > 3) { event.preventDefault(); element.scrollLeft = drag.startScrollLeft - deltaX; } }; const clearMobileTablePointer = (event: React.PointerEvent<HTMLDivElement>) => { const drag = mobileTableDragRef.current; if (drag?.pointerId === event.pointerId) { mobileTableDragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); } }; const [newFormDirty, setNewFormDirty] = useState(false);
  const [showNewFormBackConfirm, setShowNewFormBackConfirm] = useState(false);
  const [formType, setFormType] = useState("進貨");
  const [formDate, setFormDate] = useState(today);
  const [formItem, setFormItem] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formNote, setFormNote] = useState("");
  const [formLines, setFormLines] = useState<表單行[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("未套用預設表單");
  const [templateDifference, setTemplateDifference] = useState<string[]>([]);
  const [editingRecord, setEditingRecord] = useState<異動 | null>(null);
  const [viewingRecord, setViewingRecord] = useState<異動 | null>(null);
  const [query, setQuery] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState(today);
  const [countedToday, setCountedToday] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ 貨品代號: "", 名稱: "", 單價: "", 大值單位: "箱", 小值單位: "包", 換算比例: "20", 初始庫存: "0", 低庫存門檻: "0" });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchText, setBatchText] = useState("貨品代號,品項名稱,進貨單價,大值單位,小值單位,換算比例,初始庫存,低庫存門檻\n");
  const [employeeList, setEmployeeList] = useState<員工[]>(() => JSON.parse(localStorage.getItem("食包材員工") || "[]"));
  const [newEmployee, setNewEmployee] = useState({ 工號: "", 姓名: "", 角色: "一般員工" as 角色 });
  const [permissions, setPermissions] = useState<權限設定[]>([]);
  const snapshotInput = useMemo(() => ({ 工號: employee }), [employee]);
  const snapshotQuery = trpc.inventory.loadSnapshot.useQuery(snapshotInput, { staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false });
  const employeePermissionsQuery = trpc.employee.permissions.useQuery(snapshotInput, { staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false });
  const snapshotStatusQuery = trpc.inventory.getSnapshotStatus.useQuery(snapshotInput, { staleTime: 0, refetchInterval: 8000, refetchOnWindowFocus: true });
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false);
  const [snapshotConflict, setSnapshotConflict] = useState(false);
  const saveSnapshot = trpc.inventory.saveSnapshot.useMutation({ onSuccess: result => { snapshotVersionRef.current = Math.max(snapshotVersionRef.current, result.latestVersion ?? 0); if (result.conflict) { setSnapshotConflict(true); toast.error("共用資料已被其他使用者更新，為避免覆寫，請重新載入最新資料"); } }, onError: error => toast.error(error.message || "共用資料保存失敗") });
  const hydrated = useRef(false);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const skipInitialSnapshotSave = useRef(true);
  const latestSnapshotRef = useRef({ items, records, auditLogs, employeeList, permissions });
  const snapshotTimerRef = useRef<number | null>(null);
  const snapshotVersionRef = useRef(0);
  latestSnapshotRef.current = { items, records, auditLogs, employeeList, permissions };
  useEffect(() => {
    const canHydrate = canHydrateSnapshot({ isLoading: snapshotQuery.isLoading, isFetching: snapshotQuery.isFetching, isError: snapshotQuery.isError, hydrated: hydrated.current });
    const canMergeDatabaseItems = hydrated.current && !inventoryItemsQuery.isLoading && !inventoryItemsQuery.isFetching && !inventoryItemsQuery.isError && Array.isArray(inventoryItemsQuery.data);
    if (!canHydrate && !canMergeDatabaseItems) return;
    const data = snapshotQuery.data;
    snapshotVersionRef.current = data ? Number((data as any).版本) || 0 : 0;
    if (data) {
      const snapshotItems = Array.isArray(data.品項) ? data.品項.filter((item: any) => item && typeof item.名稱 === "string" && item.名稱.trim()) : [];
      const databaseItems = inventoryItemsQuery.data ?? [];
      const findDatabaseItem = (item: any) => databaseItems.find(candidate => candidate.id === Number(item?.編號) || candidate.name === item?.名稱 || candidate.materialCode === item?.貨品代號);
      const snapshotById = new Map(snapshotItems.map((item: any) => { const dbItem = findDatabaseItem(item); return [dbItem?.id ?? Number(item.編號), item]; }));
      const mergedItems = databaseItems.map((databaseItem, index) => { const snapshotItem = snapshotById.get(databaseItem.id) ?? snapshotItems.find((item: any) => item.名稱 === databaseItem.name || item.貨品代號 === databaseItem.materialCode); return { 編號: databaseItem.id, 貨品代號: databaseItem.materialCode, 名稱: databaseItem.name, 單價: Number(snapshotItem?.單價 ?? databaseItem.unitPrice) || 0, 大值單位: snapshotItem?.大值單位 || databaseItem.largeUnit || "箱", 小值單位: snapshotItem?.小值單位 || databaseItem.smallUnit || "包", 換算比例: Number(snapshotItem?.換算比例 ?? databaseItem.conversionRatio) || 1, 庫存: Number(snapshotItem?.庫存) || 0, 低庫存門檻: Number(snapshotItem?.低庫存門檻) || 0 }; });
      const legacyItems = snapshotItems.filter((item: any) => !findDatabaseItem(item)).map((item: any, index: number) => ({ 編號: Number(item.編號) || undefined, 貨品代號: /^[A-Z]\d{6}$/.test(String(item.貨品代號 || "")) ? String(item.貨品代號).toUpperCase() : `A${String(databaseItems.length + index + 1).padStart(6, "0")}`, 名稱: item.名稱, 單價: Number(item.單價) || 0, 大值單位: item.大值單位 || "箱", 小值單位: item.小值單位 || "包", 換算比例: Number(item.換算比例) || 1, 庫存: Number(item.庫存) || 0, 低庫存門檻: Number(item.低庫存門檻) || 0 }));
      setItems([...mergedItems, ...legacyItems]);
      if (Array.isArray(data.異動)) setRecords(data.異動 as 異動[]);
      if (Array.isArray(data.操作稽核)) setAuditLogs(data.操作稽核 as 稽核[]);
      if (Array.isArray(data.員工)) setEmployeeList(data.員工 as 員工[]);
      if (Array.isArray(data.權限)) setPermissions(正規化權限資料(data.權限 as Array<Record<string, unknown>>, role) as 權限設定[]);
      setCountedToday(Array.isArray(data.異動) && data.異動.some((record) => (record as 異動).類型 === "每日盤點" && (record as 異動).日期 === today));
    } else {
      const databaseItems = inventoryItemsQuery.data ?? [];
      setItems(databaseItems.map(item => ({ 編號: item.id, 貨品代號: item.materialCode, 名稱: item.name, 單價: Number(item.unitPrice) || 0, 大值單位: item.largeUnit || "箱", 小值單位: item.smallUnit || "包", 換算比例: Number(item.conversionRatio) || 1, 庫存: 0, 低庫存門檻: 0 })));
      setRecords([]);
      setAuditLogs([]);
      setEmployeeList([]);
      setPermissions([]);
      setCountedToday(false);
    }
    hydrated.current = true;
    setSnapshotReady(true);
  }, [snapshotQuery.data, snapshotQuery.isLoading, snapshotQuery.isFetching, snapshotQuery.isError, inventoryItemsQuery.data]);
  useEffect(() => { localStorage.setItem("食包材品項", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("食包材異動", JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem("食包材操作稽核", JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => {
    const rows = employeePermissionsQuery.data;
    if (!Array.isArray(rows)) return;
    const normalized = 正規化權限資料(rows as Array<Record<string, unknown>>, role) as 權限設定[];
    setPermissions(normalized);
    localStorage.setItem("食包材權限", JSON.stringify(normalized));
  }, [employeePermissionsQuery.data, role]);
  useEffect(() => { const saved = localStorage.getItem("食包材權限"); setPermissions(current => current.length ? current : (saved ? JSON.parse(saved) : ["進貨單", "退貨單", "報廢單", "每日盤點", "查詢報表"].map(模組 => ({ 模組, 新增: true, 修改: true, 刪除: false })))); }, []);
  useEffect(() => {
    const remoteVersion = Number(snapshotStatusQuery.data?.版本 ?? 0);
    if (hydrated.current && remoteVersion > snapshotVersionRef.current) setRemoteUpdateAvailable(true);
  }, [snapshotStatusQuery.data?.版本]);
  useEffect(() => {
    if (!hydrated.current || snapshotConflict) return;
    if (skipInitialSnapshotSave.current) { skipInitialSnapshotSave.current = false; return; }
    const timer = window.setTimeout(() => { snapshotTimerRef.current = null; const latest = latestSnapshotRef.current; const 版本 = ++snapshotVersionRef.current; saveSnapshot.mutate({ 工號: employee, payload: { 品項: latest.items, 異動: latest.records, 操作稽核: latest.auditLogs, 員工: latest.employeeList, 權限: latest.permissions, 版本 } }); }, 250); snapshotTimerRef.current = timer;
    return () => { window.clearTimeout(timer); if (snapshotTimerRef.current === timer) snapshotTimerRef.current = null; };
  }, [employee, items, records, auditLogs, employeeList, permissions]);

  const 重新載入共用資料 = () => { window.location.reload(); };
  const appendAudit = (動作: string, 內容: string, 異動前?: unknown, 異動後?: unknown) => { const entry = { id: Date.now(), 動作, 操作人: `${employeeName}（${employee}）`, 操作時間: new Date().toISOString(), 門市編號: operationStore?.編號, 門市名稱: operationStore?.名稱, 內容, 異動前: 異動前 === undefined ? undefined : JSON.stringify(異動前), 異動後: 異動後 === undefined ? undefined : JSON.stringify(異動後) }; setAuditLogs(prev => [entry, ...prev]); return entry; };
  const currentPermission = 取得模組權限(permissions, active);
  const canCreate = snapshotReady && 有操作權限(role, currentPermission, "新增");
  const canModify = snapshotReady && 有操作權限(role, currentPermission, "修改");
  const canDelete = snapshotReady && 有操作權限(role, currentPermission, "刪除");
  const canCreateForType = (type: string) => snapshotReady && 有操作權限(role, 取得模組權限(permissions, 取得工作頁權限模組(type)), "新增");
  const canModifyForType = (type: string) => snapshotReady && 有操作權限(role, 取得模組權限(permissions, 取得工作頁權限模組(type)), "修改");
  const recordMatchesStore = (record: 異動) => 篩選可見門市紀錄([record], role, selectedStoreIds, availableStores.length).length > 0;
  const visibleOperatorOptions = useMemo(() => Array.from(new Set(records.filter(recordMatchesStore).map(record => record.操作人).filter((operator): operator is string => Boolean(operator)))).sort((a, b) => a.localeCompare(b, "zh-Hant")), [records, role, selectedStoreIds, availableStores]);
  const filteredRecords = useMemo(() => records.filter(r => recordMatchesStore(r) && (!query || r.品項.includes(query) || r.類型.includes(query)) && (!operatorFilter || r.操作人 === operatorFilter) && r.日期 >= startDate && r.日期 <= endDate), [records, query, operatorFilter, startDate, endDate, role, selectedStoreIds, availableStores]);
  const countedTodayForStore = useMemo(() => 是否已完成門市盤點(records, today, operationStoreId), [records, operationStoreId]);
  const usage = useMemo(() => items.map(item => ({ ...item, 使用量: records.filter(r => recordMatchesStore(r) && r.品項 === item.名稱 && r.類型 === "每日盤點").reduce((s, r) => s + (r.使用量 ?? 0), 0) })), [items, records, role, selectedStoreIds, availableStores]);

  const templatesForType = (type: string) => { const templateType = ({ 進貨: "purchase", 退貨: "return", 報廢: "scrap", 每日盤點: "count" } as Record<string, string>)[type]; const source = formTemplatesForStore.length ? formTemplatesForStore : ((formTemplatesQuery.data ?? []) as 預設表單[]); return source.filter(template => template.type === templateType); };
  const templateEntries = (template?: 預設表單) => { if (!template?.itemIds) return []; try { const parsed = JSON.parse(template.itemIds); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  const templatesWithItems = (type: string) => templatesForType(type).filter(template => templateEntries(template).length > 0);
  const getTemplateItems = (type: string, templateId?: string) => { const candidates = templatesWithItems(type).length ? templatesWithItems(type) : templatesForType(type); const databaseTemplate = candidates.find(template => String(template.id) === String(templateId)) ?? candidates[0]; const saved = databaseTemplate?.itemIds || localStorage.getItem("食包材預設表單_" + type); if (!saved) return 有效品項.map(item => ({ item, 預設輸入單位: item.大值單位 })); try { const parsed = typeof saved === "string" ? JSON.parse(saved) : saved; const entries = Array.isArray(parsed) ? parsed : []; const databaseItems = inventoryItemsQuery.data ?? []; const matched = entries.map(entry => { const objectEntry = typeof entry === "object" && entry !== null ? entry as any : {}; const entryId = Number(typeof entry === "number" ? entry : objectEntry.品項編號 ?? objectEntry.itemId ?? objectEntry.id); const databaseItem = databaseItems.find(candidate => (Number.isFinite(entryId) && Number(candidate.id) === entryId) || (objectEntry.貨品代號 && candidate.materialCode === objectEntry.貨品代號) || (objectEntry.品項名稱 && candidate.name === objectEntry.品項名稱)); const item = 有效品項.find(candidate => (databaseItem && ((candidate.編號 !== undefined && Number(candidate.編號) === Number(databaseItem.id)) || candidate.貨品代號 === databaseItem.materialCode || candidate.名稱 === databaseItem.name)) || (Number.isFinite(entryId) && candidate.編號 !== undefined && Number(candidate.編號) === entryId) || candidate.貨品代號 === objectEntry.貨品代號 || candidate.名稱 === (objectEntry.品項名稱 || (typeof entry === "string" ? entry : ""))); if (!item) return null; return { item, 預設輸入單位: objectEntry.預設單位 || objectEntry.預設輸入單位 || objectEntry.defaultUnit || item.大值單位 }; }).filter(Boolean) as Array<{ item: 品項; 預設輸入單位: string }>; return matched; } catch { return []; } };
  const draftKey = (type: string) => "食包材單據草稿_" + employee + "_" + operationStoreId + "_" + type;
  const applyTemplate = (type: string, templateId: string) => { const template = templatesForType(type).find(candidate => String(candidate.id) === String(templateId)) ?? templatesWithItems(type)[0]; const resolved = getTemplateItems(type, template ? String(template.id) : templateId); const entries = templateEntries(template); const resolvedNames = new Set(resolved.map(({ item }) => item.名稱)); const missing = entries.map(entry => { const objectEntry = typeof entry === "object" && entry !== null ? entry as any : {}; return objectEntry.品項名稱 || objectEntry.貨品代號 || String(objectEntry.品項編號 ?? entry); }).filter(label => !resolvedNames.has(String(label))); setTemplateDifference(missing.map(label => `未對應：${label}`)); setSelectedTemplateId(template ? String(template.id) : ""); setSelectedTemplateName(template?.name || "未套用預設表單"); setFormLines(resolved.map(({ item, 預設輸入單位 }) => ({ 品項: item.名稱, 品項編號: item.編號, 數量: "", 預設輸入單位, ...(type === "進貨" ? { 單價: String(item.單價) } : {}) }))); };
  const openForm = (type: string) => { setEditingRecord(null); setViewingRecord(null); setFormType(type); const draft = localStorage.getItem(draftKey(type)); if (draft) { try { const parsed = JSON.parse(draft); setFormDate(parsed.formDate || today); setFormNote(parsed.formNote || ""); const draftLines = Array.isArray(parsed.formLines) ? parsed.formLines : []; if (draftLines.length) { setSelectedTemplateId(parsed.selectedTemplateId || ""); setSelectedTemplateName(parsed.selectedTemplateName || "未套用預設表單"); setFormLines(draftLines); } else { const firstTemplate = parsed.selectedTemplateId || templatesWithItems(type)[0]?.id || templatesForType(type)[0]?.id; applyTemplate(type, firstTemplate ? String(firstTemplate) : ""); } } catch { setFormDate(today); applyTemplate(type, ""); } } else { setFormDate(today); setFormNote(""); const first = templatesWithItems(type)[0] || templatesForType(type)[0]; applyTemplate(type, first ? String(first.id) : ""); } setFormQty("1"); setNewFormDirty(false); setShowNewFormBackConfirm(false); setShowForm(true); };
  useEffect(() => { if (!showForm || editingRecord || viewingRecord || !formType || formLines.length > 0) return; const first = templatesWithItems(formType)[0] || templatesForType(formType)[0]; if (first) applyTemplate(formType, String(first.id)); }, [showForm, editingRecord, viewingRecord, formType, formLines.length, formTemplatesForStoreQuery.data, formTemplatesQuery.data, inventoryItemsQuery.data, items.length]);
  useEffect(() => { if (!showForm || editingRecord || !formType) return; localStorage.setItem(draftKey(formType), JSON.stringify({ formDate, formNote, formLines, selectedTemplateId, selectedTemplateName })); }, [showForm, editingRecord, formType, formDate, formNote, formLines, selectedTemplateId, selectedTemplateName, operationStoreId, employee]);
  const openEdit = (record: 異動) => { setViewingRecord(null); setEditingRecord(record); setFormType(record.類型); setFormDate(record.日期); setFormNote(record.備註); setFormLines(items.map(i => ({ 品項: i.名稱, 數量: i.名稱 === record.品項 ? String(record.數量) : "", 預設輸入單位: i.大值單位, ...(record.類型 === "進貨" ? { 單價: i.名稱 === record.品項 ? String(record.單價 ?? i.單價) : String(i.單價) } : {}) }))); setShowForm(true); };
  const removeRecord = (record: 異動) => {
    if (record.類型 === "每日盤點") {
      toast.error("每日盤點紀錄不可刪除，以維持每日限定一次規則");
      return;
    }
    const sameGroup = (candidate: 異動) => candidate.日期 === record.日期 && candidate.類型 === record.類型 && (candidate.門市編號 ?? undefined) === (record.門市編號 ?? undefined);
    const groupedRecords = records.filter(sameGroup);
    const groupedByItem = new Map<string, number>();
    const previousItems = items;
    groupedRecords.forEach(candidate => groupedByItem.set(candidate.品項, (groupedByItem.get(candidate.品項) ?? 0) + Number(candidate.數量 || 0)));
    setItems(previous => previous.map(item => {
      const quantity = groupedByItem.get(item.名稱);
      if (quantity === undefined) return item;
      const delta = record.類型 === "進貨" ? -quantity : quantity;
      return { ...item, 庫存: Math.max(0, item.庫存 + delta) };
    }));
    setRecords(previous => previous.filter(candidate => !sameGroup(candidate)));
    appendAudit("全部刪除異動", "全部刪除" + record.類型 + "：" + record.日期 + "／" + (record.門市名稱 || "未設定門市") + "／" + groupedRecords.length + "筆", groupedRecords, groupedRecords);
    const downloadDeleteSummary = () => {
      const rows = [
        ["刪除結果稽核摘要"],
        ["日期", record.日期],
        ["門市", record.門市名稱 || "未設定門市"],
        ["作業類型", record.類型],
        ["刪除筆數", String(groupedRecords.length)],
        ["品項", "數量", "單位", "操作人"],
        ...groupedRecords.map(candidate => [candidate.品項, String(candidate.數量), candidate.單位, candidate.操作人 || employee]),
      ];
      const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\\n");
      const blob = new Blob(["\\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `刪除稽核摘要_${record.日期}_${record.類型}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };
    const restoreDeletedRecords = () => {
      setItems(previousItems);
      setRecords(current => [...current, ...groupedRecords].sort((a, b) => b.日期.localeCompare(a.日期) || b.id - a.id));
      appendAudit("復原刪除異動", `復原${record.類型}：${record.日期}／${record.門市名稱 || "未設定門市"}／${groupedRecords.length}筆`, groupedRecords, groupedRecords);
      toast.success("已復原刪除", 取得刪除成功Toast設定());
    };
    toast.custom(id => <刪除成功Toast內容 id={id} 筆數={groupedRecords.length} 類型={record.類型} 可下載摘要={canDelete} onRestore={restoreDeletedRecords} onDownload={downloadDeleteSummary} />, 取得刪除成功Toast設定());
  };
  const saveBatchRecords = (next: 異動[], previous: 異動[]) => { const previousById = new Map(previous.map(record => [record.id, record])); const failedItems: string[] = []; const validNext = next.filter(record => { const result = 驗證數量輸入(String(record.數量)); if (!result.valid) { failedItems.push(record.品項); return false; } return true; }); setItems(currentItems => currentItems.map(item => { let inventory = item.庫存; validNext.forEach(record => { const old = previousById.get(record.id); if (!old || old.品項 !== item.名稱) return; if (record.類型 === "每日盤點") inventory = record.數量; else { const oldDelta = old.類型 === "進貨" ? old.數量 : -old.數量; const nextDelta = record.類型 === "進貨" ? record.數量 : -record.數量; inventory = Math.max(0, inventory - oldDelta + nextDelta); } }); return { ...item, 庫存: inventory }; })); setRecords(current => current.map(record => validNext.find(updated => updated.id === record.id) ?? record)); validNext.forEach(record => { const old = previousById.get(record.id); if (old && old.數量 !== record.數量) appendAudit("批次修改異動", `修改${record.類型}：${record.品項} ${old.數量}→${record.數量} ${record.單位}`, old, record); }); return { 成功筆數: validNext.length, 失敗筆數: failedItems.length, 失敗品項: failedItems }; };
  const submitRecord = () => {
    if (!operationStore) { toast.error("請先設定可用門市"); return; }
    if (editingRecord) { const line = formLines.find(x => x.品項 === editingRecord.品項); const rawQuantity = line?.數量 ?? ""; const validation = 驗證數量輸入(rawQuantity); if (!validation.valid) { toast.error(rawQuantity.trim() === "" ? "請輸入數量；空白不代表零" : validation.message); return; } const qty = Number(rawQuantity); setItems(prev => prev.map(item => { if (item.名稱 !== editingRecord.品項) return item; if (editingRecord.類型 === "每日盤點") return { ...item, 庫存: qty }; const oldDelta = editingRecord.類型 === "進貨" ? editingRecord.數量 : -editingRecord.數量; const nextDelta = editingRecord.類型 === "進貨" ? qty : -qty; return { ...item, 庫存: Math.max(0, item.庫存 - oldDelta + nextDelta) }; })); const linePrice = editingRecord.類型 === "進貨" ? Number(line?.單價 ?? editingRecord.單價 ?? 0) : undefined; const updatedRecord = { ...editingRecord, 日期: formDate, 數量: qty, ...(editingRecord.類型 === "進貨" ? { 單價: linePrice, 小計: Number((linePrice! * qty).toFixed(2)) } : {}), 備註: formNote, 操作人: `${employeeName}（${employee}）`, 操作時間: new Date().toLocaleString("zh-TW") }; setRecords(prev => prev.map(r => r.id === editingRecord.id ? updatedRecord : r)); appendAudit("修改異動", `修改${editingRecord.類型}：${editingRecord.品項}`, editingRecord, updatedRecord); setEditingRecord(null); localStorage.removeItem(draftKey(formType)); setShowForm(false); toast.success("儲存成功", 取得儲存成功Toast設定("紀錄已修改")); return; }
    if (formType === "每日盤點" && (countedToday || 是否已完成門市盤點(records, formDate, operationStoreId))) { toast.error("此門市今日已完成盤點，每日每間門市限定只能提交一次"); return; }
    const entered = formLines.filter(line => line.數量.trim() !== "");
    if (!entered.length) { toast.error("請至少輸入一項品項數量；空白不代表零"); return; } const invalidLine = entered.find(line => !驗證數量輸入(line.數量).valid); if (invalidLine) { toast.error(`${invalidLine.品項}的數量格式不正確`); return; }
    const nextRecords: 異動[] = [];
    setItems(prev => prev.map(item => { const line = entered.find(x => x.品項 === item.名稱); if (!line) return item; const qty = Number(line.數量); const delta = formType === "進貨" ? qty : formType === "每日盤點" ? 0 : -qty; nextRecords.push({ id: Date.now() + nextRecords.length, 類型: formType, 日期: formDate, 品項: item.名稱, 數量: qty, 單位: line.預設輸入單位 || item.大值單位, ...(formType === "進貨" ? { 單價: Number(line.單價 ?? item.單價), 小計: 計算進貨小計(Number(line.單價 ?? item.單價), qty) } : {}), 門市編號: operationStore.編號, 門市名稱: operationStore.名稱, 使用量: formType === "每日盤點" ? Math.max(0, item.庫存 - qty) : undefined, 備註: formNote || (formType === "每日盤點" ? `盤點 ${qty * item.換算比例} ${item.小值單位}；使用量 ${Math.max(0, item.庫存 - qty)} ${item.大值單位}` : ""), 操作人: `${employeeName}（${employee}）`, 操作時間: new Date().toLocaleString("zh-TW") }); return { ...item, 庫存: Math.max(0, item.庫存 + delta) }; }));
    setRecords(prev => [...nextRecords, ...prev]);
    nextRecords.forEach(record => appendAudit("新增異動", `新增${record.類型}：${record.品項} ${record.數量} ${record.單位}`, undefined, record));
    if (formType === "每日盤點") setCountedToday(true);
    localStorage.removeItem(draftKey(formType)); setShowForm(false); toast.success("儲存成功", 取得儲存成功Toast設定(`${formType}已新增 ${entered.length} 項`));
  };
  const exportUsagePdf = async () => { const rows = 建立食包材用量報表(records, items, selectedStoreIds, startDate, endDate); if (!rows.length) { toast.error("目前篩選日期內沒有每日盤點資料，無法產生食包材用量報表"); return; } const storeLabel = role === "管理員" && selectedStoreIds.length !== 1 ? "全部門市" : (availableStores.find(store => selectedStoreIds.includes(store.編號))?.名稱 || "門市"); const 製表人 = `${employeeName}（${employee}）`; const 列印時間 = new Date().toLocaleString("zh-TW"); try { await 下載食包材用量報表PDF(rows, { startDate, endDate, storeLabel, 製表人, 列印時間 }); toast.success(`食包材用量報表已下載，共 ${rows.length} 列`); } catch (error) { console.error(error); toast.error("食包材用量報表下載失敗，請稍後再試"); } };
  const exportOperationPdf = async (type: "進貨" | "退貨" | "報廢" | "每日盤點") => {
    const reportNames: Record<typeof type, string> = { 進貨: "進貨單", 退貨: "退貨單", 報廢: "報廢單紀錄", 每日盤點: "每日盤點記錄" };
    const rows: 作業紀錄PDF列[] = filteredRecords.filter(record => record.類型 === type).map(record => {
      const item = items.find(candidate => candidate.名稱 === record.品項);
      const unitPrice = Number(record.單價 ?? item?.單價 ?? 0);
      const quantity = Number(record.數量 ?? 0);
      return { 日期: record.日期, 貨品代號: item?.貨品代號 ?? "—", 品項名稱: record.品項, 單價: unitPrice, 單位: record.單位 || item?.大值單位 || "—", 數量: quantity, 小計: Number(record.小計 ?? unitPrice * quantity), 操作人: record.操作人 || "—", 操作時間: record.操作時間 || "—" };
    });
    if (!rows.length) { toast.error(`目前篩選條件沒有${reportNames[type]}資料，無法產生 PDF`); return; }
    const storeLabel = role === "管理員" && selectedStoreIds.length !== 1 ? "全部門市" : (availableStores.find(store => selectedStoreIds.includes(store.編號))?.名稱 || "門市");
    const 製表人 = `${employeeName}（${employee}）`;
    const 列印時間 = new Date().toLocaleString("zh-TW");
    try {
      await 下載作業紀錄PDF(rows, { 報表名稱: reportNames[type], 門市名稱: storeLabel, 開始日期: startDate, 結束日期: endDate, 製表人, 列印時間, 檔名前綴: reportNames[type] });
      toast.success(`${reportNames[type]} PDF 已下載，共 ${rows.length} 筆`);
    } catch (error) { console.error(error); toast.error(`${reportNames[type]} PDF 下載失敗，請稍後再試`); }
  };
  const exportCsv = (format: "csv" | "excel" = exportFormat) => { const headers = ["日期", "類型", "貨品代號", "品項名稱", "大值進貨單價", "大值庫存數量", "單位", "小計", "備註", "操作人", "操作時間"]; const rows = filteredRecords.map(r => { const item = items.find(item => item.名稱 === r.品項); const unitPrice = Number(item?.單價 ?? 0); const quantity = Number(r.數量 ?? 0); const subtotal = unitPrice * quantity; return [r.日期, r.類型, item?.貨品代號 || "", r.品項, unitPrice.toFixed(2), quantity, r.單位 || item?.大值單位 || "", subtotal.toFixed(2), r.備註 || "", r.操作人 || "—", r.操作時間 || "—"]; }); const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; const separator = format === "excel" ? "\t" : ","; const content = [headers, ...rows].map(row => row.map(quote).join(separator)).join("\n"); const storeLabel = role === "管理員" && selectedStoreIds.length !== 1 ? "全部門市" : (availableStores.find(store => selectedStoreIds.includes(store.編號))?.名稱 || "門市"); const filename = `食包材庫存報表_${storeLabel}_${startDate}至${endDate}.${format === "excel" ? "xls" : "csv"}`; const blob = new Blob(["\ufeff" + content], { type: format === "excel" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); setShowExportPreview(false); toast.success(`報表已下載，共 ${filteredRecords.length} 筆`); };
  const addItem = () => { if (editingItem ? !canModify : !canCreate) return toast.error("目前工號沒有此品項操作權限"); if (!/^[A-Z]\d{6}$/.test(newItem.貨品代號.trim().toUpperCase()) || !newItem.名稱 || !newItem.單價) return toast.error("請完整填寫貨品代號、品項名稱與單價"); const updated: 品項 = { 貨品代號: newItem.貨品代號.trim().toUpperCase(), 名稱: newItem.名稱, 單價: Number(newItem.單價), 大值單位: newItem.大值單位, 小值單位: newItem.小值單位, 換算比例: Number(newItem.換算比例) || 1, 庫存: Number(newItem.初始庫存) || 0, 低庫存門檻: Number(newItem.低庫存門檻) || 0 }; const previous = editingItem ? items.find(item => item.名稱 === editingItem) : undefined; if (editingItem && !previous) return toast.error("找不到要修改的品項"); if (!editingItem && items.some(item => item.名稱 === newItem.名稱)) return toast.error("品項名稱已存在"); const nextItems = editingItem ? items.map(item => item.名稱 === editingItem ? { ...updated, 庫存: previous?.庫存 ?? updated.庫存 } : item) : [...items, updated]; if (snapshotTimerRef.current !== null) { window.clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; } setItems(nextItems); const auditEntry = appendAudit(editingItem ? "修改品項" : "新增品項", `${editingItem ? "修改" : "新增"}品項：${newItem.名稱}`, previous, nextItems.find(item => item.名稱 === newItem.名稱)); const 版本 = ++snapshotVersionRef.current; saveSnapshot.mutate({ 工號: employee, payload: { 品項: nextItems, 異動: records, 操作稽核: [auditEntry, ...auditLogs], 員工: employeeList, 權限: permissions, 版本 } }); setShowItemForm(false); setEditingItem(null); setNewItem({ 貨品代號: "", 名稱: "", 單價: "", 大值單位: "箱", 小值單位: "包", 換算比例: "20", 初始庫存: "0", 低庫存門檻: "0" }); toast.success(editingItem ? "品項已修改" : "品項已新增"); };
  const importBatch = () => { if (!canCreate) return toast.error("目前工號沒有新增品項權限"); const result = 解析批次品項(batchText, items.map(item => item.名稱)); if (result.error) return toast.error(result.error); const parsed = result.data as 品項[]; const nextItems = [...items, ...parsed]; if (snapshotTimerRef.current !== null) { window.clearTimeout(snapshotTimerRef.current); snapshotTimerRef.current = null; } setItems(nextItems); const auditEntry = appendAudit("批次匯入", `批次匯入 ${parsed.length} 項品項`, undefined, parsed); const 版本 = ++snapshotVersionRef.current; saveSnapshot.mutate({ 工號: employee, payload: { 品項: nextItems, 異動: records, 操作稽核: [auditEntry, ...auditLogs], 員工: employeeList, 權限: permissions, 版本 } }); setShowBatchForm(false); setBatchText("貨品代號,品項名稱,進貨單價,大值單位,小值單位,換算比例,初始庫存,低庫存門檻\\n"); toast.success(`已匯入 ${parsed.length} 項品項`); };
  const addEmployee = () => { if (!newEmployee.工號 || !newEmployee.姓名) return toast.error("請完整填寫員工資料"); if (employeeList.some(x => x.工號 === newEmployee.工號)) return toast.error("員工工號已存在"); const next = [...employeeList, { ...newEmployee, 啟用: true }]; setEmployeeList(next); localStorage.setItem("食包材員工", JSON.stringify(next)); setNewEmployee({ 工號: "", 姓名: "", 角色: "一般員工" }); toast.success("員工已新增"); };

  const nav = [{ label: "總覽", icon: LayoutDashboard }, { label: "進貨單", icon: Truck }, { label: "退貨單", icon: FileOutput }, { label: "報廢單", icon: Trash2 }, { label: "每日盤點", icon: ClipboardCheck }, { label: "查詢報表", icon: BarChart3 }, ...(role === "管理員" ? [{ label: "後台管理", icon: Settings }] : [])] as { label: 模組; icon: any }[];
  return <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-[#f7f3ed] text-[#3e2a1f]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[#e8ddd1] bg-[#fffdf9] lg:block"><div className="flex h-20 items-center gap-3 border-b border-[#eee4da] px-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#70452d] font-semibold text-[#faebd8]">顏</div><div><p className="font-semibold">食包材庫存</p><p className="text-xs text-[#a28672]">作業管理平台</p></div></div><nav className="space-y-1 p-4">{nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActive(label)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${active === label ? "bg-[#f1e4d5] font-semibold text-[#70452d]" : "text-[#866e5c] hover:bg-[#faf3eb]"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav><div className="absolute bottom-0 w-full border-t border-[#eee4da] p-4"><div className="mb-3 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#e9d4bd] text-sm font-semibold text-[#70452d]">{employee.slice(-2)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{employeeName}</p><p className="text-xs text-[#a28672]">{employee} · {role}</p></div></div><Button variant="outline" onClick={onLogout} className="w-full rounded-lg border-[#e3d4c5] text-[#806653]">登出系統</Button></div></aside><main className="min-w-0 max-w-full overflow-x-hidden lg:pl-64"><div className="flex gap-2 overflow-x-auto border-b border-[#e8ddd1] bg-[#fffdf9] px-4 py-3 lg:hidden">{nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActive(label)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs ${active === label ? "bg-[#f1e4d5] font-semibold text-[#70452d]" : "text-[#866e5c]"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div><header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#e8ddd1] bg-[#f7f3ed]/90 px-6 backdrop-blur"><div><p className="text-xs tracking-[.25em] text-[#a28672]">食包材庫存管理系統</p><h1 className="mt-1 text-2xl font-semibold text-[#3e2a1f]">{active}</h1></div><div className="flex items-center gap-3"><Badge className="border border-[#ddc5ac] bg-[#f6eadc] text-[#70452d]">{role}</Badge><span className="text-sm text-[#806653]">{employee} · {employeeName}</span><Button variant="outline" size="sm" onClick={onLogout} className="rounded-lg border-[#e3d4c5] text-[#70452d]">登出</Button></div></header><div className={`p-5 md:p-8 ${showForm && !editingRecord && !viewingRecord ? "hidden" : ""}`}>{(remoteUpdateAvailable || snapshotConflict) && <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#e3b58f] bg-[#fff4e5] p-4 text-sm text-[#70452d] md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{snapshotConflict ? "共用資料保存衝突" : "共用資料已有新變更"}</p><p className="mt-1 text-[#806653]">{snapshotConflict ? "其他使用者已先保存相同資料，為避免覆寫目前內容，請載入最新版本。" : "其他使用者已更新庫存或工作頁紀錄，請載入最新版本查看。"}</p></div><Button onClick={重新載入共用資料} className="shrink-0 bg-[#70452d] hover:bg-[#5b3724]">重新載入最新資料</Button></div>}{active === "總覽" && <Overview items={依貨品代號排序(items)} records={records} usage={依貨品代號排序(usage)} openForm={openForm} canCreateForType={canCreateForType} stores={availableStores} role={role} selectedStoreIds={selectedStoreIds} setSelectedStoreIds={setSelectedStoreIds} />}{["進貨單", "退貨單", "報廢單", "每日盤點"].includes(active) && <WorkPage type={active} items={依貨品代號排序(items)} records={records} stores={availableStores} operationStoreId={operationStoreId} setOperationStoreId={setOperationStoreId} canCreate={canCreate} canModify={canModify} canDelete={canDelete} countedToday={countedTodayForStore} openForm={openForm} onEdit={openEdit} onRemove={removeRecord} onBatchSave={saveBatchRecords} />}{active === "查詢報表" && <ReportPage items={依貨品代號排序(items)} records={filteredRecords} auditLogs={auditLogs} query={query} setQuery={setQuery} operatorFilter={operatorFilter} setOperatorFilter={setOperatorFilter} operatorOptions={visibleOperatorOptions} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} exportCsv={exportCsv} exportUsagePdf={exportUsagePdf} exportOperationPdf={exportOperationPdf} stores={availableStores} role={role} selectedStoreIds={selectedStoreIds} setSelectedStoreIds={setSelectedStoreIds} showExportPreview={showExportPreview} setShowExportPreview={setShowExportPreview} exportFormat={exportFormat} setExportFormat={setExportFormat} />}{active === "後台管理" && <AdminPage items={依貨品代號排序(items)} setItems={setItems} showItemForm={showItemForm} setShowItemForm={setShowItemForm} newItem={newItem} setNewItem={setNewItem} addItem={addItem} editingItem={editingItem} setEditingItem={setEditingItem} showBatchForm={showBatchForm} setShowBatchForm={setShowBatchForm} batchText={batchText} setBatchText={setBatchText} importBatch={importBatch} employeeList={employeeList} setEmployeeList={setEmployeeList} newEmployee={newEmployee} setNewEmployee={setNewEmployee} addEmployee={addEmployee} permissions={permissions} setPermissions={setPermissions} appendAudit={appendAudit} canCreate={canCreate} canModify={canModify} canDelete={canDelete} />}</div></main>

    <div data-testid="新增單據內嵌頁" className={`w-full min-w-0 max-w-full overflow-x-hidden lg:pl-64 p-5 md:p-8 ${showForm && !editingRecord && !viewingRecord ? "min-h-[70vh] space-y-5" : "hidden"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-sm text-[#a28672]">{formType}／新增頁</p><h2 className="text-3xl font-semibold text-[#3e2a1f]">新增{formType}</h2><p className="mt-1 text-sm text-[#806653]">請輸入單據內容，完成後保存；返回工作頁面不會離開目前系統。</p></div><Button type="button" variant="outline" onClick={() => { if (newFormDirty) setShowNewFormBackConfirm(true); else { setShowForm(false); } }} className="border-[#dfcbb8] text-[#70452d]">返回</Button></div>
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#e4d4c0] bg-[#fffdf9] p-3 shadow-sm sm:p-6"><div className="grid w-full min-w-0 max-w-full gap-4"><div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#eadfd5] bg-[#faf3eb] p-3"><div className="flex min-w-0 flex-col gap-2"><div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><label className="shrink-0 text-xs text-[#806653]">門市選擇</label><div className="min-w-0"><Select value={String(operationStoreId)} onValueChange={value => { setNewFormDirty(true); setOperationStoreId(Number(value)); }}><SelectTrigger size="sm" className="h-8 w-full min-w-0 max-w-full bg-white px-2 text-xs leading-5 sm:text-sm"><SelectValue placeholder="選擇門市" /></SelectTrigger><SelectContent>{availableStores.map(store => <SelectItem key={store.編號} value={String(store.編號)}>{store.門市代號}・{store.名稱}</SelectItem>)}</SelectContent></Select></div></div>{templatesForType(formType).length > 0 && <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><label className="shrink-0 text-xs text-[#806653]">選擇預設表單</label><div className="min-w-0"><Select value={selectedTemplateId} onValueChange={value => { setNewFormDirty(true); applyTemplate(formType, value); }}><SelectTrigger size="sm" className="h-8 w-full min-w-0 max-w-full bg-white px-2 text-xs leading-5 sm:text-sm"><SelectValue placeholder="選擇預設表單" /></SelectTrigger><SelectContent>{templatesForType(formType).map(template => <SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>)}</SelectContent></Select></div></div>}</div>{!templatesForType(formType).length && <p className="mt-2 text-xs text-[#a28672]">目前門市尚無可用預設表單，可直接輸入品項。</p>}</div><div><label className="mb-1 block text-xs text-[#806653]">日期</label><Input type="date" value={formDate} disabled={Boolean(viewingRecord)} onChange={e => { setNewFormDirty(true); setFormDate(e.target.value); }} className="h-8 w-full min-w-0 max-w-full px-2 text-xs leading-5 sm:text-sm" /></div><div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="block text-sm">貨物品項</label><span className="text-xs text-[#806653]">預設品項 {formLines.length} 項・目前套用門市：{operationStore ? `${operationStore.門市代號}・${operationStore.名稱}` : "未選擇門市"}</span></div>{showMobileScrollHint && <div className="mb-2 flex items-center justify-between rounded-lg border border-[#eadfd5] bg-[#faf3eb] px-3 py-2 text-xs text-[#806653] sm:hidden"><span>左右滑動查看完整欄位</span><span aria-hidden="true" className="text-base font-semibold text-[#70452d]">← →</span></div>}<div className="relative isolate w-full min-w-0 max-w-none overflow-hidden rounded-xl border border-[#eee4da]"><div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#fffdf9] via-[#fffdf9]/80 to-transparent sm:hidden" aria-hidden="true" /><div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[#fffdf9] via-[#fffdf9]/80 to-transparent sm:hidden" aria-hidden="true" /><div data-testid="新增貨物品項水平捲動區" className="yan-mobile-table-scroll w-full min-w-0 max-w-full overscroll-x-contain" style={{ overflowX: "auto", overflowY: "hidden", width: "100%", minWidth: "0px", maxWidth: "100%", WebkitOverflowScrolling: "touch", touchAction: "pan-x", cursor: "grab" }} onScroll={handleMobileTableScroll} onPointerDown={handleMobileTablePointerDown} onPointerMove={handleMobileTablePointerMove} onPointerUp={clearMobileTablePointer} onPointerCancel={clearMobileTablePointer} onPointerLeave={clearMobileTablePointer}>
  <div data-testid="新增貨物品項表格內容" className={formType === "進貨" ? "yan-mobile-table-content w-max min-w-[620px] max-w-none" : "yan-mobile-table-content w-max min-w-[420px] max-w-none"} style={{ width: formType === "進貨" ? "620px" : "420px", minWidth: formType === "進貨" ? "620px" : "420px", maxWidth: "none" }}>
    <div className={formType === "進貨" ? "grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_6rem_4rem] gap-2 border-b border-[#eee4da] bg-[#faf3eb] px-3 py-2 text-xs font-semibold text-[#806653]" : "grid grid-cols-[minmax(0,1fr)_5.5rem_5rem] gap-2 border-b border-[#eee4da] bg-[#faf3eb] px-3 py-2 text-xs font-semibold text-[#806653]"}>
      <span>貨物品項</span><span className="text-center">數量</span>{formType === "進貨" && <><span className="text-center">單價</span><span className="text-center">小計</span></>}<span className="text-center">單位</span>
    </div>
    {formLines.map((line, index) => { const item = 有效品項.find(i => (line.品項編號 !== undefined && i.編號 === line.品項編號) || i.名稱 === line.品項); if (!item) return null; return <div key={line.品項} className={formType === "進貨" ? "grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_6rem_4rem] items-center gap-2 border-b border-[#f0e7de] px-3 py-3 last:border-b-0" : "grid grid-cols-[minmax(0,1fr)_5.5rem_5rem] items-center gap-2 border-b border-[#f0e7de] px-3 py-3 last:border-b-0"}>
      <div className="min-w-0"><p className="break-words font-medium leading-5"><span className="mr-1 text-xs text-[#9b6257]">{item.貨品代號}</span>{item.名稱}</p><p className="text-xs text-[#a28672]">{item.大值單位}／1 {item.大值單位}＝{item.換算比例} {item.小值單位}</p></div>
      <Input className="h-9 w-full text-center" type="number" min="0" value={line.數量} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || 驗證數量輸入(value).valid) { setNewFormDirty(true); setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 數量: value } : x)); } else toast.error("數量不可為負數，小數最多兩位"); }} placeholder="數量" />
      {formType === "進貨" && <><Input className="h-9 w-full text-center" type="number" min="0" step="0.01" value={line.單價 ?? item.單價} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || /^\d+(?:\.\d{0,2})?$/.test(value)) { setNewFormDirty(true); setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 單價: value } : x)); } else toast.error("單價不可為負數，小數最多兩位"); }} /><span className="text-center font-semibold text-[#70452d]">{"$"}{計算進貨小計(Number(line.單價 ?? item.單價), Number(line.數量 || 0))}</span></>}
      <span className="text-center text-sm font-medium text-[#70452d]">{line.預設輸入單位 || item.大值單位}</span>
    </div>; })}
  </div>
</div></div><p className="mt-1 text-xs text-[#a28672]">可同時輸入多個品項，空白品項不會寫入單據。</p></div><div><label className="mb-1 block text-xs text-[#806653]">備註</label><Input value={formNote} disabled={Boolean(viewingRecord)} onChange={e => { setNewFormDirty(true); setFormNote(e.target.value); }} placeholder="請輸入備註" className="h-8 w-full min-w-0 max-w-full px-2 text-xs leading-5 sm:text-sm" /></div>{!viewingRecord && <Button size="sm" onClick={submitRecord} className="h-8 w-full min-w-0 px-3 text-xs leading-5 bg-[#70452d] hover:bg-[#5b3724] sm:w-auto sm:text-sm">{editingRecord ? "儲存修改" : `儲存${formType}`}</Button>}</div></div>
      <Dialog open={showNewFormBackConfirm} onOpenChange={setShowNewFormBackConfirm}><DialogContent className="rounded-2xl border-[#e4d4c0] bg-[#fffdf9]"><DialogHeader><DialogTitle>尚有未儲存變更</DialogTitle><DialogDescription>返回工作頁面前，是否要儲存目前新增內容？</DialogDescription></DialogHeader><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { localStorage.removeItem(draftKey(formType)); setNewFormDirty(false); setShowNewFormBackConfirm(false); setShowForm(false); }}>否</Button><Button type="button" variant="outline" onClick={() => setShowNewFormBackConfirm(false)}>取消返回</Button><Button type="button" onClick={() => { setShowNewFormBackConfirm(false); submitRecord(); }} className="bg-[#70452d] hover:bg-[#5b3724]">是</Button></div></DialogContent></Dialog>
    </div>
    <Dialog open={showForm && Boolean(editingRecord || viewingRecord)} onOpenChange={open => { setShowForm(open); if (!open) { setViewingRecord(null); setEditingRecord(null); } }}><DialogContent data-testid="新增單據視窗" className={`${viewingRecord ? "max-w-5xl" : "w-[calc(100%-1rem)] max-w-5xl max-h-[90vh] overflow-y-auto"} rounded-2xl border-[#e4d4c0] bg-[#fffdf9]`}><DialogHeader><DialogTitle className="text-[#3e2a1f]">{viewingRecord ? "查看" : editingRecord ? "修改" : "新增"}{formType}</DialogTitle></DialogHeader><div className="grid gap-4"><div className="rounded-xl border border-[#eadfd5] bg-[#faf3eb] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><div><label className="mb-1 block text-xs text-[#806653]">門市選擇</label><Select value={String(operationStoreId)} onValueChange={value => setOperationStoreId(Number(value))}><SelectTrigger className="w-44 bg-white"><SelectValue placeholder="選擇門市" /></SelectTrigger><SelectContent>{availableStores.map(store => <SelectItem key={store.編號} value={String(store.編號)}>{store.門市代號}・{store.名稱}</SelectItem>)}</SelectContent></Select></div>{templatesForType(formType).length > 0 && <div><label className="mb-1 block text-xs text-[#806653]">選擇預設表單</label><Select value={selectedTemplateId} onValueChange={value => applyTemplate(formType, value)}><SelectTrigger className="w-52 bg-white"><SelectValue placeholder="選擇預設表單" /></SelectTrigger><SelectContent>{templatesForType(formType).map(template => <SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>)}</SelectContent></Select></div>}</div></div>{!templatesForType(formType).length && <p className="mt-2 text-xs text-[#a28672]">目前門市尚無可用預設表單，可直接輸入品項。</p>}</div><div><label className="mb-1 block text-sm">日期</label><Input type="date" value={formDate} disabled={Boolean(viewingRecord)} onChange={e => setFormDate(e.target.value)} /></div><div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="block text-sm">貨物品項</label><span className="text-xs text-[#806653]">預設品項 {formLines.length} 項・目前套用門市：{operationStore ? `${operationStore.門市代號}・${operationStore.名稱}` : "未選擇門市"}</span></div><div className="min-w-0 max-h-72 space-y-2 overflow-x-auto overflow-y-auto rounded-xl border border-[#eee4da] p-3">{formLines.map((line, index) => { const item = 有效品項.find(i => (line.品項編號 !== undefined && i.編號 === line.品項編號) || i.名稱 === line.品項); if (!item) return null; return <div key={line.品項} className={`grid min-w-[620px] ${formType === "進貨" ? "grid-cols-[minmax(260px,1fr)_7rem_7rem_7rem_5rem]" : "grid-cols-[minmax(260px,1fr)_7rem_5rem]"} items-start gap-3`}><div><p className="min-w-0 whitespace-normal break-words font-medium leading-6"><span className="mr-2 text-xs text-[#9b6257]">{item.貨品代號}</span>{item.名稱}</p><p className="text-xs text-[#a28672]">{item.大值單位}／1 {item.大值單位}＝{item.換算比例} {item.小值單位}</p></div><div className="flex items-end justify-end gap-2"><div className="w-[110px]"><label className="mb-1 block text-xs font-medium text-[#806653]">數量</label><Input type="number" min="0" value={line.數量} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || 驗證數量輸入(value).valid) setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 數量: value } : x)); else toast.error("數量不可為負數，小數最多兩位"); }} placeholder="請輸入數量" /></div>{formType === "進貨" && <><div className="w-[112px]"><label className="mb-1 block text-xs font-medium text-[#806653]">單價</label><Input type="number" min="0" step="0.01" value={line.單價 ?? item.單價} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || /^\d+(?:\.\d{0,2})?$/.test(value)) setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 單價: value } : x)); else toast.error("單價不可為負數，小數最多兩位"); }} /></div><div className="w-[96px] text-right"><label className="mb-1 block text-xs font-medium text-[#806653]">小計</label><span className="block pt-2 font-semibold text-[#70452d]">${計算進貨小計(Number(line.單價 ?? item.單價), Number(line.數量 || 0))}</span></div></>}{formType !== "進貨" && <div className="min-w-12 text-right"><label className="mb-1 block text-xs font-medium text-[#806653]">單位</label><span className="block text-sm font-medium text-[#70452d]">{line.預設輸入單位 || item.大值單位}</span></div>}{formType === "進貨" && <div className="min-w-12 text-right"><label className="mb-1 block text-xs font-medium text-[#806653]">單位</label><span className="block text-sm font-medium text-[#70452d]">{line.預設輸入單位 || item.大值單位}</span></div>}</div></div>; })}</div><p className="mt-1 text-xs text-[#a28672]">可同時輸入多個品項，空白品項不會寫入單據。</p></div><div><label className="mb-1 block text-sm">備註</label><Input value={formNote} disabled={Boolean(viewingRecord)} onChange={e => setFormNote(e.target.value)} placeholder="請輸入備註" /></div>{!viewingRecord && <Button onClick={submitRecord} className="bg-[#70452d] hover:bg-[#5b3724]">{editingRecord ? "儲存修改" : `儲存${formType}`}</Button>}</div></DialogContent></Dialog>
  </div>;
}

function Overview({ items, records, usage, openForm, canCreateForType, stores, role, selectedStoreIds, setSelectedStoreIds }: { items: 品項[]; records: 異動[]; usage: (品項 & { 使用量: number })[]; openForm: (t: string) => void; canCreateForType: (type: string) => boolean; stores: 門市[]; role: 角色; selectedStoreIds: number[]; setSelectedStoreIds: React.Dispatch<React.SetStateAction<number[]>> }) {
  const total = items.reduce((s, i) => s + i.庫存, 0);
  const lowStock = 找出低庫存(items);
  const admin = role === "管理員";
  const [expandedStoreIds, setExpandedStoreIds] = useState<number[]>([]);
  const storeStats = useMemo(() => stores.filter(store => selectedStoreIds.includes(store.編號)).map(store => { const storeRecords = records.filter(record => record.門市編號 === store.編號); const details = 建立門市庫存明細(storeRecords, items, store.編號).map(detail => ({ ...detail, item: items.find(item => item.名稱 === detail.貨物品項) })); const value = details.reduce((total, detail) => total + detail.小計, 0); const lowCount = items.length ? details.filter(({ item, 庫存數量 }) => item && 庫存數量 <= Number(item.低庫存門檻 ?? 0)).length : 0; return { ...store, value, lowCount, details }; }).sort((a, b) => b.value - a.value), [stores, selectedStoreIds, records, items]);
  const toggleStore = (id: number) => { if (!admin) return; setSelectedStoreIds(previous => previous.includes(id) ? previous.filter(storeId => storeId !== id) : [...previous, id]); };
  return <><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-sm text-[#a28672]">今日營運摘要 · {today}</p><h2 className="text-3xl font-semibold">庫存總覽</h2><p className="mt-2 text-[#806653]">掌握食包材即時存量與今日作業狀況。</p></div><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">{canCreateForType("進貨") && <Button onClick={() => openForm("進貨")} className="bg-[#70452d] hover:bg-[#5b3724]"><Truck className="mr-2 h-4 w-4" />新增進貨</Button>}{canCreateForType("每日盤點") && <Button onClick={() => openForm("每日盤點")} variant="outline" className="border-[#d9c5b1] bg-[#fffdf9]"><ClipboardCheck className="mr-2 h-4 w-4" />每日盤點</Button>}{canCreateForType("報廢") && <Button onClick={() => openForm("報廢")} variant="outline" className="border-[#d9c5b1] bg-[#fffdf9]"><FileInput className="mr-2 h-4 w-4" />新增報廢</Button>}{canCreateForType("退貨") && <Button onClick={() => openForm("退貨")} variant="outline" className="border-[#d9c5b1] bg-[#fffdf9]"><FileInput className="mr-2 h-4 w-4" />新增退貨</Button>}</div></div><div className="grid gap-4 md:grid-cols-3"><Stat title="目前品項" value={`${items.length} 項`} sub="已建立品項" icon={Package} /><Stat title="庫存總量" value={`${total} 單位`} sub="以大值單位計算" icon={BarChart3} /><Stat title="今日作業" value={`${records.filter(r => r.日期 === today).length} 筆`} sub="進貨、退貨、報廢與盤點" icon={FileInput} /></div>{admin && storeStats.length > 0 && <div className="mt-6 grid gap-6 xl:grid-cols-2"><Card className="border-[#eadfd5] bg-[#fffdf9] shadow-sm"><CardHeader><CardTitle className="text-lg">門市庫存比較</CardTitle><p className="text-sm text-[#806653]">依品項單價與換算比例計算目前可見門市庫存價值。</p></CardHeader><CardContent className="space-y-3">{storeStats.map(store => { const expanded = expandedStoreIds.includes(store.編號); return <div key={store.編號} className="overflow-hidden rounded-xl border border-[#eee4da] bg-[#fffcf8]"><button type="button" onClick={() => setExpandedStoreIds(previous => expanded ? previous.filter(id => id !== store.編號) : [...previous, store.編號])} className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[#faf2e9]"><div><p className="font-semibold">{store.名稱}</p><p className="mt-1 text-xs text-[#a28672]">目前可見範圍・{store.details.length} 項品項</p></div><div className="flex items-center gap-3"><p className="text-xl font-semibold text-[#70452d]">{store.value.toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 })}</p>{expanded ? <ChevronUp className="h-5 w-5 text-[#8d6047]" /> : <ChevronDown className="h-5 w-5 text-[#8d6047]" />}</div></button>{expanded && <div className="overflow-hidden border-t border-[#eee4da] px-3 pb-3"><div className="hidden w-full min-w-0 grid-cols-[minmax(7rem,1.1fr)_minmax(9rem,1.75fr)_minmax(9rem,1.2fr)_minmax(9rem,1.3fr)_minmax(4rem,.75fr)_minmax(6rem,1fr)] gap-3 whitespace-nowrap px-2 py-3 text-xs font-semibold text-[#806653] md:grid"><span>貨品代號</span><span>貨物品項</span><span className="text-right">大值進貨單價</span><span className="text-right">大值庫存數量</span><span>單位</span><span className="text-right">小計</span></div>{store.details.map(detail => <div key={detail.貨物品項} className="grid w-full min-w-0 grid-cols-1 gap-2 border-b border-[#f0e7df] px-2 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(7rem,1.1fr)_minmax(9rem,1.75fr)_minmax(9rem,1.2fr)_minmax(9rem,1.3fr)_minmax(4rem,.75fr)_minmax(6rem,1fr)] md:items-center"><div className="min-w-0 md:contents"><span className="mr-2 inline-block truncate text-xs font-semibold text-[#9b6257] md:mr-0 md:block md:sticky md:left-0 md:bg-[#fffcf8]">{detail.貨品代號}</span><span className="inline-block min-w-0 whitespace-normal break-words font-medium text-[#4f3527] md:block md:max-w-none">{detail.貨物品項}</span></div><div className="flex justify-between md:block md:text-right"><span className="text-xs text-[#a28672] md:hidden">大值進貨單價</span>{detail.進貨單價.toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 2 })}</div><div className="flex justify-between md:block md:text-right"><span className="text-xs text-[#a28672] md:hidden">大值庫存數量</span>{detail.庫存數量}</div><div className="flex justify-between md:block"><span className="text-xs text-[#a28672] md:hidden">單位</span>{detail.單位}</div><div className="flex justify-between font-semibold text-[#70452d] md:block md:text-right"><span className="text-xs font-normal text-[#a28672] md:hidden">小計</span>{detail.小計.toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 })}</div></div>)}</div>}</div>; })}</CardContent></Card><Card className="border-[#eadfd5] bg-[#fffdf9] shadow-sm"><CardHeader><CardTitle className="text-lg">低庫存分店排行</CardTitle><p className="text-sm text-[#806653]">低庫存品項越多，排序越前。</p></CardHeader><CardContent className="space-y-3">{storeStats.length && items.length ? storeStats.slice().sort((a, b) => b.lowCount - a.lowCount).map((store, index) => <div key={store.編號} className="flex items-center justify-between rounded-xl border border-[#eee4da] bg-[#fffcf8] p-4"><div><p className="font-semibold">第 {index + 1} 名・{store.名稱}</p><p className="mt-1 text-xs text-[#a28672]">需補貨品項</p></div><Badge variant="outline" className="border-[#e8b7a8] text-[#9b4536]">{store.lowCount} 項</Badge></div>) : <p className="py-6 text-center text-[#a28672]">目前尚無品項可供排行。</p>}</CardContent></Card></div>}{lowStock.length > 0 && <Card className="mt-6 border-[#e8b7a8] bg-[#fff4ef]"><CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-[#9b4536]">低庫存警示</p><p className="mt-1 text-sm text-[#9b6257]">{lowStock.map(i => `${i.名稱}（剩餘 ${i.庫存} ${i.大值單位}，門檻 ${i.低庫存門檻}）`).join("、")}</p></div><Badge className="w-fit border-[#e8b7a8] bg-white text-[#9b4536]">{lowStock.length} 項需補貨</Badge></CardContent></Card>}<div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><Card className="border-[#eadfd5] bg-[#fffdf9] shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-lg">品項庫存</CardTitle><span className="text-xs text-[#a28672]">大值／小值換算</span></CardHeader><CardContent className="space-y-3">{依貨品代號排序(usage).map(item => <div key={item.名稱} className="flex items-center justify-between rounded-xl border border-[#eee4da] bg-[#fffcf8] p-4"><div><p className="min-w-0 whitespace-normal break-words font-medium leading-6"><span className="mr-2 text-xs text-[#9b6257]">{item.貨品代號}</span>{item.名稱}</p><p className="mt-1 text-xs text-[#a28672]">{item.大值單位} 1 {item.大值單位} ＝ {item.換算比例} {item.小值單位}</p></div><div className="text-right"><p className="text-xl font-semibold text-[#70452d]">{item.庫存} <span className="text-sm font-normal">{item.大值單位}</span></p><p className="text-xs text-[#9b806d]">約 {item.庫存 * item.換算比例} {item.小值單位}</p></div></div>)}</CardContent></Card><Card className="border-[#eadfd5] bg-[#fffdf9] shadow-sm"><CardHeader><CardTitle className="text-lg">最近作業</CardTitle></CardHeader><CardContent className="space-y-3">{records.slice(0, 5).map(r => <div key={r.id} className="flex items-center justify-between border-b border-[#f0e7df] pb-3"><div><p className="text-sm font-medium"><span className="mr-2 text-xs text-[#9b6257]">{items.find(item => item.名稱 === r.品項)?.貨品代號}</span>{r.品項}</p><p className="text-xs text-[#a28672]">{顯示日期與星期(r.日期)} · {r.類型}{r.門市名稱 ? ` · ${r.門市名稱}` : ""}</p></div><Badge variant="outline" className="border-[#dfcbb8] text-[#70452d]">{r.數量} {r.單位}</Badge></div>)}</CardContent></Card></div></>;
}
function Stat({ title, value, sub, icon: Icon }: { title: string; value: string; sub: string; icon: any }) { return <Card className="border-[#eadfd5] bg-[#fffdf9] shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-[#9b806d]">{title}</p><p className="mt-2 text-2xl font-semibold text-[#3e2a1f]">{value}</p><p className="mt-1 text-xs text-[#b0927c]">{sub}</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f2e4d5] text-[#70452d]"><Icon className="h-5 w-5" /></div></CardContent></Card>; }
export function 每日盤點操作按鈕({ type, countedToday, canCreate, onOpen }: { type: 模組; countedToday: boolean; canCreate: boolean; onOpen: () => void }) {
  return canCreate ? <Button onClick={onOpen} disabled={type === "每日盤點" && countedToday} className="bg-[#70452d] hover:bg-[#5b3724]"><FileInput className="mr-2 h-4 w-4" />{countedToday && type === "每日盤點" ? "今日已完成盤點" : `新增${type}`}</Button> : null;
}

export function 顯示日期與星期(日期: string) { const date = new Date(`${日期}T00:00:00`); const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]; return `${日期}（${weekdays[date.getDay()]}）`; }
export function 統計每日筆數(records: Array<{ 日期: string }>) { return records.reduce<Record<string, number>>((counts, record) => { counts[record.日期] = (counts[record.日期] || 0) + 1; return counts; }, {}); }
export function 計算報表快速日期區段(range: "today" | "sevenDays" | "month", now = new Date()) { const formatDate = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }; const end = new Date(now); const start = new Date(now); if (range === "sevenDays") start.setDate(end.getDate() - 6); if (range === "month") start.setDate(1); return { startDate: formatDate(start), endDate: formatDate(end) }; }

export function 篩選工作頁明細(records: 異動[], type: 模組, storeId: number | "", search = "", detailStoreId = "全部") { const normalizedType = type.replace("單", ""); return records.filter(record => record.類型 === normalizedType && record.門市編號 === storeId && (detailStoreId === "全部" || String(record.門市編號) === detailStoreId) && (!search || record.品項.includes(search))); }

function WorkPage({ type, items, records, stores, operationStoreId, setOperationStoreId, openForm, onEdit, onRemove, onBatchSave, canCreate, canModify, canDelete, countedToday }: { type: 模組; items: 品項[]; records: 異動[]; stores: 門市[]; operationStoreId: number | ""; setOperationStoreId: React.Dispatch<React.SetStateAction<number | "">>; openForm: (t: string) => void; onEdit: (record: 異動) => void; onRemove: (record: 異動) => void; onBatchSave: (next: 異動[], previous: 異動[]) => { 成功筆數: number; 失敗筆數: number; 失敗品項: string[] }; canCreate: boolean; canModify: boolean; canDelete: boolean; countedToday: boolean }) {
  const [viewingRecord, setViewingRecord] = useState<異動 | null>(null);
  const [search, setSearch] = useState("");
  const [detailStoreId, setDetailStoreId] = useState<string>("全部");
  const [draftRecords, setDraftRecords] = useState<異動[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const rawList = 篩選工作頁明細(records, type, operationStoreId);
  const list = rawList.filter(r => (!startDate || r.日期 >= startDate) && (!endDate || r.日期 <= endDate)).sort((a, b) => b.日期.localeCompare(a.日期) || b.id - a.id);
  const sameDayRecords = viewingRecord ? list.filter(record => record.日期 === viewingRecord.日期 && (detailStoreId === "全部" || String(record.門市編號) === detailStoreId) && (!search || record.品項.includes(search) || (items.find(item => item.名稱 === record.品項)?.貨品代號 || "").includes(search))).sort((a, b) => String(items.find(item => item.名稱 === a.品項)?.貨品代號 || "").localeCompare(String(items.find(item => item.名稱 === b.品項)?.貨品代號 || ""), "en", { numeric: true })) : [];
  const countsByDate = 統計每日筆數(list);
  const recordsWithStore = list.map(record => ({ ...record, 門市名稱: record.門市名稱 ?? stores.find(store => store.編號 === record.門市編號)?.名稱, 門市代號: stores.find(store => store.編號 === record.門市編號)?.門市代號 }));
  const dailyGroups = 依日期門市彙整紀錄(recordsWithStore);
  const setQuickDateRange = (range: "today" | "sevenDays" | "month") => { const next = 計算報表快速日期區段(range); setStartDate(next.startDate); setEndDate(next.endDate); };
  const openDetails = (record: 異動) => { setViewingRecord(record); setSearch(""); setDetailStoreId(record.門市編號 === undefined ? "全部" : String(record.門市編號)); setDraftRecords(list.filter(item => item.日期 === record.日期 && (record.門市編號 === undefined ? item.門市編號 === undefined : item.門市編號 === record.門市編號))); };
  const updateDraft = (id: number, quantity: string) => { const result = 驗證數量輸入(quantity); if (!result.valid) { toast.error(result.message); return; } setDraftRecords(prev => prev.map(record => record.id === id ? { ...record, 數量: Number(quantity), ...(type === "進貨單" ? { 小計: 計算進貨小計(Number(record.單價 ?? 0), Number(quantity)) } : {}) } : record)); };
  const updateDraftPrice = (id: number, price: string) => { if (price !== "" && (!/^\d+(?:\.\d{0,2})?$/.test(price) || Number(price) < 0)) { toast.error("單價不可為負數，小數最多兩位"); return; } setDraftRecords(prev => prev.map(record => record.id === id ? { ...record, 單價: Number(price) || 0, 小計: 計算進貨小計(Number(price) || 0, Number(record.數量 || 0)) } : record)); };
  const hasUnsavedChanges = viewingRecord ? draftRecords.some(draft => { const original = list.find(record => record.id === draft.id); return original && (Number(original.數量) !== Number(draft.數量) || type === "進貨單" && Number(original.單價 ?? 0) !== Number(draft.單價 ?? 0)); }) : false;
  const [pendingBack, setPendingBack] = useState(false); const [pendingCancelEdit, setPendingCancelEdit] = useState(false); const [isDeleting, setIsDeleting] = useState(false);
  const deleteButton = 取得全部刪除按鈕狀態(isDeleting);
  const executeDelete = (record: 異動, returnAfterDelete = false) => { if (!是否可開始全部刪除(isDeleting)) return; setIsDeleting(true); window.setTimeout(() => { onRemove(record); setIsDeleting(false); if (returnAfterDelete) setViewingRecord(null); }, 350); };
  const returnToWorkPage = () => { if (hasUnsavedChanges) setPendingBack(true); else setViewingRecord(null); };
  const saveDetails = (returnAfterSave = false) => { const previous = viewingRecord ? list.filter(record => 是否屬於日期門市紀錄(record, viewingRecord)) : []; const invalid = draftRecords.find(record => !驗證數量輸入(String(record.數量)).valid); if (invalid) return toast.error(`${invalid.品項}的數量格式不正確`); const result = onBatchSave(draftRecords, previous); const detail = result.失敗筆數 ? `失敗 ${result.失敗筆數} 筆：${result.失敗品項.join("、")}` : "沒有失敗品項"; if (returnAfterSave) setViewingRecord(null); setPendingBack(false); toast.success("儲存成功", 取得儲存成功Toast設定(`批次保存完成：成功 ${result.成功筆數} 筆，${detail}`)); };
  const cancelEdit = () => { if (!viewingRecord || !hasUnsavedChanges) return; setPendingCancelEdit(true); }; const confirmCancelEdit = () => { if (viewingRecord) setDraftRecords(list.filter(record => 是否屬於日期門市紀錄(record, viewingRecord))); setPendingCancelEdit(false); setPendingBack(false); toast.success("已還原本次未儲存變更"); };
  if (viewingRecord) return <div className="min-h-[70vh] space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-sm text-[#a28672]">{type}／明細頁</p><h2 className="text-3xl font-semibold text-[#3e2a1f]">{type}明細</h2><p className="mt-1 text-sm text-[#806653]">可搜尋品項、篩選門市並逐行編輯同日紀錄。</p></div><Button type="button" variant="outline" onClick={returnToWorkPage} className="border-[#dfcbb8] text-[#70452d]">返回</Button></div><div className="flex flex-wrap items-end gap-2"><div className="min-w-[180px] flex-1"><label className="mb-1 block text-xs text-[#806653]">品項搜尋</label><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋貨品代號或名稱" /></div><div><label className="mb-1 block text-xs text-[#806653]">門市篩選</label><Select value={detailStoreId} onValueChange={setDetailStoreId}><SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="全部">全部門市</SelectItem>{stores.map(store => <SelectItem key={store.編號} value={String(store.編號)}>{store.名稱}</SelectItem>)}</SelectContent></Select></div></div><div className="flex items-center justify-between gap-3 rounded-xl border border-[#eadfd5] bg-[#faf3eb] p-4"><div><p className="text-xs text-[#a28672]">日期</p><p className="mt-1 text-lg font-semibold">{顯示日期與星期(viewingRecord.日期)}</p></div><div className="flex flex-wrap justify-end gap-2">{canModify && <><Button size="sm" variant="outline" onClick={cancelEdit} disabled={!hasUnsavedChanges}>取消編輯</Button><Button size="sm" onClick={() => saveDetails(false)} className="bg-[#70452d] hover:bg-[#5b3724]">儲存</Button></>}{canDelete && <Button size="sm" variant="outline" onClick={() => { if (!isDeleting && window.confirm("確定要全部刪除目前日期與門市的明細嗎？刪除後庫存會回算。")) executeDelete(viewingRecord, true) }} className="text-[#a4513f]" disabled={deleteButton.disabled}>{deleteButton.showSpinner && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{deleteButton.label}</Button>}</div></div><div className="overflow-x-auto rounded-xl border border-[#eee4da] bg-white"><div className={`min-w-[620px] ${type === "進貨單" ? "grid-cols-[minmax(0,1fr)_6rem_7rem_6rem_5rem]" : "grid-cols-[minmax(0,1fr)_6rem_4rem]"} grid items-start gap-3 border-b border-[#eee4da] bg-[#faf3eb] px-4 py-3 text-sm font-semibold text-[#806653]`}><div>貨物品項</div><div className="text-right">數量</div>{type === "進貨單" && <><div className="text-right">單價</div><div className="text-right">小計</div></>}<div className="text-right">單位</div></div><div className="min-w-[620px]">{sameDayRecords.map(record => { const draft = draftRecords.find(item => item.id === record.id) ?? record; const rowClass = type === "進貨單" ? "grid-cols-[minmax(0,1fr)_6rem_7rem_6rem_5rem]" : "grid-cols-[minmax(0,1fr)_6rem_4rem]"; return <div key={record.id} className={`grid ${rowClass} items-start gap-3 border-b border-[#f0e7df] px-4 py-4 last:border-b-0`}><div className="min-w-0"><p className="whitespace-normal break-words text-lg font-semibold text-[#3e2a1f]"><span className="mr-2 text-sm text-[#9b6257]">{items.find(item => item.名稱 === record.品項)?.貨品代號}</span>{record.品項}</p></div><div className="justify-self-end">{canModify ? <Input type="number" min="0" step="0.01" value={draft.數量} onChange={e => updateDraft(record.id, e.target.value)} className="w-24 text-right text-lg font-semibold" /> : <p className="text-xl font-semibold text-[#70452d]">{draft.數量}</p>}</div>{type === "進貨單" && <><div className="justify-self-end">{canModify ? <Input type="number" min="0" step="0.01" value={draft.單價 ?? 0} onChange={e => updateDraftPrice(record.id, e.target.value)} className="w-28 text-right" /> : <p className="text-right font-semibold text-[#70452d]">${Number(draft.單價 ?? 0).toFixed(2)}</p>}</div><p className="text-right font-semibold text-[#70452d]">${計算進貨小計(Number(draft.單價 ?? 0), Number(draft.數量 ?? 0))}</p></>}<div className="justify-self-end text-right text-base font-semibold text-[#70452d]">{record.單位 || items.find(item => item.名稱 === record.品項)?.大值單位 || "—"}</div></div>; })}</div></div><Dialog open={pendingBack} onOpenChange={setPendingBack}><DialogContent className="rounded-2xl border-[#e4d4c0] bg-[#fffdf9]"><DialogHeader><DialogTitle>尚有未儲存變更</DialogTitle><DialogDescription>返回工作頁面前，是否要儲存目前修改內容？</DialogDescription></DialogHeader><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setPendingBack(false); setViewingRecord(null); }}>否</Button><Button type="button" variant="outline" onClick={() => saveDetails(false)}>是</Button><Button type="button" onClick={() => saveDetails(true)} className="bg-[#70452d] hover:bg-[#5b3724]">儲存並返回</Button></div></DialogContent></Dialog><Dialog open={pendingCancelEdit} onOpenChange={setPendingCancelEdit}><DialogContent className="rounded-2xl border-[#e4d4c0] bg-[#fffdf9]"><DialogHeader><DialogTitle>確認取消編輯</DialogTitle><DialogDescription>確定要還原本次尚未儲存的所有變更嗎？還原後無法復原。</DialogDescription></DialogHeader><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPendingCancelEdit(false)}>否，繼續編輯</Button><Button type="button" onClick={confirmCancelEdit} className="bg-[#70452d] hover:bg-[#5b3724]">是，還原變更</Button></div></DialogContent></Dialog></div>;
  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-sm text-[#a28672]">作業單據管理</p><h2 className="text-3xl font-semibold">{type}</h2><p className="mt-2 text-[#806653]">{type === "每日盤點" ? "每日僅能提交一次，提交後自動計算庫存使用量。" : "一次輸入多個品項，完整保留作業紀錄。"}</p></div><div className="flex flex-wrap items-end gap-2"><div><label className="mb-1 block text-xs text-[#806653]">開始日期</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 bg-white" /></div><div><label className="mb-1 block text-xs text-[#806653]">結束日期</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 bg-white" /></div><div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("today")}>今日</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("sevenDays")}>近七日</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("month")}>本月</Button></div>{stores.length > 0 && <div><label className="mb-1 block text-xs text-[#806653]">門市選擇</label><Select value={String(operationStoreId)} onValueChange={value => setOperationStoreId(Number(value))}><SelectTrigger className="w-44 bg-white"><SelectValue placeholder="選擇門市" /></SelectTrigger><SelectContent>{stores.map(store => <SelectItem key={store.編號} value={String(store.編號)}>{store.門市代號}・{store.名稱}</SelectItem>)}</SelectContent></Select></div>}<每日盤點操作按鈕 type={type} countedToday={countedToday} canCreate={canCreate} onOpen={() => openForm(type.replace("單", ""))} /></div></div>
    <Card className="border-[#eadfd5] bg-[#fffdf9]"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#faf3eb] text-left text-[#806653]"><tr><th className="p-4">日期</th><th className="p-4">門市</th><th className="p-4">筆數</th><th className="p-4">備註</th><th className="p-4 text-right">操作</th></tr></thead><tbody>{dailyGroups.length ? dailyGroups.map(group => { const notes = Array.from(new Set(group.明細.map(record => record.備註).filter(Boolean))).join("、"); const storeLabel = group.門市名稱 ? `${group.門市代號 ? `${group.門市代號}・` : ""}${group.門市名稱}` : "未設定門市"; return <tr key={`${group.日期}|${group.門市編號 ?? "未設定"}`} className="border-t border-[#f0e7df]"><td className="p-4 font-medium whitespace-nowrap">{顯示日期與星期(group.日期)}</td><td className="p-4 whitespace-nowrap">{storeLabel}</td><td className="p-4 whitespace-nowrap">{group.總筆數} 筆</td><td className="p-4 text-[#806653]">{notes || "—"}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openDetails(group.明細[0] as 異動)} className="text-[#806653]">查看</Button>{canDelete && <Button variant="ghost" size="sm" onClick={() => { if (!isDeleting && window.confirm(`確定要全部刪除 ${group.日期} ${storeLabel} 的${type}紀錄嗎？刪除後庫存會回算。`)) executeDelete(group.明細[0] as 異動); }} className="text-[#a4513f]" disabled={deleteButton.disabled}>{deleteButton.showSpinner && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{deleteButton.label}</Button>}</div></td></tr>; }) : <tr><td colSpan={5} className="p-12 text-center text-[#a28672]">目前尚無{type}紀錄</td></tr>}</tbody></table></div></CardContent></Card>
  </>;
}
function ReportPage({ items, records, auditLogs, query, setQuery, operatorFilter, setOperatorFilter, operatorOptions, startDate, endDate, setStartDate, setEndDate, exportCsv, exportUsagePdf, exportOperationPdf, stores, role, selectedStoreIds, setSelectedStoreIds, showExportPreview, setShowExportPreview, exportFormat, setExportFormat }: any) {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [reportType, setReportType] = useState<(typeof 報表作業類型)[number] | "全部">("全部");
  const admin = role === "管理員";
  const assignedStoreIds = stores.map((store: 門市) => store.編號);
  const setQuickDateRange = (range: "today" | "sevenDays" | "month") => { const { startDate: startValue, endDate: endValue } = 計算報表快速日期區段(range); setStartDate(startValue); setEndDate(endValue); };
  const toggleStore = (storeId: number) => {
    if (!admin) return;
    setSelectedStoreIds((previous: number[]) => previous.includes(storeId) ? previous.filter(id => id !== storeId) : [...previous, storeId]);
  };
  const filteredByType = useMemo(() => 篩選報表作業類型(records as 異動[], reportType), [records, reportType]);
  const dailyGroups = useMemo(() => 依日期彙整紀錄(filteredByType), [filteredByType]);

  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="mb-2 text-sm text-[#a28672]">紀錄查詢與資料匯出</p><h2 className="text-3xl font-semibold">查詢報表</h2><p className="mt-2 text-[#806653]">同一天的進貨、退貨、報廢與盤點會整理成一筆，可展開查看該日全部紀錄。</p></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => setShowExportPreview(true)} className="bg-[#70452d] hover:bg-[#5b3724]"><Download className="mr-2 h-4 w-4" />下載報表</Button><Button onClick={exportUsagePdf} variant="outline" className="border-[#70452d] text-[#70452d] hover:bg-[#faf3eb]"><Download className="mr-2 h-4 w-4" />食包材用量報表 PDF下載</Button><Button onClick={() => exportOperationPdf("進貨")} variant="outline">進貨單 PDF下載</Button><Button onClick={() => exportOperationPdf("退貨")} variant="outline">退貨單 PDF下載</Button><Button onClick={() => exportOperationPdf("報廢")} variant="outline">報廢稽核 PDF下載</Button><Button onClick={() => exportOperationPdf("每日盤點")} variant="outline">每日盤點記錄 PDF下載</Button></div>
    </div>
    <Card className="mb-6 border-[#eadfd5] bg-[#fffdf9]"><CardContent className="space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto] md:items-end">
        <div><label className="mb-1 block text-xs text-[#806653]">開始日期</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><label className="mb-1 block text-xs text-[#806653]">結束日期</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div><label className="mb-1 block text-xs text-[#806653]">關鍵字</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#a28672]" /><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="品項名稱或作業類型" /></div></div>
        <div><label className="mb-1 block text-xs text-[#806653]">操作人</label><select aria-label="操作人" value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} className="h-10 w-full rounded-md border border-[#dfcbb8] bg-white px-3 text-sm text-[#5b4638] outline-none focus:ring-2 focus:ring-[#b88b68]"><option value="">全部操作人</option>{(operatorOptions as string[]).map(operator => <option key={operator} value={operator}>{operator}</option>)}</select></div>
        <Badge variant="outline" className="h-10 justify-center border-[#dfcbb8] text-[#70452d]">共 {filteredByType.length} 筆／{dailyGroups.length} 日</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-[#806653]">快速日期</span><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("today")} className="border-[#dfcbb8] text-[#70452d]">今日</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("sevenDays")} className="border-[#dfcbb8] text-[#70452d]">近七日</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickDateRange("month")} className="border-[#dfcbb8] text-[#70452d]">本月</Button></div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-[#806653]">快速作業</span><Button type="button" size="sm" variant={reportType === "全部" ? "default" : "outline"} onClick={() => setReportType("全部")} className={reportType === "全部" ? "bg-[#70452d] hover:bg-[#5b3724]" : "border-[#dfcbb8] text-[#70452d]"}>全部</Button>{報表作業類型.map(type => <Button key={type} type="button" size="sm" variant={reportType === type ? "default" : "outline"} onClick={() => setReportType(type)} className={reportType === type ? "bg-[#70452d] hover:bg-[#5b3724]" : "border-[#dfcbb8] text-[#70452d]"}>{type}</Button>)}</div>
      <div className="mb-4 rounded-xl border border-[#eadfd5] bg-[#fffdf9] p-4 text-sm text-[#806653]"><p className="font-semibold text-[#70452d]">目前篩選條件</p><p className="mt-1">日期：{startDate} 至 {endDate}；作業類型：{reportType}；關鍵字：{query.trim() || "未設定"}；門市：{selectedStoreIds.length ? stores.filter((store: 門市) => selectedStoreIds.includes(store.編號)).map((store: 門市) => `${store.門市代號}・${store.名稱}`).join("、") || "已選門市" : "未選擇門市"}。</p>{!filteredByType.length && <p className="mt-2 text-[#9b6257]">目前沒有可顯示資料，可能是日期區段、關鍵字或門市篩選條件沒有符合紀錄。</p>}</div>
      <div className="rounded-xl border border-[#eee4da] bg-[#fffaf5] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-[#70452d]">查詢門市</p><p className="mt-1 text-xs text-[#a28672]">{admin ? "管理員可複選門市，未選擇時不顯示任何門市紀錄。" : "一般員工僅能查詢已分派的門市。"}</p></div>{admin && <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setSelectedStoreIds(assignedStoreIds)} className="border-[#dfcbb8] text-[#70452d]">全選</Button><Button type="button" variant="outline" size="sm" onClick={() => setSelectedStoreIds([])} className="border-[#dfcbb8] text-[#70452d]">清除</Button></div>}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{stores.length ? stores.map((store: 門市) => <label key={store.編號} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${selectedStoreIds.includes(store.編號) ? "border-[#cda986] bg-[#f7eadc] text-[#70452d]" : "border-[#eee4da] bg-white text-[#806653]"}`}><input type="checkbox" checked={selectedStoreIds.includes(store.編號)} disabled={!admin} onChange={() => toggleStore(store.編號)} className="h-4 w-4 accent-[#70452d]" /><span>{store.門市代號}・{store.名稱}</span></label>) : <p className="text-sm text-[#a28672]">目前尚未設定可查詢門市</p>}</div></div>
    </CardContent></Card>
    <Card className="border-[#eadfd5] bg-[#fffdf9]"><CardContent className="p-0">
      <div className="divide-y divide-[#f0e7df]">
        {dailyGroups.length ? dailyGroups.map(group => {
          const expanded = Boolean(expandedDates[group.日期]);
          return <div key={group.日期}>
            <button type="button" aria-expanded={expanded} onClick={() => setExpandedDates(prev => ({ ...prev, [group.日期]: !expanded }))} className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-[#faf3eb] md:flex-row md:items-center md:justify-between">
              <div><p className="font-semibold text-[#70452d]">{顯示日期與星期(group.日期)}</p><p className="mt-1 text-sm text-[#806653]">{格式化類型摘要(group.類型摘要)}</p></div>
              <div className="flex items-center gap-3 text-sm text-[#806653]"><span>{group.總筆數} 筆紀錄</span><span className="rounded-full border border-[#dfcbb8] px-3 py-1 text-[#70452d]">{expanded ? "收合明細" : "查看明細"}</span></div>
            </button>
            {expanded && <div className="overflow-x-auto bg-[#fffaf5] px-4 pb-4"><table className="w-full min-w-[760px] text-sm"><thead className="text-left text-[#806653]"><tr><th className="p-3">作業類型</th><th className="p-3">品項名稱</th><th className="p-3">數量</th><th className="p-3">備註</th><th className="p-3">操作人</th><th className="p-3">操作時間</th></tr></thead><tbody>{group.明細.map((r) => <tr key={r.id} className="border-t border-[#eadfd5]"><td className="p-3"><Badge variant="outline" className="border-[#dfcbb8] text-[#70452d]">{r.類型}</Badge></td><td className="p-3 font-medium"><span className="mr-2 text-xs text-[#9b6257]">{(items as 品項[]).find(item => item.名稱 === r.品項)?.貨品代號}</span>{r.品項}</td><td className="p-3">{r.數量} {r.單位}</td><td className="p-3 text-[#806653]">{r.備註 || "—"}</td><td className="p-3 text-[#806653]">{r.操作人 || "—"}</td><td className="p-3 text-[#806653]">{r.操作時間 || "—"}</td></tr>)}</tbody></table></div>}
          </div>;
        }) : <p className="p-12 text-center text-[#a28672]">目前尚無符合條件的紀錄</p>}
      </div>
    </CardContent></Card>
    <Dialog open={showExportPreview} onOpenChange={setShowExportPreview}><DialogContent className="max-w-2xl rounded-2xl border-[#e4d4c0] bg-[#fffdf9]"><DialogHeader><DialogTitle className="text-[#3e2a1f]">匯出前預覽</DialogTitle><DialogDescription>確認目前篩選條件、欄位與檔案格式後再下載。</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-xl border border-[#eadfd5] bg-[#faf3eb] p-4 text-sm text-[#70452d]"><p className="font-semibold">檔案名稱</p><p className="mt-1 break-all">食包材庫存報表_{role === "管理員" && selectedStoreIds.length !== 1 ? "全部門市" : (stores.find((store: 門市) => selectedStoreIds.includes(store.編號))?.名稱 || "門市")}_{startDate}至{endDate}.{exportFormat === "excel" ? "xls" : "csv"}</p><p className="mt-2 text-xs text-[#806653]">符合條件資料：{filteredByType.length} 筆</p></div><div><p className="mb-2 text-sm font-semibold text-[#70452d]">檔案格式</p><div className="grid grid-cols-2 gap-2"><Button type="button" variant={exportFormat === "csv" ? "default" : "outline"} onClick={() => setExportFormat("csv")} className={exportFormat === "csv" ? "bg-[#70452d] hover:bg-[#5b3724]" : "border-[#dfcbb8] text-[#70452d]"}>逗號分隔檔（CSV）</Button><Button type="button" variant={exportFormat === "excel" ? "default" : "outline"} onClick={() => setExportFormat("excel")} className={exportFormat === "excel" ? "bg-[#70452d] hover:bg-[#5b3724]" : "border-[#dfcbb8] text-[#70452d]"}>試算表檔（Excel）</Button></div></div><div><p className="mb-2 text-sm font-semibold text-[#70452d]">欄位預覽</p><div className="grid grid-cols-2 gap-2 rounded-xl border border-[#eadfd5] bg-white p-3 text-sm sm:grid-cols-3">{["日期", "作業類型", "貨品代號", "品項名稱", "大值進貨單價", "大值庫存數量", "單位", "小計", "備註", "操作人", "操作時間"].map(field => <span key={field} className="rounded-lg bg-[#faf3eb] px-3 py-2 text-[#806653]">{field}</span>)}</div></div><Button type="button" onClick={() => exportCsv(exportFormat)} className="w-full bg-[#70452d] hover:bg-[#5b3724]">確認下載</Button></div></DialogContent></Dialog>

  </>;
}

function AdminPage({ canCreate: _canCreate }: any) {
  const links = [
    { href: "/admin/items", title: "食包材品項設定", description: "管理品項、進貨單價、大小值單位與換算比例。", icon: Package },
    { href: "/admin/item-summary", title: "食包材彙總表", description: "依門市查看所有食包材品項並進行彙總管理。", icon: BarChart3 },
    { href: "/admin/employees", title: "員工與權限", description: "管理員工工號、角色與可使用門市。", icon: Users },
    { href: "/admin/templates", title: "多品項預設表單設定", description: "依門市設定進貨、退貨、報廢與盤點的預設品項。", icon: Settings },
    { href: "/admin/stores", title: "門市管理", description: "建立門市、地址與員工門市歸屬。", icon: Store },
    { href: "/admin/login-brand", title: "設定登入頁面", description: "上傳或替換公司 Logo，並修改登入頁顯示的公司名稱。", icon: Settings },
    { href: "/admin/inventory-timeline", title: "庫存異動時間軸", description: "依日期、員工與門市追蹤庫存及四個工作頁異動。", icon: BarChart3 },
  ];

  return <>
    <div className="mb-7">
      <p className="mb-2 text-sm text-[#a28672]">系統設定與資料管理</p>
      <h2 className="text-3xl font-semibold">後台管理</h2>
      <p className="mt-2 text-[#806653]">請選擇要管理的設定項目，系統將開啟對應的獨立設定頁。</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {links.map(({ href, title, description, icon: Icon }) => <a key={href} href={href} className="group block">
        <Card className="h-full border-[#eadfd5] bg-[#fffdf9] transition hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-center gap-3"><div className="rounded-2xl bg-[#f2e4d5] p-3 text-[#70452d]"><Icon className="h-6 w-6" /></div><h3 className="font-semibold text-[#3e2a1f]">{title}</h3></div>
            <p className="flex-1 text-sm leading-6 text-[#806653]">{description}</p>
            <span className="text-sm font-medium text-[#9b6257] group-hover:text-[#70452d]">進入獨立設定頁 →</span>
          </CardContent>
        </Card>
      </a>)}
    </div>
  </>;
}
export default function Home() { const [session, setSession] = useState<{ role: 角色; employee: string; employeeName: string; stores: 門市[] } | null>(() => { const 驗證清除 = new URLSearchParams(window.location.search).get("驗證") === "清除登入"; if (驗證清除) { localStorage.removeItem("食包材登入"); return null; } try { const saved = localStorage.getItem("食包材登入"); return saved ? JSON.parse(saved) : null; } catch { localStorage.removeItem("食包材登入"); return null; } }); if (!session) return <Login onLogin={(role, employee, employeeName, stores) => { const next = { role, employee, employeeName, stores }; localStorage.setItem("食包材登入", JSON.stringify(next)); setSession(next); }} />; return <AppShell role={session.role} employee={session.employee} employeeName={session.employeeName || session.employee} stores={session.stores ?? []} onLogout={() => { localStorage.removeItem("食包材登入"); setSession(null); }} />; }
