import { WebSocketServer } from 'ws';

export function createPresenceHub({ server, path = '/presence' }) {
  const wss = new WebSocketServer({ noServer: true });
  const peers = new Map();
  const rooms = new Map();

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== path) return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      const documentId = url.searchParams.get('documentId') || 'frontier-demo';
      const peerId = url.searchParams.get('peerId') || createPeerId();
      wss.emit('connection', ws, request, { documentId, peerId });
    });
  });

  wss.on('connection', (ws, _request, info) => {
    const documentId = info.documentId;
    const peerId = info.peerId;
    const peer = { ws, documentId, peerId, state: undefined, lastSeen: Date.now() };
    peers.set(ws, peer);
    let room = rooms.get(documentId);
    if (room === undefined) {
      room = new Map();
      rooms.set(documentId, room);
    }
    room.set(peerId, peer);
    send(ws, { kind: 'presence-snapshot', peers: snapshotRoom(room, peerId) });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(String(data));
        if (message.kind !== 'presence') return;
        peer.state = normalizePresence({ ...message, documentId, peerId });
        peer.lastSeen = Date.now();
        broadcast(documentId, { kind: 'presence-update', peer: peer.state }, peerId);
      } catch {
        ws.close(1003, 'invalid presence frame');
      }
    });
    ws.on('close', () => removePeer(ws));
    ws.on('error', () => removePeer(ws));
  });

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const peer of peers.values()) {
      if (now - peer.lastSeen > 45000) peer.ws.close(1000, 'presence timeout');
    }
  }, 15000);

  return {
    getPeerCount(documentId) {
      if (documentId !== undefined) return rooms.get(documentId)?.size ?? 0;
      return peers.size;
    },
    close() {
      clearInterval(heartbeat);
      for (const peer of peers.values()) peer.ws.close();
      wss.close();
      peers.clear();
      rooms.clear();
    }
  };

  function removePeer(ws) {
    const peer = peers.get(ws);
    if (peer === undefined) return;
    peers.delete(ws);
    const room = rooms.get(peer.documentId);
    if (room?.get(peer.peerId) === peer) {
      room.delete(peer.peerId);
      if (room.size === 0) rooms.delete(peer.documentId);
      else broadcast(peer.documentId, { kind: 'presence-leave', peerId: peer.peerId }, peer.peerId);
    }
  }

  function broadcast(documentId, message, exceptPeerId) {
    const room = rooms.get(documentId);
    if (room === undefined) return;
    for (const [peerId, peer] of room) {
      if (peerId !== exceptPeerId && peer.ws.readyState === 1) send(peer.ws, message);
    }
  }
}

function snapshotRoom(room, exceptPeerId) {
  const out = [];
  for (const [peerId, peer] of room) {
    if (peerId !== exceptPeerId && peer.state !== undefined) out.push(peer.state);
  }
  return out;
}

function normalizePresence(input) {
  const selection = input.selection && typeof input.selection === 'object'
    ? {
        anchor: clampPosition(input.selection.anchor),
        head: clampPosition(input.selection.head)
      }
    : { anchor: 0, head: 0 };
  return {
    kind: 'presence',
    documentId: String(input.documentId),
    peerId: String(input.peerId),
    name: typeof input.name === 'string' && input.name.length > 0 ? input.name.slice(0, 80) : String(input.peerId),
    color: typeof input.color === 'string' ? input.color.slice(0, 32) : '#3b82f6',
    selection,
    focus: input.focus !== false,
    updatedAt: Date.now()
  };
}

function clampPosition(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function send(ws, value) {
  ws.send(JSON.stringify(value));
}

function createPeerId() {
  return `peer-${Math.random().toString(36).slice(2, 10)}`;
}
