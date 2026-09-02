import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("員工工號登入的作業資料查詢", () => {
  it("品項與預設表單查詢不應依賴 OAuth 使用者工作階段", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("listItems: publicProcedure.query");
    expect(source).toContain("listFormTemplates: publicProcedure.query");
    expect(source).toContain("listFormTemplatesForStore: publicProcedure.input");
  });
});

// 工號登入由 employee.login 建立前端工作階段；作業資料查詢必須能在此工作階段下完成。
// 寫入與管理操作仍由既有的管理員或伺服器端權限程序保護。
