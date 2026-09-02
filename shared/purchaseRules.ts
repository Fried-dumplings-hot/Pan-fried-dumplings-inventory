export function 驗證單價輸入(value: string): { valid: boolean; message?: string } {
  if (value.trim() === "") return { valid: false, message: "請輸入單價" };
  if (!/^\d+(?:\.\d{0,2})?$/.test(value) || Number(value) < 0) return { valid: false, message: "單價不可為負數，小數最多兩位" };
  return { valid: true };
}

export function 計算進貨小計(price: number, quantity: number): number {
  return Number((Math.max(0, price) * Math.max(0, quantity)).toFixed(2));
}
