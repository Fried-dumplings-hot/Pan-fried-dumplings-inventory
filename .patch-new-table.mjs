import { readFileSync, writeFileSync } from "node:fs";

const path = "client/src/pages/Home.tsx";
const source = readFileSync(path, "utf8");
const leadStart = source.indexOf('<div data-testid="新增單據引導頁"');
const listStart = source.indexOf('<div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#eee4da] p-3">', leadStart);
const listEnd = source.indexOf('<p className="mt-1 text-xs text-[#a28672]">可同時輸入多個品項', listStart);
if (leadStart < 0 || listStart < 0 || listEnd < 0) throw new Error("找不到新增引導頁品項清單區塊");

const table = String.raw`<div className="overflow-x-auto rounded-xl border border-[#eee4da]">
  <div className={formType === "進貨" ? "min-w-[620px]" : "min-w-[420px]"}>
    <div className={formType === "進貨" ? "grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_6rem_4rem] gap-2 border-b border-[#eee4da] bg-[#faf3eb] px-3 py-2 text-xs font-semibold text-[#806653]" : "grid grid-cols-[minmax(0,1fr)_5.5rem_5rem] gap-2 border-b border-[#eee4da] bg-[#faf3eb] px-3 py-2 text-xs font-semibold text-[#806653]"}>
      <span>貨物品項</span><span className="text-center">數量</span>{formType === "進貨" && <><span className="text-center">單價</span><span className="text-center">小計</span></>}<span className="text-center">單位</span>
    </div>
    {formLines.map((line, index) => { const item = 有效品項.find(i => (line.品項編號 !== undefined && i.編號 === line.品項編號) || i.名稱 === line.品項); if (!item) return null; return <div key={line.品項} className={formType === "進貨" ? "grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_6rem_4rem] items-center gap-2 border-b border-[#f0e7de] px-3 py-3 last:border-b-0" : "grid grid-cols-[minmax(0,1fr)_5.5rem_5rem] items-center gap-2 border-b border-[#f0e7de] px-3 py-3 last:border-b-0"}>
      <div className="min-w-0"><p className="break-words font-medium leading-5"><span className="mr-1 text-xs text-[#9b6257]">{item.貨品代號}</span>{item.名稱}</p><p className="text-xs text-[#a28672]">{item.大值單位}／1 {item.大值單位}＝{item.換算比例} {item.小值單位}</p></div>
      <Input className="h-9 w-full text-center" type="number" min="0" value={line.數量} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || 驗證數量輸入(value).valid) { setNewFormDirty(true); setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 數量: value } : x)); } else toast.error("數量不可為負數，小數最多兩位"); }} placeholder="數量" />
      {formType === "進貨" && <><Input className="h-9 w-full text-center" type="number" min="0" step="0.01" value={line.單價 ?? item.單價} disabled={Boolean(viewingRecord)} onChange={e => { const value = e.target.value; if (value === "" || /^\d+(?:\.\d{0,2})?$/.test(value)) { setNewFormDirty(true); setFormLines(prev => prev.map((x, i) => i === index ? { ...x, 單價: value } : x)); } else toast.error("單價不可為負數，小數最多兩位"); }} /><span className="text-center font-semibold text-[#70452d]">\${計算進貨小計(Number(line.單價 ?? item.單價), Number(line.數量 || 0))}</span></>}
      <span className="text-center text-sm font-medium text-[#70452d]">{line.預設輸入單位 || item.大值單位}</span>
    </div>; })}
  </div>
</div>`;
writeFileSync(path, source.slice(0, listStart) + table + source.slice(listEnd));
