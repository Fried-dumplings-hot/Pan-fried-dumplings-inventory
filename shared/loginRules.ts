export const 登入請求逾時毫秒 = 8_000;

export async function 具備逾時<T>(promise: Promise<T>, milliseconds = 登入請求逾時毫秒): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("登入請求逾時，請稍後再試。")), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function 取得登入錯誤訊息(error: unknown): string {
  const message = error instanceof Error ? error.message : "登入服務暫時無法使用，請稍後再試。";
  return message.includes("不存在") || message.includes("停用")
    ? "此工號不存在或已停用，請洽管理員。"
    : message;
}

export async function 執行登入流程<T>(
  request: () => Promise<T>,
  milliseconds = 登入請求逾時毫秒,
): Promise<{ 成功: true; 資料: T } | { 成功: false; 訊息: string }> {
  try {
    return { 成功: true, 資料: await 具備逾時(request(), milliseconds) };
  } catch (error) {
    return { 成功: false, 訊息: 取得登入錯誤訊息(error) };
  }
}

export type 登入介面結果<T> =
  | { 載入中: false; 顯示失敗彈窗: false; 資料: T }
  | { 載入中: false; 顯示失敗彈窗: true; 訊息: string };

export async function 執行登入介面流程<T>(
  request: () => Promise<T>,
  milliseconds = 登入請求逾時毫秒,
): Promise<登入介面結果<T>> {
  const result = await 執行登入流程(request, milliseconds);
  return result.成功
    ? { 載入中: false, 顯示失敗彈窗: false, 資料: result.資料 }
    : { 載入中: false, 顯示失敗彈窗: true, 訊息: result.訊息 };
}

export async function 處理登入提交<T>(參數: {
  工號: string;
  request: (輸入: { 工號: string }) => Promise<T>;
  reset: () => void;
  onSuccess: (資料: T) => void;
  onError: (訊息: string) => void;
  milliseconds?: number;
}): Promise<void> {
  const normalized = 參數.工號.trim().toUpperCase();
  if (!normalized) {
    參數.onError("請輸入員工工號");
    return;
  }
  const result = await 執行登入介面流程(
    () => 參數.request({ 工號: normalized }),
    參數.milliseconds,
  );
  if (result.顯示失敗彈窗) {
    參數.reset();
    參數.onError(result.訊息);
  } else {
    參數.onSuccess(result.資料);
  }
}
