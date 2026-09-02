from pathlib import Path

path = Path('/home/ubuntu/yan-dumpling-inventory/client/src/pages/Home.tsx')
text = path.read_text()

old_calc = 'const countsByDate = 統計每日筆數(list);'
new_calc = '''const countsByDate = 統計每日筆數(list);
  const dailyGroups = Object.values(list.reduce<Record<string, 異動[]>>((groups, record) => { (groups[record.日期] ||= []).push(record); return groups; }, {})).sort((a, b) => b[0].日期.localeCompare(a[0].日期));'''
if old_calc not in text:
    raise SystemExit('找不到 countsByDate 片段')
text = text.replace(old_calc, new_calc, 1)

start = text.index('<Card className="border-[#eadfd5] bg-[#fffdf9]"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#faf3eb] text-left text-[#806653]"><tr><th className="p-4">日期</th><th className="p-4">品項名稱</th><th className="p-4">數量</th><th className="p-4">備註</th><th className="p-4 text-right">操作</th></tr></thead>')
end_marker = '</CardContent></Card>\n    <div className="mt-5 grid gap-3 md:grid-cols-3">'
end = text.index(end_marker, start)
replacement = '''<Card className="border-[#eadfd5] bg-[#fffdf9]"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#faf3eb] text-left text-[#806653]"><tr><th className="p-4">日期</th><th className="p-4">筆數</th><th className="p-4">備註</th><th className="p-4 text-right">操作</th></tr></thead><tbody>{dailyGroups.length ? dailyGroups.map(dayRecords => { const first = dayRecords[0]; const notes = Array.from(new Set(dayRecords.map(record => record.備註).filter(Boolean))).join('、'); return <tr key={first.日期} className="border-t border-[#f0e7df]"><td className="p-4 font-medium">{顯示日期與星期(first.日期)}</td><td className="p-4">{dayRecords.length} 筆</td><td className="p-4 text-[#806653]">{notes || "—"}</td><td className="p-4 text-right"><div className="flex justify-end gap-1">{canModify && <Button variant="ghost" size="sm" onClick={() => onEdit(first)} className="text-[#70452d]">修改</Button>}<Button variant="ghost" size="sm" onClick={() => setViewingRecord(first)} className="text-[#806653]">查看</Button>{canDelete && <Button variant="ghost" size="sm" onClick={() => onRemove(first)} className="text-[#a4513f]">刪除</Button>}</div></td></tr>; }) : <tr><td colSpan={4} className="p-12 text-center text-[#a28672]">目前尚無{type}紀錄</td></tr>}</tbody></table></div></CardContent></Card>\n    <div className="mt-5 grid gap-3 md:grid-cols-3">'''
text = text[:start] + replacement + text[end + len(end_marker):]
path.write_text(text)
print('已完成四個工作頁同日合併單列與欄位替換')
