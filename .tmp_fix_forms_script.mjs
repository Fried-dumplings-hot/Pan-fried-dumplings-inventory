import fs from 'node:fs';
const path = '/home/ubuntu/yan-dumpling-inventory/.tmp_update_forms.mjs';
let s = fs.readFileSync(path, 'utf8');
s = s.replace(/localStorage\.getItem\(\x10食包材預設表單_\x10\$\{type\}\)/g, 'localStorage.getItem(`食包材預設表單_${type}`)');
s = s.replace(/\x10食包材單據草稿_\x10\$\{employee\}_\x10\$\{operationStoreId\}_\x10\$\{type\}/g, '`食包材單據草稿_${employee}_${operationStoreId}_${type}`');
fs.writeFileSync(path, s);
