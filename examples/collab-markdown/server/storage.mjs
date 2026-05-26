import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function createFileUpdateStorage(rootDir) {
  const dir = path.resolve(rootDir);
  const queues = new Map();

  async function readDocument(documentId) {
    try {
      const text = await fs.readFile(filePath(dir, documentId), 'utf8');
      const value = JSON.parse(text);
      return {
        updates: Array.isArray(value.updates) ? value.updates.filter((item) => typeof item === 'string') : []
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { updates: [] };
      throw error;
    }
  }

  async function writeDocument(documentId, value) {
    await fs.mkdir(dir, { recursive: true });
    const target = filePath(dir, documentId);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
    await fs.rename(tmp, target);
  }

  function enqueue(documentId, task) {
    const previous = queues.get(documentId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    queues.set(documentId, next);
    return next.finally(() => {
      if (queues.get(documentId) === next) queues.delete(documentId);
    });
  }

  return {
    async loadSnapshot() {
      return undefined;
    },
    async saveSnapshot() {},
    async appendUpdate(documentId, update) {
      await this.appendUniqueUpdate(documentId, update);
    },
    async appendUniqueUpdate(documentId, update) {
      const encoded = encodeUpdate(update);
      await enqueue(documentId, async () => {
        const doc = await readDocument(documentId);
        if (!doc.updates.includes(encoded)) {
          doc.updates.push(encoded);
          await writeDocument(documentId, doc);
        }
      });
    },
    async replaceUpdates(documentId, updates) {
      const unique = [];
      const seen = new Set();
      for (const update of updates) {
        const encoded = encodeUpdate(update);
        if (!seen.has(encoded)) {
          seen.add(encoded);
          unique.push(encoded);
        }
      }
      await enqueue(documentId, () => writeDocument(documentId, { updates: unique }));
    },
    async compact(documentId, _snapshot, updates = []) {
      await this.replaceUpdates(documentId, updates);
    },
    async loadUpdates(documentId) {
      const doc = await readDocument(documentId);
      return doc.updates.map(decodeUpdate);
    },
    async loadMergedUpdate(documentId) {
      const updates = await this.loadUpdates(documentId);
      if (updates.length === 0) return new Uint8Array(0);
      if (updates.length === 1) return updates[0].slice();
      const { mergeCrdtUpdates } = await import('@shapeshift-labs/frontier-crdt/update');
      return mergeCrdtUpdates(updates);
    },
    async deleteDocument(documentId) {
      try {
        await fs.unlink(filePath(dir, documentId));
        return true;
      } catch (error) {
        if (error && error.code === 'ENOENT') return false;
        throw error;
      }
    },
    async listDocuments() {
      try {
        const entries = await fs.readdir(dir);
        return entries
          .filter((entry) => entry.endsWith('.json'))
          .map((entry) => decodeURIComponent(entry.slice(0, -5)))
          .sort();
      } catch (error) {
        if (error && error.code === 'ENOENT') return [];
        throw error;
      }
    },
    updateHash(update) {
      return hashUpdate(update);
    }
  };
}

function filePath(dir, documentId) {
  return path.join(dir, `${encodeURIComponent(documentId)}.json`);
}

function encodeUpdate(update) {
  const bytes = update instanceof Uint8Array
    ? update
    : ArrayBuffer.isView(update)
      ? new Uint8Array(update.buffer, update.byteOffset, update.byteLength)
      : update instanceof ArrayBuffer
        ? new Uint8Array(update)
        : new Uint8Array(0);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

function decodeUpdate(text) {
  return new Uint8Array(Buffer.from(text, 'base64'));
}

function hashUpdate(update) {
  const encoded = encodeUpdate(update);
  return createHash('sha256').update(encoded).digest('hex');
}
