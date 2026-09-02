import { readFile, writeFile } from "node:fs/promises";

const path = "server/routers.ts";
const source = await readFile(path, "utf8");
const malformed = "saved?.companyName ?\\n? input.公司名稱";
if (!source.includes(malformed)) {
  throw new Error("找不到預期的品牌設定語法錯誤片段");
}
const fixed = source.replace(malformed, "saved?.companyName ?? input.公司名稱");
await writeFile(path, fixed);
