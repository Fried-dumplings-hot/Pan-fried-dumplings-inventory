export type 共享異動 = {
  id: number;
  類型: string;
  品項: string;
  數量: number;
  操作人?: string;
};

export type 共享資料狀態 = {
  異動: 共享異動[];
};

export function 新增共享異動(狀態: 共享資料狀態, 紀錄: 共享異動): 共享資料狀態 {
  return { ...狀態, 異動: [...狀態.異動, 紀錄] };
}

export function 修改共享異動(狀態: 共享資料狀態, 紀錄: 共享異動): 共享資料狀態 {
  return { ...狀態, 異動: 狀態.異動.map((項目) => 項目.id === 紀錄.id ? 紀錄 : 項目) };
}

export function 刪除共享異動(狀態: 共享資料狀態, 紀錄編號: number): 共享資料狀態 {
  return { ...狀態, 異動: 狀態.異動.filter((項目) => 項目.id !== 紀錄編號) };
}

export function 取得共享異動(狀態: 共享資料狀態, 紀錄編號: number): 共享異動 | undefined {
  return 狀態.異動.find((項目) => 項目.id === 紀錄編號);
}
