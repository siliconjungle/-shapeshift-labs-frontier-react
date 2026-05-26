import React, { useEffect, useMemo, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { useFrontierStore } from '@shapeshift-labs/frontier-react';
import type { FrontierExternalStore } from '@shapeshift-labs/frontier-react';
import {
  applyMinimalEditorChange,
  createFrontierDemoClient,
  diffTextChange
} from './frontier';
import {
  createPresenceClient,
  type PresencePeer,
  type PresenceStatus
} from './presence';
import {
  remotePresenceField,
  setRemotePresenceEffect
} from './codemirrorPresence';
import {
  summarizeTelemetry,
  type TelemetrySample
} from './telemetry';
import { renderMarkdown } from './markdown';
import './style.css';

type CdtStatus = 'disconnected' | 'connecting' | 'connected';

interface DemoSession {
  store: FrontierExternalStore<Record<string, unknown> | undefined>;
  disconnect(): Promise<void>;
}

export function App() {
  const config = useMemo(readConfig, []);
  const editorHost = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [crdtStatus, setCrdtStatus] = useState<CdtStatus>('connecting');
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('connecting');
  const [remotePeers, setRemotePeers] = useState<PresencePeer[]>([]);
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editorHost.current === null) return;
    let disposed = false;
    let applyingRemote = false;
    let beforeInputAt = 0;
    let syncTimer: number | undefined;
    let presenceTimer: number | undefined;
    let pendingBytes = 0;
    let pendingPatchOps = 0;

    const client = createFrontierDemoClient({
      documentId: config.documentId,
      peerId: config.peerId,
      crdtWsUrl: config.crdtWsUrl
    });
    const presence = createPresenceClient({
      url: config.presenceWsUrl,
      documentId: config.documentId,
      peerId: config.peerId,
      name: config.name,
      color: config.color
    });

    const record = (name: string, valueMs: number) => {
      if (!Number.isFinite(valueMs) || valueMs < 0) return;
      setSamples((previous) => previous.concat({ name, valueMs }).slice(-600));
    };

    const sendPresence = () => {
      const view = viewRef.current;
      if (view === null) return;
      const start = performance.now();
      const selection = view.state.selection.main;
      presence.send({
        anchor: selection.anchor,
        head: selection.head
      }, view.hasFocus);
      record('presence send', performance.now() - start);
    };

    const schedulePresence = () => {
      if (presenceTimer !== undefined) return;
      presenceTimer = window.setTimeout(() => {
        presenceTimer = undefined;
        sendPresence();
      }, 40);
    };

    const scheduleSync = () => {
      if (syncTimer !== undefined) return;
      syncTimer = window.setTimeout(() => {
        syncTimer = undefined;
        const bytes = pendingBytes;
        const patchOps = pendingPatchOps;
        pendingBytes = 0;
        pendingPatchOps = 0;
        const start = performance.now();
        void Promise.resolve(client.sync())
          .then(() => {
            record('CRDT sync call', performance.now() - start);
            record('CRDT update bytes', bytes);
            record('view patch ops', patchOps);
          })
          .catch((syncError: unknown) => setError(syncError instanceof Error ? syncError.message : String(syncError)));
      }, 18);
    };

    const view = new EditorView({
      doc: client.getText(),
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        remotePresenceField,
        EditorView.domEventHandlers({
          beforeinput: () => {
            beforeInputAt = performance.now();
            return false;
          },
          focus: () => {
            schedulePresence();
            return false;
          },
          blur: () => {
            schedulePresence();
            return false;
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !applyingRemote) {
            const previousText = client.getText();
            const nextText = update.state.doc.toString();
            const change = diffTextChange(previousText, nextText);
            if (change !== null) {
              const commitStart = performance.now();
              const result = client.applyTextChange(change);
              record('local CRDT commit', performance.now() - commitStart);
              if (beforeInputAt > 0) {
                record('local input to editor render', performance.now() - beforeInputAt);
                beforeInputAt = 0;
              }
              pendingBytes += result.update.byteLength;
              pendingPatchOps += result.viewPatch.length;
              scheduleSync();
            }
          }
          if (update.docChanged || update.selectionSet || update.focusChanged) schedulePresence();
        })
      ],
      parent: editorHost.current
    });
    viewRef.current = view;

    const unsubscribeStore = client.store.subscribe(() => {
      const nextText = client.getText();
      const currentText = view.state.doc.toString();
      const change = applyMinimalEditorChange(currentText, nextText);
      if (change === null) return;
      applyingRemote = true;
      const start = performance.now();
      view.dispatch({ changes: change });
      applyingRemote = false;
      requestAnimationFrame(() => record('remote apply to editor render', performance.now() - start));
      schedulePresence();
    });

    const unsubscribeProvider = client.provider.subscribe((event) => {
      if (event.type === 'status') setCrdtStatus(event.status as CdtStatus);
      if (event.type === 'receive') record('remote sync message received', 0);
    });

    const unsubscribePresence = presence.subscribe(() => {
      const peers = presence.getPeers();
      setPresenceStatus(presence.getStatus());
      setRemotePeers(peers);
      const decorationStart = performance.now();
      view.dispatch({ effects: setRemotePresenceEffect.of(peers) });
      requestAnimationFrame(() => record('presence decoration update', performance.now() - decorationStart));
    });

    setSession({
      store: client.store,
      disconnect: async () => {
        unsubscribePresence();
        unsubscribeProvider();
        unsubscribeStore();
        presence.disconnect();
        await client.disconnect();
      }
    });

    presence.connect();
    void Promise.resolve(client.connect())
      .then(() => {
        if (!disposed) {
          setCrdtStatus(client.provider.status as CdtStatus);
          void client.sync();
        }
      })
      .catch((connectError: unknown) => {
        if (!disposed) setError(connectError instanceof Error ? connectError.message : String(connectError));
      });
    sendPresence();

    return () => {
      disposed = true;
      if (syncTimer !== undefined) window.clearTimeout(syncTimer);
      if (presenceTimer !== undefined) window.clearTimeout(presenceTimer);
      view.destroy();
      viewRef.current = null;
      unsubscribePresence();
      unsubscribeProvider();
      unsubscribeStore();
      presence.disconnect();
      void client.disconnect();
      setSession(null);
    };
  }, [config]);

  const telemetry = summarizeTelemetry(samples);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Frontier demo</p>
          <h1>Collaborative Markdown</h1>
        </div>
        <div className="status-strip" aria-label="Connection status">
          <StatusPill label="CRDT" value={crdtStatus} />
          <StatusPill label="Presence" value={presenceStatus} />
        </div>
      </header>

      <section className="workspace">
        <div className="editor-pane">
          <div className="pane-header">
            <span>Editor</span>
            <span className="doc-id">{config.documentId}</span>
          </div>
          <div ref={editorHost} className="editor-host" />
        </div>
        <div className="preview-pane">
          <div className="pane-header">
            <span>Preview</span>
            <span>{remotePeers.length} remote peer{remotePeers.length === 1 ? '' : 's'}</span>
          </div>
          {session === null ? <div className="preview-empty">Connecting...</div> : <MarkdownPreview store={session.store} />}
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="pane-header">
            <span>Presence</span>
            <span>{config.name}</span>
          </div>
          <div className="peer-list">
            <PeerBadge peer={{ peerId: config.peerId, name: `${config.name} (you)`, color: config.color, selection: { anchor: 0, head: 0 }, focus: true }} />
            {remotePeers.map((peer) => <PeerBadge key={peer.peerId} peer={peer} />)}
          </div>
        </div>
        <div className="panel">
          <div className="pane-header">
            <span>Latency Telemetry</span>
            <span>last {samples.length} samples</span>
          </div>
          <table className="telemetry">
            <tbody>
              {telemetry.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{formatMs(row.medianMs)}</td>
                  <td>{formatMs(row.p95Ms)} p95</td>
                </tr>
              ))}
            </tbody>
          </table>
          {error !== null && <p className="error">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function MarkdownPreview({ store }: { store: FrontierExternalStore<Record<string, unknown> | undefined> }) {
  const text = useFrontierStore(store, (state) => typeof state?.body === 'string' ? state.body : '');
  return <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return <span className={`status-pill status-${value}`}>{label}: {value}</span>;
}

function PeerBadge({ peer }: { peer: PresencePeer }) {
  const from = Math.min(peer.selection.anchor, peer.selection.head);
  const to = Math.max(peer.selection.anchor, peer.selection.head);
  return (
    <div className="peer-badge">
      <span className="peer-dot" style={{ background: peer.color }} />
      <span>{peer.name}</span>
      <small>{from === to ? `cursor ${from}` : `selection ${from}-${to}`}</small>
    </div>
  );
}

function readConfig() {
  const params = new URLSearchParams(window.location.search);
  const peerId = params.get('peer') || createPeerId();
  const name = params.get('name') || defaultName(peerId);
  return {
    documentId: params.get('doc') || 'frontier-demo',
    peerId,
    name,
    color: colorFor(peerId),
    crdtWsUrl: params.get('crdt') || params.get('server') || defaultCrdtWsUrl(),
    presenceWsUrl: params.get('presence') || params.get('server') || defaultPresenceWsUrl()
  };
}

function defaultPresenceWsUrl() {
  if (window.location.port === '5174') return 'ws://127.0.0.1:4173';
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
}

function defaultCrdtWsUrl() {
  if (window.location.port === '5174') return 'ws://127.0.0.1:4175';
  if (window.location.port === '4173') return 'ws://127.0.0.1:4175';
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:4175`;
}

function createPeerId() {
  return window.crypto?.randomUUID?.() ?? `peer-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultName(peerId: string) {
  return `Editor ${peerId.slice(0, 4)}`;
}

function colorFor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 78% 48%)`;
}

function formatMs(value: number) {
  if (value >= 100) return `${value.toFixed(0)} ms`;
  if (value >= 10) return `${value.toFixed(1)} ms`;
  return `${value.toFixed(2)} ms`;
}
