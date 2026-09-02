import { jsPDF } from "jspdf";
import { PDF_FONT_FAMILY, PDF_METADATA_FONT_SIZE, PDF_METADATA_FONT_WEIGHT, PDF_TITLE_FONT_SIZE, PDF_TITLE_FONT_WEIGHT } from "./reportPdfStyle";

export type 作業紀錄PDF列 = {
  日期: string;
  貨品代號: string;
  品項名稱: string;
  單價: number;
  單位: string;
  數量: number;
  小計: number;
  操作人: string;
  操作時間: string;
};

type 作業紀錄PDF選項 = {
  報表名稱: string;
  門市名稱: string;
  開始日期: string;
  結束日期: string;
  製表人: string;
  列印時間: string;
  檔名前綴?: string;
};

type 表格列 =
  | { 類型: "明細"; 資料: 作業紀錄PDF列 }
  | { 類型: "品項合計"; 品項名稱: string; 小計: number }
  | { 類型: "報表總計"; 小計: number };

const 欄位 = [
  { title: "日期", width: 95, align: "left" },
  { title: "貨品代號", width: 80, align: "left" },
  { title: "品項名稱", width: 170, align: "left" },
  { title: "單價", width: 75, align: "right" },
  { title: "單位", width: 50, align: "center" },
  { title: "數量", width: 70, align: "right" },
  { title: "小計", width: 80, align: "right" },
  { title: "操作人", width: 150, align: "left" },
  { title: "操作時間", width: 200, align: "left" },
] as const;

const 貨幣 = (value: number) => `$${Number(value || 0).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const 數字 = (value: number) => Number(value || 0).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const escapeXml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const safeFilename = (value: string) => value.replaceAll(/[\\/:*?"<>|]/g, "_");

function 建立表格列(rows: 作業紀錄PDF列[]): 表格列[] {
  const grouped = new Map<string, 作業紀錄PDF列[]>();
  rows.forEach(row => {
    const key = `${row.貨品代號}|${row.品項名稱}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });
  const output: 表格列[] = [];
  Array.from(grouped.values()).forEach((group: 作業紀錄PDF列[]) => {
    group.forEach((row: 作業紀錄PDF列) => output.push({ 類型: "明細", 資料: row }));
    output.push({ 類型: "品項合計", 品項名稱: group[0]?.品項名稱 ?? "", 小計: group.reduce((sum: number, row: 作業紀錄PDF列) => sum + row.小計, 0) });
  });
  output.push({ 類型: "報表總計", 小計: rows.reduce((sum, row) => sum + row.小計, 0) });
  return output;
}

