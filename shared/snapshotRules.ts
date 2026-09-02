export function 判斷共用快照保存(目前版本: number, 新版本: number) {
  return {
    衝突: 新版本 <= 目前版本,
    最新版本: Math.max(目前版本, 新版本),
  };
}
