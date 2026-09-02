import { describe, expect, it } from "vitest";
import {
  PDF_FONT_FAMILY,
  PDF_METADATA_FONT_SIZE,
  PDF_METADATA_FONT_WEIGHT,
  PDF_TITLE_FONT_SIZE,
  PDF_TITLE_FONT_WEIGHT,
} from "./reportPdfStyle";

describe("PDF 報表樣式", () => {
  it("使用微軟正黑體並符合標題字重與字級層級", () => {
    expect(PDF_FONT_FAMILY.startsWith("Microsoft JhengHei")).toBe(true);
    expect(PDF_FONT_FAMILY).toContain("微軟正黑體");
    expect(PDF_TITLE_FONT_WEIGHT).toBe(700);
    expect(PDF_METADATA_FONT_WEIGHT).toBe(400);
    expect(PDF_METADATA_FONT_SIZE).toBe(PDF_TITLE_FONT_SIZE / 2);
  });
});
