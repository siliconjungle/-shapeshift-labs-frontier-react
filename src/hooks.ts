import { useMemo, useSyncExternalStore } from 'react';
import type {
  FrontierEquality,
  FrontierExternalStore,
  FrontierSelector
} from './types.js';

const identity = <T>(value: T): T => value;

export function useFrontierSnapshot<TSnapshot>(store: FrontierExternalStore<TSnapshot>): TSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useFrontierStore<TSnapshot>(
  store: FrontierExternalStore<TSnapshot>
): TSnapshot;
export function useFrontierStore<TSnapshot, TSelected>(
  store: FrontierExternalStore<TSnapshot>,
  selector: FrontierSelector<TSnapshot, TSelected>,
  equals?: FrontierEquality<TSelected>
): TSelected;
export function useFrontierStore<TSnapshot, TSelected>(
  store: FrontierExternalStore<TSnapshot>,
  selector: FrontierSelector<TSnapshot, TSelected> = identity as FrontierSelector<TSnapshot, TSelected>,
  equals: FrontierEquality<TSelected> = Object.is
): TSelected {
  const getSelectedSnapshot = useMemo(
    () => createSelectedSnapshotReader(store.getSnapshot, selector, equals),
    [store, selector, equals]
  );
  const getSelectedServerSnapshot = useMemo(
    () => createSelectedSnapshotReader(store.getServerSnapshot, selector, equals),
    [store, selector, equals]
  );
  return useSyncExternalStore(store.subscribe, getSelectedSnapshot, getSelectedServerSnapshot);
}

export function useFrontierSelector<TSnapshot, TSelected>(
  store: FrontierExternalStore<TSnapshot>,
  selector: FrontierSelector<TSnapshot, TSelected>,
  equals?: FrontierEquality<TSelected>
): TSelected {
  return useFrontierStore(store, selector, equals);
}

function createSelectedSnapshotReader<TSnapshot, TSelected>(
  readSnapshot: () => TSnapshot,
  selector: FrontierSelector<TSnapshot, TSelected>,
  equals: FrontierEquality<TSelected>
): () => TSelected {
  let hasSelection = false;
  let previousSelection: TSelected;
  return () => {
    const nextSelection = selector(readSnapshot());
    if (hasSelection && equals(previousSelection!, nextSelection)) return previousSelection!;
    hasSelection = true;
    previousSelection = nextSelection;
    return nextSelection;
  };
}
