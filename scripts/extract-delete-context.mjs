import fs from 'node:fs';
const source = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');
const patterns = [
  /trpc\.[A-Za-z0-9_.]+\.useMutation\(\)/g,
  /(?:const|let|var)\s+[A-Za-z0-9_]+\s*=.*?(?:onRemove|刪除|delete).*?(?=;|\n)/g,
  /<WorkPage[\s\S]{0,1800}?>/g,
  /function WorkPage[\s\S]{0,9000}?\n\}/g,
];
for (const pattern of patterns) {
  console.log(`\\n--- ${pattern} ---`);
  for (const match of source.matchAll(pattern)) console.log(match[0].slice(0, 5000));
}
for (const needle of ['onRemove:', '刪除紀錄', 'deleteRecord', 'removeRecord', 'dailyGroups']) {
  let start = 0;
  while ((start = source.indexOf(needle, start)) >= 0) {
    console.log(`\\n--- ${needle} @ ${start} ---\\n${source.slice(Math.max(0, start - 900), start + 1800)}`);
    start += needle.length;
  }
}