function buildPageSvg(rows: 表格列[], page: number, totalPages: number, options: 作業紀錄PDF選項) {
  const width = 1122;
  const height = 794;
  const margin = 76;
  const tableWidth = 欄位.reduce((sum, column) => sum + column.width, 0);
  const tableX = (width - tableWidth) / 2;
  const headerY = 78;
  const headerHeight = 42;
  const rowHeight = 35;
  const font = PDF_FONT_FAMILY;
  const text = (value: unknown, x: number, y: number, size: number, anchor = "start", weight = 400, fill = "#111111") => `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escapeXml(value)}</text>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>`;
  svg += text(options.報表名稱, margin, 48, PDF_TITLE_FONT_SIZE, "start", PDF_TITLE_FONT_WEIGHT, "#111111");
  svg += text(`門市：${options.門市名稱}　查詢日期：${options.開始日期} 至 ${options.結束日期}`, margin + 230, 48, PDF_METADATA_FONT_SIZE, "start", PDF_METADATA_FONT_WEIGHT, "#111111");
  svg += text(`製表人：${options.製表人}　列印時間：${options.列印時間}`, width - margin, 28, 11, "end", 400, "#111111");
  svg += `<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight}" fill="#d9d9d9" stroke="#999999"/>`;
  let x = tableX;
  for (const column of 欄位) {
    const anchor = column.align === "right" ? "end" : column.align === "center" ? "middle" : "start";
    const tx = column.align === "right" ? x + column.width - 9 : column.align === "center" ? x + column.width / 2 : x + 9;
    svg += text(column.title, tx, headerY + 26, 11, anchor, 700, "#111111");
    x += column.width;
    if (x < tableX + tableWidth) svg += `<line x1="${x}" y1="${headerY}" x2="${x}" y2="${headerY + headerHeight + rowHeight * rows.length}" stroke="#aaaaaa"/>`;
  }
  rows.forEach((row, index) => {
    const y = headerY + headerHeight + index * rowHeight;
    const fill = row.類型 === "報表總計" ? "#777777" : row.類型 === "品項合計" ? "#eeeeee" : "#ffffff";
    const color = row.類型 === "報表總計" ? "#ffffff" : "#111111";
    svg += `<rect x="${tableX}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${fill}" stroke="#c5c5c5"/>`;
    if (row.類型 === "明細") {
      const data = row.資料;
      const values = [data.日期, data.貨品代號, data.品項名稱, 貨幣(data.單價), data.單位, 數字(data.數量), 貨幣(data.小計), data.操作人 || "—", data.操作時間 || "—"];
      let cellX = tableX;
      values.forEach((value, cellIndex) => {
        const column = 欄位[cellIndex];
        const anchor = column.align === "right" ? "end" : column.align === "center" ? "middle" : "start";
        const tx = column.align === "right" ? cellX + column.width - 9 : column.align === "center" ? cellX + column.width / 2 : cellX + 9;
        svg += text(value, tx, y + 23, 10, anchor, cellIndex === 2 ? 600 : 400, color);
        cellX += column.width;
      });
    } else if (row.類型 === "品項合計") {
      const subtotalX = tableX + 欄位.slice(0, 6).reduce((sum, column) => sum + column.width, 0);
      svg += text(`${row.品項名稱} 合計`, tableX + 9, y + 23, 10, "start", 700, color);
      svg += text(貨幣(row.小計), subtotalX + 欄位[6].width - 9, y + 23, 10, "end", 700, color);
    } else {
      const subtotalX = tableX + 欄位.slice(0, 6).reduce((sum, column) => sum + column.width, 0);
      svg += text("報表總計", tableX + 9, y + 23, 10, "start", 700, color);
      svg += text(貨幣(row.小計), subtotalX + 欄位[6].width - 9, y + 23, 10, "end", 700, color);
    }
  });
  svg += `<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight + rowHeight * rows.length}" fill="none" stroke="#888888"/>`;
  svg += text(`本頁 ${rows.filter(row => row.類型 === "明細").length} 筆`, margin, height - 38, 11, "start", 400, "#111111");
  svg += text(`第 ${page} 頁／共 ${totalPages} 頁`, width - margin, height - 38, 11, "end", 400, "#111111");
  return `${svg}</svg>`;
}

function svgToPng(svg: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2244;
      canvas.height = 1588;
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("無法建立 PDF 圖像畫布")); return; }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法轉換 PDF 表格內容")); };
    image.src = url;
  });
}

export function 建立作業紀錄PDF列(rows: 作業紀錄PDF列[]) {
  return 建立表格列(rows);
}

export async function 下載作業紀錄PDF(rows: 作業紀錄PDF列[], options: 作業紀錄PDF選項) {
  const tableRows = 建立表格列(rows);
  const rowsPerPage = 13;
  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  for (let page = 1; page <= totalPages; page += 1) {
    if (page > 1) pdf.addPage("a4", "landscape");
    const pageRows = tableRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const png = await svgToPng(buildPageSvg(pageRows, page, totalPages, options));
    pdf.addImage(png, "PNG", 0, 0, 297, 210, undefined, "FAST");
  }
  const prefix = options.檔名前綴 ?? options.報表名稱;
  pdf.save(`${safeFilename(prefix)}_${safeFilename(options.門市名稱)}_${options.開始日期}至${options.結束日期}.pdf`);
}
