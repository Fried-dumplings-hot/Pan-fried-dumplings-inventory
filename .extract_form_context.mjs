import fs from 'node:fs';
const text = fs.readFileSync('client/src/pages/Home.tsx', 'utf8');
const needles = ['新增單據', '選擇預設表單', 'formLines.map', 'showForm &&', 'setShowForm(false)'];
for (const needle of needles) {
  let from = 0;
  let count = 0;
  while (count < 4) {
    const index = text.indexOf(needle, from);
    if (index < 0) break;
    console.log(`\n=== ${needle} @ ${index} ===\n${text.slice(Math.max(0, index - 900), Math.min(text.length, index + 2200))}`);
    from = index + needle.length;
    count++;
  }
}
