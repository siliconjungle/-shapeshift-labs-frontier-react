# Frontier React

React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.

This package sits above the Frontier runtime packages. It gives React apps a small `useSyncExternalStore` bridge without making core Frontier packages depend on React.

- npm: [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react)
- source: [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- license: MIT

## Related Packages

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): core JSON diff/apply primitives used by the patch store.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): patch-routed app-state engine.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): normalized query/result cache.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): CRDT document layer.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): sync/repo/provider layer for CRDT documents.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)

## Install

```sh
npm install react @shapeshift-labs/frontier @shapeshift-labs/frontier-react
```

Install the Frontier packages you want to wrap separately, for example `@shapeshift-labs/frontier-state`, `@shapeshift-labs/frontier-state-cache`, or `@shapeshift-labs/frontier-crdt`.

## Usage

Patch store:

```tsx
import { createFrontierPatchStore, useFrontierStore } from '@shapeshift-labs/frontier-react';

const store = createFrontierPatchStore({
  todos: [{ id: 'a', text: 'Ship', done: false }]
});

function TodoCount() {
  const count = useFrontierStore(store, (state) => state.todos.length);
  return <span>{count}</span>;
}

store.update((state) => ({
  ...state,
  todos: state.todos.concat({ id: 'b', text: 'Document', done: false })
}));
```

State engine:

```tsx
import { createStateEngine } from '@shapeshift-labs/frontier-state';
import { createFrontierStateStore, useFrontierSelector } from '@shapeshift-labs/frontier-react';

const engine = createStateEngine({ count: 0 });
const store = createFrontierStateStore(engine);

function Counter() {
  const count = useFrontierSelector(store, (state) => state.count);
  return <button onClick={() => engine.commit({ count: count + 1 })}>{count}</button>;
}
```

Query cache:

```tsx
import { createQueryCache } from '@shapeshift-labs/frontier-state-cache';
import { createFrontierQueryStore, useFrontierStore } from '@shapeshift-labs/frontier-react';

const cache = createQueryCache();
const todos = createFrontierQueryStore(cache, ['todos']);

function Todos() {
  const rows = useFrontierStore(todos) ?? [];
  return rows.map((row) => <div key={row.id}>{row.text}</div>);
}
```

CRDT state document:

```tsx
import { createCrdtStateEngine } from '@shapeshift-labs/frontier-crdt';
import { createFrontierCrdtStore, useFrontierStore } from '@shapeshift-labs/frontier-react';

const doc = createCrdtStateEngine({ actorId: 'alice' });
const store = createFrontierCrdtStore(doc);

function Title() {
  const title = useFrontierStore(store, (state) => state?.title ?? '');
  return <h1>{title}</h1>;
}
```

## API

```ts
import {
  createFrontierPatchStore,
  createFrontierStoreAdapter,
  createFrontierStateStore,
  createFrontierQueryStore,
  createFrontierEntityStore,
  createFrontierCrdtStore,
  useFrontierSnapshot,
  useFrontierStore,
  useFrontierSelector
} from '@shapeshift-labs/frontier-react';
```

### `useFrontierStore(store, selector?, equals?)`

Subscribes to a Frontier external store with React `useSyncExternalStore`. If a selector is supplied, the hook returns the selected value and reuses the previous selected value when `equals(previous, next)` returns true.

### `useFrontierSelector(store, selector, equals?)`

Alias for selected store reads. Use this when a component should render only from a small part of a larger Frontier snapshot.

### `useFrontierSnapshot(store)`

Returns the whole current snapshot from a Frontier external store.

### `createFrontierPatchStore(initial, options?)`

Creates a small immutable JSON store backed by Frontier `diff()` and `applyPatchImmutable()`.

```ts
const store = createFrontierPatchStore({ count: 0 });
const patch = store.setSnapshot({ count: 1 });
store.applyPatch(patch);
```

### `createFrontierStoreAdapter(source)`

Adapts any structural source with `getSnapshot`, `get`, `value`, or `toJSON` plus `subscribe` or `watch` into the store shape consumed by the hooks.

### `createFrontierStateStore(engine, options?)`

Wraps a Frontier state engine-like object with `get()` and `watch()`.

### `createFrontierQueryStore(cache, key)`

Wraps a Frontier state-cache query using `getQueryData()` and `watchQuery()`.

### `createFrontierEntityStore(cache, entity)`

Wraps a Frontier state-cache entity using `getEntity()` and `watchEntity()`.

### `createFrontierCrdtStore(doc, options?)`

Wraps a CRDT state document-like object with `get()` or `toJSON()` and optional `watch()`.

## Subpath Imports

```ts
import { createFrontierPatchStore } from '@shapeshift-labs/frontier-react/store';
import { useFrontierStore } from '@shapeshift-labs/frontier-react/hooks';
import { createFrontierQueryStore } from '@shapeshift-labs/frontier-react/adapters';
```

## Package Scope

This package owns:

- React `useSyncExternalStore` hooks for Frontier stores.
- A tiny Frontier patch store for local React state.
- Structural adapters for state engines, query caches, entities, and CRDT documents.
- React-facing tests, fuzzers, and package-local benchmarks.

It does not own:

- Frontier diff/apply semantics.
- State engine routing, query cache storage, CRDT documents, sync providers, WebSocket transports, rich text, or logging.
- React components, styling, Suspense data loading, server components, router bindings, auth, or persistence.

## TypeScript

The package ships ESM JavaScript plus `.d.ts` declarations for root, `./store`, `./hooks`, and `./adapters`. React is a peer dependency, so apps keep control of their React version.

## Validation

```sh
npm test
npm run fuzz
npm run bench
npm run pack:dry
```

The package test suite covers root and subpath imports, patch-store commits, patch application, React hook rendering, state-engine adapters, query/entity cache adapters, CRDT document adapters, and randomized patch-store replay.

## Benchmarks

Run the package-local benchmark:

```sh
npm run bench
```

Latest local package benchmark on Node v26.1.0, darwin arm64, 7 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| React patch store replace, 1k rows one edit | 200.74 us | 214.39 us |
| External store adapter notify 10 listeners | 0.07 us | 0.09 us |
| State engine adapter snapshot read | 0.01 us | 0.01 us |

These are Frontier-only package measurements, not competitor comparisons.

## License

MIT. See [LICENSE](./LICENSE).
