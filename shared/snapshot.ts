export type SnapshotHydrationState = {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hydrated: boolean;
};

/**
 * 只有在最新資料庫快照查詢完成、成功且尚未水合時，才允許覆寫畫面狀態。
 * 查詢快取中的舊資料不應在重新登入時先行水合。
 */
export function canHydrateSnapshot(state: SnapshotHydrationState): boolean {
  return !state.isLoading && !state.isFetching && !state.isError && !state.hydrated;
}
