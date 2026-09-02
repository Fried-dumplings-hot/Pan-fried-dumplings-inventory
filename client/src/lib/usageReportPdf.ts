import { jsPDF } from "jspdf";
import type { 食包材用量報表列 } from "@shared/reportRules";
import { PDF_FONT_FAMILY, PDF_METADATA_FONT_SIZE, PDF_METADATA_FONT_WEIGHT, PDF_TITLE_FONT_SIZE, PDF_TITLE_FONT_WEIGHT } from "./reportPdfStyle";

type 用量報表PDF選項 = {
  startDate: string;
  endDate: string;
  storeLabel: string;
  製表人: string;
  列印時間: string;
};

const 欄位 = [
  { title: "貨品代號", width: 92, align: "left" },
  { title: "品項名稱", width: 205, align: "left" },
  { title: "單價", width: 78, align: "right" },
  { title: "單位", width: 62, align: "center" },
  { title: "庫存數量（盤點前）", width: 125, align: "right" },
  { title: "庫存數量（盤點後）", width: 125, align: "right" },
  { title: "使用量", width: 84, align: "right" },
  { title: "成本", width: 92, align: "right" },
  { title: "庫存價值", width: 109, align: "right" },
] as const;

const 貨幣 = (value: number) => `$${value.toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const 數字 = (value: number) => value.toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const escapeXml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function buildPageSvg(rows: 食包材用量報表列[], page: number, totalPages: number, options: 用量報表PDF選項, totals: { 成本: number; 庫存價值: number }) {
  const width = 1122;
  const height = 794;
  const margin = 76;
  const tableWidth = 欄位.reduce((sum, column) => sum + column.width, 0);
  const tableX = (width - tableWidth) / 2;
  const headerY = 78;
  const headerHeight = 42;
  const rowHeight = 39;
  const font = PDF_FONT_FAMILY;
  const text = (value: unknown, x: number, y: number, size: number, anchor: string = "start", weight = 400, fill = "#111111") => `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escapeXml(value)}</text>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>`;
  svg += text("食包材用量報表", margin, 48, PDF_TITLE_FONT_SIZE, "start", PDF_TITLE_FONT_WEIGHT, "#111111");
  svg += text(`門市：${options.storeLabel}　查詢日期：${options.startDate} 至 ${options.endDate}`, margin + 230, 48, PDF_METADATA_FONT_SIZE, "start", PDF_METADATA_FONT_WEIGHT, "#111111");
  svg += text(`製表人：${options.製表人}　列印時間：${options.列印時間}`, width - margin, 28, 11, "end", 400, "#111111");
  svg += `<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight}" rx="2" fill="#d9d9d9" stroke="#a9a9a9"/>`;
  let x = tableX;
  for (const column of 欄位) {
    const anchor = column.align === "right" ? "end" : column.align === "center" ? "middle" : "start";
    const tx = column.align === "right" ? x + column.width - 10 : column.align === "center" ? x + column.width / 2 : x + 10;
    svg += text(column.title, tx, headerY + 26, 11, anchor, 700, "#222222");
    x += column.width;
    if (x < tableX + tableWidth) svg += `<line x1="${x}" y1="${headerY}" x2="${x}" y2="${headerY + headerHeight + rowHeight * rows.length}" stroke="#b8b8b8"/>`;
  }
  rows.forEach((row, index) => {
    const y = headerY + headerHeight + index * rowHeight;
    svg += `<rect x="${tableX}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${index % 2 === 0 ? "#ffffff" : "#fafafa"}" stroke="#cfcfcf"/>`;
    const values = [row.貨品代號, row.品項名稱, 貨幣(row.單價), row.單位, 數字(row.庫存數量盤點前), 數字(row.庫存數量盤點後), 數字(row.使用量), 貨幣(row.成本), 貨幣(row.庫存價值)];
    let cellX = tableX;
    values.forEach((value, cellIndex) => {
      const column = 欄位[cellIndex];
      const anchor = column.align === "right" ? "end" : column.align === "center" ? "middle" : "start";
      const tx = column.align === "right" ? cellX + column.width - 10 : column.align === "center" ? cellX + column.width / 2 : cellX + 10;
      svg += text(value, tx, y + 25, 11, anchor, cellIndex === 1 ? 600 : 400, "#3e2a1f");
      cellX += column.width;
    });
  });
  const totalRowY = headerY + headerHeight + rowHeight * rows.length;
  if (page === totalPages) {
    svg += `<rect x="${tableX}" y="${totalRowY}" width="${tableWidth}" height="${rowHeight}" fill="#666666" stroke="#555555"/>`;
    const totalValueX = tableX + 欄位.slice(0, 7).reduce((sum, column) => sum + column.width, 0);
    const totalInventoryX = tableX + 欄位.slice(0, 8).reduce((sum, column) => sum + column.width, 0);
    svg += text("總計", tableX + 10, totalRowY + 25, 11, "start", 700, "#ffffff");
    svg += text(貨幣(totals.成本), totalValueX + 欄位[7].width - 10, totalRowY + 25, 11, "end", 700, "#ffffff");
    svg += text(貨幣(totals.庫存價值), totalInventoryX + 欄位[8].width - 10, totalRowY + 25, 11, "end", 700, "#ffffff");
  }
  svg += `<rect x="${tableX}" y="${headerY}" width="${tableWidth}" height="${headerHeight + rowHeight * rows.length + (page === totalPages ? rowHeight : 0)}" fill="none" stroke="#999999"/>`;
  svg += text(`本頁 ${rows.length} 筆`, margin, height - 38, 11, "start", 400, "#111111");
  svg += text(`第 ${page} 頁／共 ${totalPages} 頁`, width - margin, height - 38, 11, "end", 400, "#111111");
  svg += "</svg>";
  return svg;
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
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("無法建立 PDF 圖像畫布"));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("無法轉換 PDF 表格內容"));
    };
    image.src = url;
  });
}

export async function 下載食包材用量報表PDF(rows: 食包材用量報表列[], options: 用量報表PDF選項) {
  const rowsPerPage = 13;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  for (let page = 1; page <= totalPages; page += 1) {
    if (page > 1) pdf.addPage("a4", "landscape");
    const pageRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const totals = rows.reduce((sum, row) => ({ 成本: sum.成本 + row.成本, 庫存價值: sum.庫存價值 + row.庫存價值 }), { 成本: 0, 庫存價值: 0 });
    const png = await svgToPng(buildPageSvg(pageRows, page, totalPages, options, totals));
    pdf.addImage(png, "PNG", 0, 0, 297, 210, undefined, "FAST");
  }
  const safeStore = options.storeLabel.replaceAll(/[\\/:*?"<>|]/g, "_");
  pdf.save(`食包材用量報表_${safeStore}_${options.startDate}至${options.endDate}.pdf`);
}
