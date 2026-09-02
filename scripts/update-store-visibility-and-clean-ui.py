from pathlib import Path

path = Path('/home/ubuntu/yan-dumpling-inventory/client/src/pages/Home.tsx')
text = path.read_text()

replacements = [
    (
        'const storesQuery = trpc.admin.listStores.useQuery(undefined, { staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false });',
        'const storesQuery = trpc.admin.listStores.useQuery(undefined, { enabled: role === "管理員", staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false });'
    ),
    (
        'const availableStores = useMemo<門市[]>(() => storesQuery.data === undefined ? stores : storesQuery.data.map(store => ({ 編號: store.id, 門市代號: store.storeCode, 名稱: store.name, 地址: store.address })), [stores, storesQuery.data]);',
        'const availableStores = useMemo<門市[]>(() => role === "管理員" && storesQuery.data !== undefined ? storesQuery.data.map(store => ({ 編號: store.id, 門市代號: store.storeCode, 名稱: store.name, 地址: store.address })) : stores, [role, stores, storesQuery.data]);'
    ),
    (
        '<Card className="mb-6 border-[#eadfd5] bg-[#fffdf9]"><CardContent className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-[#70452d]">目前查看門市</p><p className="mt-1 text-xs text-[#a28672]">{admin ? "管理員可複選全部門市。" : "一般員工僅能查看設定的門市。"}</p></div>{admin && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedStoreIds(stores.map(store => store.編號))} className="border-[#dfcbb8] text-[#70452d]">全選</Button><Button size="sm" variant="outline" onClick={() => setSelectedStoreIds([])} className="border-[#dfcbb8] text-[#70452d]">清除</Button></div>}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{stores.length ? stores.map(store => <label key={store.編號} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selectedStoreIds.includes(store.編號) ? "border-[#cda986] bg-[#f7eadc] text-[#70452d]" : "border-[#eee4da] bg-white text-[#806653]"}`}><input type="checkbox" checked={selectedStoreIds.includes(store.編號)} disabled={!admin} onChange={() => toggleStore(store.編號)} className="h-4 w-4 accent-[#70452d]" />{store.名稱}</label>) : <p className="text-sm text-[#a28672]">目前尚未設定門市</p>}</div></CardContent></Card>',
        ''
    ),
    (
        '{storeStats.length > 0 && <div className="mt-6 grid gap-6 xl:grid-cols-2">',
        '{admin && storeStats.length > 0 && <div className="mt-6 grid gap-6 xl:grid-cols-2">'
    ),
    (
        '{usage.map(item => <div key={item.名稱}',
        '{usage.slice().sort((a, b) => String(a.貨品代號).localeCompare(String(b.貨品代號))).map(item => <div key={item.名稱}'
    ),
    (
        '{templateDifference.length > 0 && <p className="mt-1 text-xs text-[#a4513f]">套用後品項差異：{templateDifference.join("、")}</p>}',
        ''
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'找不到預期片段：{old[:100]}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('已完成首頁門市可見範圍、排序與差異提示移除。')

audit = Path('/home/ubuntu/yan-dumpling-inventory/todo.md')
todo = audit.read_text()
for old, new in [
    ('- [ ] 一般員工總覽只顯示被分派門市，隱藏管理員專用門市選擇與比較區塊', '- [x] 一般員工總覽只顯示被分派門市，隱藏管理員專用門市選擇與比較區塊'),
    ('- [ ] 品項庫存依貨品代號由小到大排序', '- [x] 品項庫存依貨品代號由小到大排序'),
    ('- [ ] 四個工作頁面的一般員工只能選擇被分派門市', '- [x] 四個工作頁面的一般員工只能選擇被分派門市'),
    ('- [ ] 移除作業視窗的「套用後品項差異」提示', '- [x] 移除作業視窗的「套用後品項差異」提示'),
]:
    todo = todo.replace(old, new, 1)
audit.write_text(todo)
print('已更新待辦完成狀態。')
