export interface PresenceSelection {
  anchor: number;
  head: number;
}

export interface PresencePeer {
  peerId: string;
  name: string;
  color: string;
  selection: PresenceSelection;
  focus: boolean;
  updatedAt?: number;
}

export type PresenceStatus = 'disconnected' | 'connecting' | 'connected';

export interface PresenceClientOptions {
  url: string;
  documentId: string;
  peerId: string;
  name: string;
  color: string;
}

export function createPresenceClient(options: PresenceClientOptions) {
  let socket: WebSocket | undefined;
  let status: PresenceStatus = 'disconnected';
  let reconnectTimer: number | undefined;
  let reconnectAttempt = 0;
  let lastPresence: PresencePeer | undefined;
  const peers = new Map<string, PresencePeer>();
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of Array.from(listeners)) listener();
  }

  function setStatus(next: PresenceStatus) {
    if (status === next) return;
    status = next;
    emit();
  }

  function connect() {
    if (socket !== undefined && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    setStatus('connecting');
    const url = new URL(`${options.url.replace(/\/$/, '')}/presence`);
    url.searchParams.set('documentId', options.documentId);
    url.searchParams.set('peerId', options.peerId);
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      reconnectAttempt = 0;
      setStatus('connected');
      if (lastPresence !== undefined) send(lastPresence.selection, lastPresence.focus);
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.kind === 'presence-snapshot' && Array.isArray(message.peers)) {
        peers.clear();
        for (const peerInput of message.peers) {
          const peer = normalizePeer(peerInput);
          if (peer !== null) peers.set(peer.peerId, peer);
        }
        emit();
      } else if (message.kind === 'presence-update') {
        const peer = normalizePeer(message.peer);
        if (peer !== null) {
          peers.set(peer.peerId, peer);
          emit();
        }
      } else if (message.kind === 'presence-leave') {
        peers.delete(String(message.peerId));
        emit();
      }
    });
    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', scheduleReconnect);
  }

  function scheduleReconnect() {
    setStatus('disconnected');
    if (reconnectTimer !== undefined) return;
    const delay = Math.min(2500, 150 * Math.pow(1.7, reconnectAttempt++));
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  function send(selection: PresenceSelection, focus = true) {
    lastPresence = {
      peerId: options.peerId,
      name: options.name,
      color: options.color,
      selection,
      focus,
      updatedAt: Date.now()
    };
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ kind: 'presence', ...lastPresence }));
  }

  return {
    connect,
    disconnect() {
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      socket?.close();
      socket = undefined;
      setStatus('disconnected');
    },
    send,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStatus: () => status,
    getPeers: () => Array.from(peers.values()).sort((left, right) => left.name.localeCompare(right.name))
  };
}

function normalizePeer(input: unknown): PresencePeer | null {
  if (input === null || typeof input !== 'object') return null;
  const value = input as Partial<PresencePeer>;
  if (typeof value.peerId !== 'string') return null;
  const selection = value.selection ?? { anchor: 0, head: 0 };
  return {
    peerId: value.peerId,
    name: typeof value.name === 'string' ? value.name : value.peerId,
    color: typeof value.color === 'string' ? value.color : '#3b82f6',
    selection: {
      anchor: clampPosition(selection.anchor),
      head: clampPosition(selection.head)
    },
    focus: value.focus !== false,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : undefined
  };
}

function clampPosition(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
