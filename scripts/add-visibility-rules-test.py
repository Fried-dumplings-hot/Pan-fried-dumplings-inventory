from pathlib import Path

home = Path('/home/ubuntu/yan-dumpling-inventory/client/src/pages/Home.tsx')
text = home.read_text()
anchor = 'function AppShell({ role, employee, employeeName, stores, onLogout }: { role: 角色; employee: string; employeeName: string; stores: 門市[]; onLogout: () => void }) {'
insert = '''export function 取得角色可見門市(role: 角色, assignedStores: 門市[], allStores: 門市[]) {
  return role === "管理員" ? allStores : assignedStores;
}
export function 依貨品代號排序<T extends { 貨品代號: string }>(items: T[]) {
  return items.slice().sort((a, b) => String(a.貨品代號).localeCompare(String(b.貨品代號)));
}
'''
if insert not in text:
    if anchor not in text:
        raise SystemExit('找不到 AppShell 宣告')
    text = text.replace(anchor, insert + anchor, 1)
old = 'const availableStores = useMemo<門市[]>(() => role === "管理員" && storesQuery.data !== undefined ? storesQuery.data.map(store => ({ 編號: store.id, 門市代號: store.storeCode, 名稱: store.name, 地址: store.address })) : stores, [role, stores, storesQuery.data]);'
new = 'const availableStores = useMemo<門市[]>(() => 取得角色可見門市(role, stores, role === "管理員" && storesQuery.data !== undefined ? storesQuery.data.map(store => ({ 編號: store.id, 門市代號: store.storeCode, 名稱: store.name, 地址: store.address })) : stores), [role, stores, storesQuery.data]);'
if old not in text:
    raise SystemExit('找不到 availableStores 宣告')
text = text.replace(old, new, 1)
old_sort = '{usage.slice().sort((a, b) => String(a.貨品代號).localeCompare(String(b.貨品代號))).map(item =>'
if old_sort not in text:
    raise SystemExit('找不到 usage 排序片段')
text = text.replace(old_sort, '{依貨品代號排序(usage).map(item =>', 1)
home.write_text(text)

test = Path('/home/ubuntu/yan-dumpling-inventory/client/src/pages/Home.visibility.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";
import { 依貨品代號排序, 取得角色可見門市 } from "./Home";

describe("門市可見範圍與貨品排序", () => {
  const assigned = [{ 編號: 1, 門市代號: "00001", 名稱: "瑞豐夜市", 地址: "" }];
  const all = [...assigned, { 編號: 2, 門市代號: "90001", 名稱: "實驗", 地址: "" }];

  it("一般員工只取得被分派門市，管理員取得全部門市", () => {
    expect(取得角色可見門市("一般員工", assigned, all)).toEqual(assigned);
    expect(取得角色可見門市("管理員", assigned, all)).toEqual(all);
  });

  it("品項依貨品代號由小到大排列且不修改原陣列", () => {
    const items = [{ 貨品代號: "Z999999" }, { 貨品代號: "A010001" }];
    expect(依貨品代號排序(items).map(item => item.貨品代號)).toEqual(["A010001", "Z999999"]);
    expect(items.map(item => item.貨品代號)).toEqual(["Z999999", "A010001"]);
  });
});
''')
print('已加入可測試的門市與排序規則。')
