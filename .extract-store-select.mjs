import fs from 'node:fs';
const text = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');
let from = 0;
let count = 0;
while (true) {
  const index = text.indexOf('門市選擇', from);
  if (index < 0) break;
  console.log(`\n=== occurrence ${++count} @ ${index} ===\n${text.slice(Math.max(0, index - 1000), Math.min(text.length, index + 1500))}`);
  from = index + 4;
}
