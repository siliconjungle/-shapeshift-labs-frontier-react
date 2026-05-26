import { createCrdtStateEngine } from '@shapeshift-labs/frontier-crdt/state';
import { createCrdtSyncEndpoint } from '@shapeshift-labs/frontier-crdt-sync';
import { createCrdtWebSocketProvider } from '@shapeshift-labs/frontier-crdt-websocket';
import { createFrontierCrdtStore } from '@shapeshift-labs/frontier-react';

export interface FrontierDemoClientOptions {
  documentId: string;
  peerId: string;
  crdtWsUrl: string;
}

export interface TextChange {
  index: number;
  deleteCount: number;
  insert: string;
}

export function createFrontierDemoClient(options: FrontierDemoClientOptions) {
  const doc = createCrdtStateEngine({ actorId: options.peerId });
  const endpoint = createCrdtSyncEndpoint(doc, {
    documentId: options.documentId,
    senderId: options.peerId,
    actorRangeSync: true
  });
  const provider = createCrdtWebSocketProvider(endpoint, {
    url: `${options.crdtWsUrl.replace(/\/$/, '')}/sync`,
    documentId: options.documentId,
    peerId: options.peerId,
    syncOnConnect: true,
    autoSyncOnPeerJoin: true,
    reconnect: true,
    reconnectDelayMs: 120,
    maxReconnectDelayMs: 2500,
    heartbeatIntervalMs: 15000,
    heartbeatTimeoutMs: 8000,
    frameEncoding: 'binary',
    maxQueuedFrames: 512,
    maxQueuedBytes: 2 * 1024 * 1024
  });
  const store = createFrontierCrdtStore<Record<string, unknown> | undefined>(doc as never);

  return {
    doc,
    endpoint,
    provider,
    store,
    connect: () => provider.connect(),
    disconnect: () => provider.disconnect(),
    sync: () => provider.sync(),
    getText() {
      const value = doc.toJSON() as { body?: unknown };
      return typeof value?.body === 'string' ? value.body : '';
    },
    applyTextChange(change: TextChange) {
      return doc.text('/body').splice(change.index, change.deleteCount, change.insert);
    }
  };
}

export function diffTextChange(previous: string, next: string): TextChange | null {
  if (previous === next) return null;
  const left = Array.from(previous);
  const right = Array.from(next);
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix + prefix < left.length &&
    suffix + prefix < right.length &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix++;
  }
  return {
    index: prefix,
    deleteCount: left.length - prefix - suffix,
    insert: right.slice(prefix, right.length - suffix).join('')
  };
}

export function applyMinimalEditorChange(
  current: string,
  next: string
): { from: number; to: number; insert: string } | null {
  if (current === next) return null;
  let prefix = 0;
  while (prefix < current.length && prefix < next.length && current.charCodeAt(prefix) === next.charCodeAt(prefix)) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix + prefix < current.length &&
    suffix + prefix < next.length &&
    current.charCodeAt(current.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix)
  ) {
    suffix++;
  }
  return {
    from: prefix,
    to: current.length - suffix,
    insert: next.slice(prefix, next.length - suffix)
  };
}
