export function 取得全部刪除按鈕狀態(isDeleting: boolean) {
  return {
    disabled: isDeleting,
    label: isDeleting ? "刪除中…" : "全部刪除",
    showSpinner: isDeleting,
  };
}

export function 是否可開始全部刪除(isDeleting: boolean) {
  return !isDeleting;
}

export function 取得刪除成功Toast設定() {
  return {
    duration: 10000,
    position: "bottom-right" as const,
    closeButton: true,
  };
}

