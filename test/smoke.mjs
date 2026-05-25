import assert from 'node:assert';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  createFrontierCrdtStore,
  createFrontierEntityStore,
  createFrontierPatchStore,
  createFrontierQueryStore,
  createFrontierStateStore,
  createFrontierStoreAdapter,
  useFrontierSelector,
  useFrontierSnapshot,
  useFrontierStore
} from '../dist/index.js';
import { createFrontierPatchStore as createPatchStoreSubpath } from '../dist/store.js';
import { useFrontierStore as useStoreSubpath } from '../dist/hooks.js';
import { createFrontierQueryStore as createQueryStoreSubpath } from '../dist/adapters.js';

for (const value of [
  createFrontierPatchStore,
  createFrontierStoreAdapter,
  createFrontierStateStore,
  createFrontierQueryStore,
  createFrontierCrdtStore,
  useFrontierSnapshot,
  useFrontierStore,
  useFrontierSelector,
  createPatchStoreSubpath,
  useStoreSubpath,
  createQueryStoreSubpath
]) {
  assert.strictEqual(typeof value, 'function');
}

const store = createFrontierPatchStore({ count: 1, label: 'one' });
let notifications = 0;
const unsubscribe = store.subscribe(() => {
  notifications++;
});
const patch = store.setSnapshot({ count: 2, label: 'one' });
assert.strictEqual(patch.length > 0, true);
assert.deepStrictEqual(store.getSnapshot(), { count: 2, label: 'one' });
assert.strictEqual(notifications, 1);
store.applyPatch([[0, ['label'], 'two']]);
assert.deepStrictEqual(store.getSnapshot(), { count: 2, label: 'two' });
assert.strictEqual(store.getPatchLog().length, 2);
store.clearPatchLog();
assert.strictEqual(store.getPatchLog().length, 0);
unsubscribe();

let latestCount = -1;
let latestLabel = '';
let renderCount = 0;
function Counter() {
  renderCount++;
  latestCount = useFrontierStore(store, (snapshot) => snapshot.count);
  latestLabel = useFrontierSelector(store, (snapshot) => snapshot.label);
  return React.createElement('span', null, `${latestCount}:${latestLabel}`);
}

let renderer;
await act(async () => {
  renderer = TestRenderer.create(React.createElement(Counter));
});
assert.strictEqual(latestCount, 2);
assert.strictEqual(latestLabel, 'two');
assert.strictEqual(renderer.toJSON().children[0], '2:two');

await act(async () => {
  store.update((current) => ({ ...current, count: current.count + 1 }));
});
assert.strictEqual(latestCount, 3);
assert.strictEqual(renderer.toJSON().children[0], '3:two');
assert.ok(renderCount >= 2);

const queryCache = createFakeQueryCache();
queryCache.write(['todos'], [{ id: 'a', done: false }]);
const queryStore = createFrontierQueryStore(queryCache, ['todos']);
assert.deepStrictEqual(queryStore.getSnapshot(), [{ id: 'a', done: false }]);
let queryEvents = 0;
const unsubscribeQuery = queryStore.subscribe(() => {
  queryEvents++;
});
queryCache.write(['todos'], [{ id: 'a', done: true }]);
assert.strictEqual(queryEvents, 1);
assert.deepStrictEqual(queryStore.getSnapshot(), [{ id: 'a', done: true }]);
unsubscribeQuery();

const entityStore = createFrontierEntityStore(queryCache, { id: 'todo:a' });
queryCache.writeEntity({ id: 'todo:a', done: false });
assert.deepStrictEqual(entityStore.getSnapshot(), { id: 'todo:a', done: false });

const state = createFakeStateEngine({ title: 'draft' });
const stateStore = createFrontierStateStore(state);
let stateEvents = 0;
const unsubscribeState = stateStore.subscribe(() => {
  stateEvents++;
});
state.set({ title: 'published' });
assert.strictEqual(stateEvents, 1);
assert.deepStrictEqual(stateStore.getSnapshot(), { title: 'published' });
unsubscribeState();

const crdt = createFakeCrdtDocument({ body: 'hello' });
const crdtStore = createFrontierCrdtStore(crdt);
let crdtEvents = 0;
const unsubscribeCrdt = crdtStore.subscribe(() => {
  crdtEvents++;
});
crdt.set({ body: 'hello world' });
assert.strictEqual(crdtEvents, 1);
assert.deepStrictEqual(crdtStore.getSnapshot(), { body: 'hello world' });
unsubscribeCrdt();

console.log('frontier-react smoke passed');

function createFakeQueryCache() {
  const queries = new Map();
  const entities = new Map();
  const queryListeners = new Map();
  const entityListeners = new Map();
  const keyOf = (key) => JSON.stringify(key);
  const notify = (listeners, key) => {
    for (const listener of listeners.get(key) ?? []) listener();
  };
  return {
    write(key, value) {
      const hash = keyOf(key);
      queries.set(hash, value);
      notify(queryListeners, hash);
    },
    writeEntity(value) {
      entities.set(value.id, value);
      notify(entityListeners, value.id);
    },
    getQueryData(key) {
      return queries.get(keyOf(key));
    },
    watchQuery(key, listener) {
      const hash = keyOf(key);
      const listeners = queryListeners.get(hash) ?? new Set();
      listeners.add(listener);
      queryListeners.set(hash, listeners);
      return { unsubscribe: () => listeners.delete(listener) };
    },
    getEntity(entity) {
      return entities.get(entity.id);
    },
    watchEntity(entity, listener) {
      const listeners = entityListeners.get(entity.id) ?? new Set();
      listeners.add(listener);
      entityListeners.set(entity.id, listeners);
      return { unsubscribe: () => listeners.delete(listener) };
    }
  };
}

function createFakeStateEngine(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const listener of listeners) listener();
    },
    watch(_path, listener) {
      listeners.add(listener);
      return { unsubscribe: () => listeners.delete(listener) };
    }
  };
}

function createFakeCrdtDocument(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    toJSON: () => value,
    set(next) {
      value = next;
      for (const listener of listeners) listener();
    },
    watch(_path, listener) {
      listeners.add(listener);
      return { unsubscribe: () => listeners.delete(listener) };
    }
  };
}
