import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createCrdtStateEngine } from '@shapeshift-labs/frontier-crdt/state';
import { createCrdtSyncEndpoint } from '@shapeshift-labs/frontier-crdt-sync';
import { createCrdtWebSocketProvider } from '@shapeshift-labs/frontier-crdt-websocket';
import { startServer } from '../server/index.mjs';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frontier-demo-'));
const documentId = `demo-${Date.now()}`;

try {
  const server = await startServer({ port: 0, dataDir, documentId });
  const alice = createPeer('alice', documentId, server.crdtWsUrl);
  const bob = createPeer('bob', documentId, server.crdtWsUrl);
  await alice.provider.connect();
  await bob.provider.connect();
  await waitFor(() => alice.provider.getPeerIds().includes('bob'));

  alice.doc.text('/body').insert(0, 'hello frontier');
  await alice.provider.sync();
  await waitFor(() => readBody(bob.doc) === 'hello frontier');
  await waitFor(async () => {
    const health = await fetchJson(`${server.url}/api/health`);
    return health.metrics.persistedUpdates > 0;
  });

  await alice.provider.disconnect();
  await bob.provider.disconnect();
  await server.close();

  const restarted = await startServer({ port: 0, dataDir, documentId });
  const charlie = createPeer('charlie', documentId, restarted.crdtWsUrl);
  await charlie.provider.connect();
  await charlie.provider.sync();
  await waitFor(() => readBody(charlie.doc) === 'hello frontier');

  const presenceA = await openPresence(restarted.presenceWsUrl, documentId, 'presence-a');
  const presenceB = await openPresence(restarted.presenceWsUrl, documentId, 'presence-b');
  const presenceSeen = waitForPresenceUpdate(presenceB);
  presenceA.send(JSON.stringify({
    kind: 'presence',
    name: 'Presence A',
    color: '#2563eb',
    selection: { anchor: 1, head: 5 },
    focus: true
  }));
  const message = await presenceSeen;
  assert.strictEqual(message.peer.peerId, 'presence-a');
  assert.deepStrictEqual(message.peer.selection, { anchor: 1, head: 5 });
  presenceA.close();
  presenceB.close();
  await charlie.provider.disconnect();
  await restarted.close();
} finally {
  await fs.rm(dataDir, { recursive: true, force: true });
}

console.log('frontier collaborative markdown demo smoke passed');

function createPeer(peerId, docId, wsUrl) {
  const doc = createCrdtStateEngine({ actorId: peerId });
  const endpoint = createCrdtSyncEndpoint(doc, {
    documentId: docId,
    senderId: peerId,
    actorRangeSync: true
  });
  const provider = createCrdtWebSocketProvider(endpoint, {
    url: `${wsUrl}/sync`,
    documentId: docId,
    peerId,
    WebSocket,
    syncOnConnect: true,
    autoSyncOnPeerJoin: true,
    reconnect: false,
    heartbeatIntervalMs: 0,
    frameEncoding: 'binary'
  });
  return { doc, provider };
}

function readBody(doc) {
  const value = doc.toJSON();
  return typeof value?.body === 'string' ? value.body : '';
}

async function openPresence(wsUrl, docId, peerId) {
  const socket = new WebSocket(`${wsUrl}/presence?documentId=${encodeURIComponent(docId)}&peerId=${encodeURIComponent(peerId)}`);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return socket;
}

function waitForPresenceUpdate(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timed out waiting for presence update')), 1500);
    socket.on('message', (data) => {
      const message = JSON.parse(String(data));
      if (message.kind === 'presence-update') {
        clearTimeout(timeout);
        resolve(message);
      }
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`request failed ${response.status}`);
  return response.json();
}

async function waitFor(predicate, timeoutMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('timed out waiting for demo smoke condition');
}
