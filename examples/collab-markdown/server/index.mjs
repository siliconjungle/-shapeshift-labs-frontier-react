import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { createCrdtStateEngine } from '@shapeshift-labs/frontier-crdt/state';
import { createCrdtSyncEndpoint } from '@shapeshift-labs/frontier-crdt-sync';
import { createCrdtWebSocketProvider } from '@shapeshift-labs/frontier-crdt-websocket';
import { createCrdtWebSocketServer } from '@shapeshift-labs/frontier-crdt-websocket/server';
import { createPresenceHub } from './presence.mjs';
import { createFileUpdateStorage } from './storage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export async function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4173);
  const crdtPort = Number(options.crdtPort ?? process.env.FRONTIER_CRDT_PORT ?? (port === 0 ? 0 : port + 2));
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const documentId = options.documentId ?? process.env.FRONTIER_DOCUMENT_ID ?? 'frontier-demo';
  const dataDir = path.resolve(options.dataDir ?? process.env.FRONTIER_DATA_DIR ?? path.join(rootDir, '.frontier-demo-data'));
  const app = express();
  const httpServer = http.createServer(app);
  const presence = createPresenceHub({ server: httpServer });
  const crdtServer = createCrdtWebSocketServer({
    host,
    port: crdtPort,
    frameEncoding: 'binary',
    heartbeatIntervalMs: 15000,
    heartbeatTimeoutMs: 8000,
    maxFrameBytes: 2 * 1024 * 1024,
    authorizeRoom: ({ documentId: requestedDocumentId }) => {
      if (String(requestedDocumentId).length > 160) {
        return { ok: false, reason: 'document id too long' };
      }
      return true;
    }
  });

  const metrics = {
    startedAt: Date.now(),
    persistedUpdates: 0,
    storagePeerSyncs: 0
  };

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      documentId,
      peers: crdtServer.getPeerIds(documentId),
      presencePeers: presence.getPeerCount(documentId),
      crdtWsUrl: resolvedCrdtWsUrl(crdtServer, host),
      metrics
    });
  });

  const clientDist = path.join(rootDir, 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) {
        response
          .status(200)
          .type('html')
          .send('<p>Run <code>npm run build</code> before using the production server, or run <code>npm run dev:client</code> for Vite.</p>');
      }
    });
  });

  await crdtServer.ready;
  await listen(httpServer, { host, port });
  const address = httpServer.address();
  const resolvedPort = typeof address === 'object' && address !== null ? address.port : port;
  const crdtWsUrl = resolvedCrdtWsUrl(crdtServer, host);
  const storagePeer = await startStoragePeer({
    url: `${crdtWsUrl}/sync`,
    documentId,
    dataDir,
    metrics
  });

  return {
    app,
    server: httpServer,
    crdtServer,
    presence,
    storagePeer,
    url: `http://${host}:${resolvedPort}`,
    wsUrl: `ws://${host}:${resolvedPort}`,
    presenceWsUrl: `ws://${host}:${resolvedPort}`,
    crdtWsUrl,
    async close() {
      await storagePeer.close();
      presence.close();
      await crdtServer.close();
      await new Promise((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
    }
  };
}

async function startStoragePeer({ url, documentId, dataDir, metrics }) {
  const storage = createFileUpdateStorage(dataDir);
  const doc = createCrdtStateEngine({ actorId: 'server-storage' });
  const updates = await storage.loadUpdates(documentId);
  for (const update of updates) doc.applyUpdate(update);

  const endpoint = createCrdtSyncEndpoint(doc, {
    documentId,
    senderId: 'server-storage',
    actorRangeSync: true
  });
  const provider = createCrdtWebSocketProvider(endpoint, {
    url,
    documentId,
    peerId: 'server-storage',
    WebSocket,
    syncOnConnect: true,
    autoSyncOnPeerJoin: true,
    reconnect: true,
    frameEncoding: 'binary',
    heartbeatIntervalMs: 15000,
    heartbeatTimeoutMs: 8000
  });

  const unsubscribe = provider.subscribe((event) => {
    if (event.type === 'send') metrics.storagePeerSyncs++;
    if (event.type !== 'receive' || event.message?.type !== 'update' || event.message.update === undefined) return;
    metrics.persistedUpdates++;
    void storage.appendUniqueUpdate(documentId, event.message.update);
  });
  await provider.connect();
  await provider.sync();
  return {
    doc,
    provider,
    storage,
    async close() {
      unsubscribe();
      await provider.disconnect();
    }
  };
}

function listen(server, options) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  console.log(`Frontier collaborative markdown demo listening on ${server.url}`);
  console.log(`CRDT WebSocket transport listening on ${server.crdtWsUrl}`);
  console.log(`Data dir: ${path.resolve(process.env.FRONTIER_DATA_DIR ?? path.join(rootDir, '.frontier-demo-data'))}`);
}

function resolvedCrdtWsUrl(crdtServer, host) {
  const address = crdtServer.address();
  const port = typeof address === 'object' && address !== null ? address.port : Number(process.env.FRONTIER_CRDT_PORT ?? 4175);
  return `ws://${host}:${port}`;
}
