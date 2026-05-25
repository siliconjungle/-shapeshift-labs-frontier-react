import {
  applyPatchImmutable,
  cloneJson,
  diff,
  equalsJsonFast
} from '@shapeshift-labs/frontier';
import type { JsonValue, Patch } from '@shapeshift-labs/frontier';
import type {
  FrontierExternalStore,
  FrontierPatchStore,
  FrontierPatchStoreOptions,
  FrontierStoreAdapterSource,
  FrontierStoreListener,
  FrontierStoreUnsubscribe
} from './types.js';

export function createFrontierPatchStore<TSnapshot extends JsonValue>(
  initial: TSnapshot,
  options: FrontierPatchStoreOptions<TSnapshot> = {}
): FrontierPatchStore<TSnapshot> {
  const clone = options.clone ?? ((value: TSnapshot) => cloneJson(value) as TSnapshot);
  const equals = options.equals ?? ((left: TSnapshot, right: TSnapshot) => equalsJsonFast(left, right));
  const recordPatches = options.recordPatches !== false;
  const listeners = new Set<FrontierStoreListener>();
  const patchLog: Patch[] = [];
  let snapshot = clone(initial);

  function emit(): void {
    const current = Array.from(listeners);
    for (let i = 0; i < current.length; i++) current[i]!();
  }

  function commit(nextInput: TSnapshot): Patch {
    const next = clone(nextInput);
    if (equals(snapshot, next)) return [];
    const patch = diff(snapshot, next);
    snapshot = next;
    if (recordPatches && patch.length > 0) patchLog[patchLog.length] = patch;
    emit();
    return patch;
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSnapshot(next) {
      return commit(typeof next === 'function' ? (next as (previous: TSnapshot) => TSnapshot)(snapshot) : next);
    },
    replace(next) {
      return commit(next);
    },
    update(updater) {
      return commit(updater(snapshot));
    },
    applyPatch(patch) {
      if (patch.length === 0) return snapshot;
      snapshot = applyPatchImmutable(snapshot, patch) as TSnapshot;
      if (recordPatches) patchLog[patchLog.length] = patch;
      emit();
      return snapshot;
    },
    getPatchLog: () => patchLog,
    clearPatchLog() {
      patchLog.length = 0;
    }
  };
}

export function createFrontierStoreAdapter<TSnapshot>(
  source: FrontierStoreAdapterSource<TSnapshot>
): FrontierExternalStore<TSnapshot> {
  const getSnapshot = resolveSnapshotReader(source);
  return {
    getSnapshot,
    getServerSnapshot: source.getServerSnapshot ?? getSnapshot,
    subscribe(listener) {
      if (typeof source.subscribe === 'function') return normalizeUnsubscribe(source.subscribe(listener));
      if (typeof source.watch === 'function') return normalizeUnsubscribe(source.watch('', listener));
      return noop;
    }
  };
}

function resolveSnapshotReader<TSnapshot>(source: FrontierStoreAdapterSource<TSnapshot>): () => TSnapshot {
  if (typeof source.getSnapshot === 'function') return () => source.getSnapshot!();
  if (typeof source.get === 'function') return () => source.get!();
  if (typeof source.value === 'function') return () => source.value!();
  if (typeof source.toJSON === 'function') return () => source.toJSON!();
  throw new TypeError('Frontier React store adapter source needs getSnapshot(), get(), value(), or toJSON()');
}

export function normalizeUnsubscribe(value: unknown): FrontierStoreUnsubscribe {
  if (typeof value === 'function') return value as FrontierStoreUnsubscribe;
  if (value !== null && typeof value === 'object') {
    const subscription = value as { unsubscribe?: () => void; dispose?: () => void };
    if (typeof subscription.unsubscribe === 'function') return () => subscription.unsubscribe!();
    if (typeof subscription.dispose === 'function') return () => subscription.dispose!();
  }
  return noop;
}

function noop(): void {}
