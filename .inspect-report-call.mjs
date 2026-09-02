import fs from 'node:fs';
const source = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');
const start = source.indexOf('active === "查詢報表"');
const end = source.indexOf('}{active === "後台管理"', start);
console.log(source.slice(start, end));
