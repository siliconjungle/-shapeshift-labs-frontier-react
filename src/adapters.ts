import { createFrontierStoreAdapter, normalizeUnsubscribe } from './store.js';
import type {
  FrontierCrdtDocumentLike,
  FrontierEntityCacheLike,
  FrontierExternalStore,
  FrontierQueryCacheLike,
  FrontierStateEngineLike,
  FrontierStateStoreOptions
} from './types.js';

export function createFrontierStateStore<TSnapshot>(
  engine: FrontierStateEngineLike<TSnapshot>,
  options: FrontierStateStoreOptions = {}
): FrontierExternalStore<TSnapshot> {
  const path = options.path ?? '';
  return createFrontierStoreAdapter({
    getSnapshot: () => engine.get(),
    subscribe: (listener) => normalizeUnsubscribe(engine.watch(path, listener))
  });
}

export function createFrontierQueryStore<TSnapshot, TQueryKey>(
  cache: FrontierQueryCacheLike<TSnapshot, TQueryKey>,
  key: TQueryKey
): FrontierExternalStore<TSnapshot | undefined> {
  return createFrontierStoreAdapter({
    getSnapshot: () => cache.getQueryData(key),
    subscribe: (listener) => normalizeUnsubscribe(cache.watchQuery(key, listener))
  });
}

export function createFrontierEntityStore<TSnapshot, TEntity>(
  cache: FrontierEntityCacheLike<TSnapshot, TEntity>,
  entity: TEntity
): FrontierExternalStore<TSnapshot | undefined> {
  return createFrontierStoreAdapter({
    getSnapshot: () => cache.getEntity(entity),
    subscribe: (listener) => normalizeUnsubscribe(cache.watchEntity(entity, listener))
  });
}

export function createFrontierCrdtStore<TSnapshot>(
  doc: FrontierCrdtDocumentLike<TSnapshot>,
  options: FrontierStateStoreOptions = {}
): FrontierExternalStore<TSnapshot> {
  const path = options.path ?? '';
  return createFrontierStoreAdapter({
    getSnapshot: () => {
      if (typeof doc.get === 'function') return doc.get();
      if (typeof doc.toJSON === 'function') return doc.toJSON();
      throw new TypeError('Frontier CRDT store needs get() or toJSON()');
    },
    subscribe: (listener) => typeof doc.watch === 'function' ? normalizeUnsubscribe(doc.watch(path, listener)) : noop
  });
}

function noop(): void {}
