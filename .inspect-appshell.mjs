import fs from 'node:fs';
const s=fs.readFileSync('client/src/pages/Home.tsx','utf8');
for(const key of ['function AppShell','<Dialog open={showForm}','const openForm =','return <DashboardLayout']){const p=s.indexOf(key); console.log(`\\n### ${key} @ ${p}\\n`); if(p>=0) console.log(s.slice(Math.max(0,p-1000),Math.min(s.length,p+3000)));}
