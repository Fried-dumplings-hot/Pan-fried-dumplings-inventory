import { readFile } from "node:fs/promises";
const source = await readFile("server/routers.ts", "utf8");
const marker = "公司名稱: saved";
const start = source.indexOf(marker);
console.log(JSON.stringify(source.slice(start, start + 180)));
