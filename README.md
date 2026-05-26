# Frontier React

React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.

This package sits above the Frontier runtime packages. It gives React apps a small `useSyncExternalStore` bridge without making core Frontier packages depend on React.

- npm: [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react)
- source: [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- license: MIT

## Related Packages

The published Frontier package family is generated from one shared package catalog so READMEs stay in sync across packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): Core JSON diff/apply, compact patch tuples, JSON Pointer, equality, clone, validation, Unicode helpers.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): Shared query-key, selector path, condition, entity identity, and table-shape primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): Patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): Stateful planned diff engine, adaptive profiles, schema plans, and engine-level history helpers.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): Patch-routed app-state subscriptions, owned commits, maintained views, and path mapping.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): Normalized query-result cache with entity/query watchers, persistence, change logs, optimistic layers, and mutation bridge.
- [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb): IndexedDB persistence adapter for Frontier state-cache snapshots.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Structured file persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql): SQL persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation, Frontier profile generation, CloudEvent envelopes, and query/table schema helpers.
- [`@shapeshift-labs/frontier-event-log`](https://www.npmjs.com/package/@shapeshift-labs/frontier-event-log): Bounded event logs, replay cursors, consumer acknowledgements, keyed compaction, checkpoints, and Frontier patch event records.
- [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging): Opt-in structured logging, browser telemetry, file sinks, exporters, benchmark traces, and Frontier patch/update summaries.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): Explicit mutation and selector plans compiled to Frontier patches or CRDT operations.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): Native CRDT documents, update tooling, awareness, branches, conflict introspection, version frames, and undo.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): CRDT sync endpoints, repo/storage/provider contracts, document URLs, local networks, model checking, forensics, and text binding contracts.
- [`@shapeshift-labs/frontier-crdt-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-websocket): WebSocket client/server transports for Frontier CRDT sync providers.
- [`@shapeshift-labs/frontier-richtext`](https://www.npmjs.com/package/@shapeshift-labs/frontier-richtext): Rich text Delta normalization/application, marks, embeds, ranges, and cursor/selection transforms for local editor integrations.
- [`@shapeshift-labs/frontier-realtime`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime): Shared realtime command, tick, snapshot, prediction, reconciliation, interpolation, rollback, message, and delta primitives.
- [`@shapeshift-labs/frontier-realtime-server`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-server): Authoritative realtime room, tick, command validation, rate-limit, session, and snapshot-history runtime.
- [`@shapeshift-labs/frontier-realtime-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-websocket): WebSocket client, wire, and Node room-server transport for Frontier realtime.
- [`@shapeshift-labs/frontier-game`](https://www.npmjs.com/package/@shapeshift-labs/frontier-game): Game-facing entity, component, player, room, ownership, spatial interest, rollback, physics, and replication helpers above realtime.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-event-log`](https://github.com/siliconjungle/-shapeshift-labs-frontier-event-log)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- [`siliconjungle/-shapeshift-labs-frontier-richtext`](https://github.com/siliconjungle/-shapeshift-labs-frontier-richtext)
- [`siliconjungle/-shapeshift-labs-frontier-realtime`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-server`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-server)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-game`](https://github.com/siliconjungle/-shapeshift-labs-frontier-game)

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

## Rich Text And Editor Bindings

`frontier-react` is the React subscription layer, not the rich-text engine. Rich text composes like this:

| Layer | Role |
| --- | --- |
| `@shapeshift-labs/frontier-richtext` | Local Delta/range/cursor helpers used while an editor is shaping local input. |
| `@shapeshift-labs/frontier-crdt` | Collaborative rich-text storage with stable CRDT text anchors, mark/embed/block sidecars, update merge, and Delta import/export. |
| `@shapeshift-labs/frontier-react` | React `useSyncExternalStore` hooks and structural adapters that let components subscribe to Frontier state/cache/CRDT snapshots. |
| Future editor bindings | CodeMirror, Monaco, ProseMirror, textarea, cursor/selection decorations, presence rendering, and editor-specific debounce/update policy. |

Use `createFrontierCrdtStore()` to subscribe React components to a CRDT document or state engine. For editor controls, keep editor-specific DOM/decorations in the app or a dedicated editor binding package, use `frontier-richtext` for local Delta/cursor transforms, and commit durable collaborative changes through `frontier-crdt`.

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
npm run bench:e2e
npm run pack:dry
```

The package test suite covers root and subpath imports, patch-store commits, patch application, React hook rendering, state-engine adapters, query/entity cache adapters, CRDT document adapters, and randomized patch-store replay.

## Benchmarks

Run the package-local benchmarks:

```sh
npm run bench
npm run bench:e2e -- --out benchmarks/results/e2e-flow-latest.json
```

Latest local package benchmark on Node v26.1.0, darwin arm64, 9 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| React patch store replace, 1k rows one edit | 224.61 us | 231.38 us |
| External store adapter notify 10 listeners | 0.08 us | 0.10 us |
| State engine adapter snapshot read | 0.01 us | 0.01 us |

Latest local full client/server React flow benchmark on Node v26.1.0, darwin arm64, 80 measured iterations after 12 warmup iterations:

| Fixture | Total median | Total p95 | Local commit | Provider sync call | Remote render wait | Update bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| E2E CRDT text insert to React render | 2.15 ms | 5.54 ms | 21.25 us | 103.00 us | 1.90 ms | 41 |
| E2E CRDT JSON set to React render | 1.86 ms | 5.82 ms | 15.50 us | 95.79 us | 1.53 ms | 50 |

These are Frontier-only package measurements, not competitor comparisons.

## License

MIT. See [LICENSE](./LICENSE).
