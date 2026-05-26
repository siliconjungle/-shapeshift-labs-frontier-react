# Frontier Collaborative Markdown Demo

One end-to-end demo for the Frontier stack:

- React UI with a CodeMirror markdown editor;
- `@shapeshift-labs/frontier-crdt` document state;
- `@shapeshift-labs/frontier-crdt-sync` endpoint/provider protocol;
- `@shapeshift-labs/frontier-crdt-websocket` binary WebSocket transport;
- reconnect, peer presence, cursors, selections, and latency telemetry;
- a small Express backend with a storage peer that persists CRDT update bytes to disk.

## Run

Install once:

```sh
npm install
```

Development uses two terminals:

```sh
npm run dev:server
npm run dev:client
```

Open [http://127.0.0.1:5174](http://127.0.0.1:5174) in two windows. The Vite client connects to the Express/presence server on `ws://127.0.0.1:4173` and the Frontier CRDT WebSocket transport on `ws://127.0.0.1:4175` by default.

Production-style local run:

```sh
npm run build
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Controls

- `?doc=my-doc` changes the shared document id.
- `?name=Alice` sets the displayed peer name.
- `?peer=alice-device-1` pins a stable peer id. Without it, each page load gets a fresh peer id so multiple tabs do not replace each other.
- `?server=ws://127.0.0.1:4173` overrides both WebSocket URLs when both are hosted together.
- `?presence=ws://127.0.0.1:4173` overrides the presence WebSocket server.
- `?crdt=ws://127.0.0.1:4175` overrides the CRDT WebSocket transport.

The backend writes update logs under `.frontier-demo-data/`. Delete that directory to reset persisted demo state.

## Validation

```sh
npm test
npm run build
```

The smoke test starts the Express/WebSocket backend, connects two Frontier CRDT peers, verifies remote text convergence, restarts a third peer from persisted server state, and checks presence fanout.
