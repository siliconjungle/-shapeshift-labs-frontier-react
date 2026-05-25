import type { JsonValue, Patch } from '@shapeshift-labs/frontier';

export type FrontierStoreListener = () => void;
export type FrontierStoreUnsubscribe = () => void;
export type FrontierEquality<T> = (previous: T, next: T) => boolean;
export type FrontierSelector<TSnapshot, TSelected> = (snapshot: TSnapshot) => TSelected;
export type FrontierSnapshotUpdater<T> = T | ((previous: T) => T);
export type FrontierJsonSnapshotUpdater<T extends JsonValue> = T | ((previous: T) => T);
export type FrontierWatchPath = string | readonly (string | number)[];

export interface FrontierExternalStore<TSnapshot> {
  getSnapshot(): TSnapshot;
  getServerSnapshot(): TSnapshot;
  subscribe(listener: FrontierStoreListener): FrontierStoreUnsubscribe;
}

export interface FrontierPatchStore<TSnapshot extends JsonValue> extends FrontierExternalStore<TSnapshot> {
  setSnapshot(next: FrontierJsonSnapshotUpdater<TSnapshot>): Patch;
  replace(next: TSnapshot): Patch;
  update(updater: (previous: TSnapshot) => TSnapshot): Patch;
  applyPatch(patch: Patch): TSnapshot;
  getPatchLog(): readonly Patch[];
  clearPatchLog(): void;
}

export interface FrontierPatchStoreOptions<TSnapshot extends JsonValue> {
  clone?: (value: TSnapshot) => TSnapshot;
  equals?: FrontierEquality<TSnapshot>;
  recordPatches?: boolean;
}

export interface FrontierStoreAdapterSource<TSnapshot> {
  getSnapshot?: () => TSnapshot;
  getServerSnapshot?: () => TSnapshot;
  get?: () => TSnapshot;
  value?: () => TSnapshot;
  toJSON?: () => TSnapshot;
  subscribe?: (listener: FrontierStoreListener) => FrontierStoreUnsubscribe | FrontierSubscriptionHandle | void;
  watch?: (path: FrontierWatchPath, listener: (...args: unknown[]) => void) => FrontierSubscriptionHandle | FrontierStoreUnsubscribe | void;
}

export interface FrontierSubscriptionHandle {
  unsubscribe?: () => void;
  dispose?: () => void;
}

export interface FrontierStateEngineLike<TSnapshot> {
  get(): TSnapshot;
  watch(path: FrontierWatchPath, listener: (...args: unknown[]) => void): FrontierSubscriptionHandle | FrontierStoreUnsubscribe | void;
}

export interface FrontierStateStoreOptions {
  path?: FrontierWatchPath;
}

export interface FrontierQueryCacheLike<TSnapshot, TQueryKey = unknown> {
  getQueryData(key: TQueryKey): TSnapshot | undefined;
  watchQuery(key: TQueryKey, listener: (...args: unknown[]) => void): FrontierSubscriptionHandle | FrontierStoreUnsubscribe | void;
}

export interface FrontierEntityCacheLike<TSnapshot, TEntity = unknown> {
  getEntity(entity: TEntity): TSnapshot | undefined;
  watchEntity(entity: TEntity, listener: (...args: unknown[]) => void): FrontierSubscriptionHandle | FrontierStoreUnsubscribe | void;
}

export interface FrontierCrdtDocumentLike<TSnapshot> {
  get?: () => TSnapshot;
  toJSON?: () => TSnapshot;
  watch?: (path: FrontierWatchPath, listener: (...args: unknown[]) => void) => FrontierSubscriptionHandle | FrontierStoreUnsubscribe | void;
}
