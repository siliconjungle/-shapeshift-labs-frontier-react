import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { WebSocket } from 'ws';
import { createCrdtStateEngine } from '@shapeshift-labs/frontier-crdt/state';
import { createCrdtSyncEndpoint } from '@shapeshift-labs/frontier-crdt-sync';
import { createCrdtWebSocketProvider } from '@shapeshift-labs/frontier-crdt-websocket';
import { createCrdtWebSocketServer } from '@shapeshift-labs/frontier-crdt-websocket/server';
import {
  createFrontierCrdtStore,
  useFrontierStore
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));
const iterations = readPositiveInt(args.iterations, 80);
const warmup = readPositiveInt(args.warmup, 12);
const outPath = args.out ? path.resolve(rootDir, args.out) : null;

const textRun = await runTextTypingScenario({ iterations, warmup });
const setRun = await runJsonSetScenario({ iterations, warmup });

finish('@shapeshift-labs/frontier-react', [
  summarizeScenario('E2E CRDT text insert to React render', textRun),
  summarizeScenario('E2E CRDT JSON set to React render', setRun)
]);

async function runTextTypingScenario(options) {
  return withTwoPeerReactFlow(async ({ alice, aliceProvider, readRendered, waitForRender }) => {
    const samples = [];
    let expected = '';
    for (let i = 0; i < options.warmup + options.iterations; i++) {
      const char = String.fromCharCode(97 + (i % 26));
      const start = performance.now();
      const commitStart = performance.now();
      const commit = alice.text('/body').insert(expected.length, char);
      expected += char;
      const commitEnd = performance.now();
      const syncStart = performance.now();
      await aliceProvider.sync('bob');
      const syncEnd = performance.now();
      await waitForRender(expected);
      const end = performance.now();
      assertRendered(readRendered(), expected);
      if (i >= options.warmup) {
        samples.push({
          totalUs: micros(end - start),
          localCommitUs: micros(commitEnd - commitStart),
          syncCallUs: micros(syncEnd - syncStart),
          renderWaitUs: micros(end - syncEnd),
          updateBytes: commit.update.byteLength,
          patchOps: commit.viewPatch.length
        });
      }
    }
    return samples;
  });
}

async function runJsonSetScenario(options) {
  return withTwoPeerReactFlow(async ({ alice, aliceProvider, readRendered, waitForRender }) => {
    const samples = [];
    for (let i = 0; i < options.warmup + options.iterations; i++) {
      const expected = `title-${i}`;
      const start = performance.now();
      const commitStart = performance.now();
      const commit = alice.set('/title', expected);
      const commitEnd = performance.now();
      const syncStart = performance.now();
      await aliceProvider.sync('bob');
      const syncEnd = performance.now();
      await waitForRender(expected);
      const end = performance.now();
      assertRendered(readRendered(), expected);
      if (i >= options.warmup) {
        samples.push({
          totalUs: micros(end - start),
          localCommitUs: micros(commitEnd - commitStart),
          syncCallUs: micros(syncEnd - syncStart),
          renderWaitUs: micros(end - syncEnd),
          updateBytes: commit.update.byteLength,
          patchOps: commit.viewPatch.length
        });
      }
    }
    return samples;
  }, { selector: (state) => state?.title ?? '' });
}

async function withTwoPeerReactFlow(callback, options = {}) {
  const server = createCrdtWebSocketServer({
    host: '127.0.0.1',
    port: 0,
    heartbeatIntervalMs: 0,
    frameEncoding: 'binary'
  });
  await server.ready;
  const url = serverUrl(server);
  const alice = createCrdtStateEngine({ actorId: `alice-${Date.now()}` });
  const bob = createCrdtStateEngine({ actorId: `bob-${Date.now()}` });
  const aliceProvider = createProvider(alice, 'alice', url);
  const bobProvider = createProvider(bob, 'bob', url);
  const bobStore = createFrontierCrdtStore(bob);
  const selector = options.selector ?? ((state) => state?.body ?? '');
  const renderState = {
    value: selector(bobStore.getSnapshot()),
    renders: 0
  };
  const renderWaiters = new Set();

  function Probe() {
    renderState.renders++;
    renderState.value = useFrontierStore(bobStore, selector);
    resolveRenderWaiters(renderState.value, renderWaiters);
    return React.createElement('span', null, renderState.value);
  }

  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  await aliceProvider.connect();
  await bobProvider.connect();
  await waitFor(() => aliceProvider.getPeerIds().includes('bob') && bobProvider.getPeerIds().includes('alice'));

  try {
    return await callback({
      alice,
      bob,
      aliceProvider,
      bobProvider,
      readRendered: () => renderState.value,
      renderCount: () => renderState.renders,
      waitForRender: (expected) => waitForRenderValue(renderState, renderWaiters, expected)
    });
  } finally {
    await act(async () => {
      renderer?.unmount();
    });
    await bobProvider.disconnect();
    await aliceProvider.disconnect();
    await server.close();
  }
}

function createProvider(doc, peerId, url) {
  return createCrdtWebSocketProvider(
    createCrdtSyncEndpoint(doc, { documentId: 'frontier-react-e2e', senderId: peerId, actorRangeSync: true }),
    {
      url,
      documentId: 'frontier-react-e2e',
      peerId,
      WebSocket,
      heartbeatIntervalMs: 0,
      syncOnConnect: true,
      autoSyncOnPeerJoin: true
    }
  );
}

function summarizeScenario(fixture, samples) {
  const total = summarize(samples.map((sample) => sample.totalUs));
  const localCommit = summarize(samples.map((sample) => sample.localCommitUs));
  const syncCall = summarize(samples.map((sample) => sample.syncCallUs));
  const renderWait = summarize(samples.map((sample) => sample.renderWaitUs));
  const bytes = summarize(samples.map((sample) => sample.updateBytes));
  const patchOps = summarize(samples.map((sample) => sample.patchOps));
  return {
    fixture,
    iterations: samples.length,
    totalMedianUs: round(total.median),
    totalP95Us: round(total.p95),
    localCommitMedianUs: round(localCommit.median),
    syncCallMedianUs: round(syncCall.median),
    renderWaitMedianUs: round(renderWait.median),
    updateBytesMedian: round(bytes.median),
    patchOpsMedian: round(patchOps.median)
  };
}

function summarize(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  return {
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95)
  };
}

function finish(packageName, rows) {
  const report = {
    package: packageName,
    benchmark: 'full-client-server-react-flow',
    version: readPackageVersion(),
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform + ' ' + process.arch,
    iterations,
    warmup,
    rows
  };
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  }
  printReport(report);
}

function printReport(report) {
  console.log(report.package + ' full client/server React benchmark');
  console.log('Node ' + report.node + ' on ' + report.platform + ', iterations=' + iterations + ', warmup=' + warmup);
  console.log('These are Frontier-only package measurements, not competitor comparisons.');
  console.log('');
  console.log(
    padRight('Fixture', 42) +
    padLeft('Total med', 12) +
    padLeft('Total p95', 12) +
    padLeft('Commit', 10) +
    padLeft('Sync', 10) +
    padLeft('Render', 10) +
    padLeft('Bytes', 8)
  );
  for (const row of report.rows) {
    console.log(
      padRight(row.fixture, 42) +
      padLeft(formatUs(row.totalMedianUs), 12) +
      padLeft(formatUs(row.totalP95Us), 12) +
      padLeft(formatUs(row.localCommitMedianUs), 10) +
      padLeft(formatUs(row.syncCallMedianUs), 10) +
      padLeft(formatUs(row.renderWaitMedianUs), 10) +
      padLeft(String(row.updateBytesMedian), 8)
    );
  }
  if (outPath) console.log('\nwrote ' + path.relative(rootDir, outPath));
}

async function waitFor(predicate, timeoutMs = 1500) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (predicate()) return;
    await delay(1);
  }
  throw new Error('timed out waiting for full client/server flow');
}

function waitForRenderValue(renderState, waiters, expected, timeoutMs = 1500) {
  if (renderState.value === expected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const waiter = {
      expected,
      resolve: () => {
        clearTimeout(timeout);
        resolve();
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    };
    const timeout = setTimeout(() => {
      waiters.delete(waiter);
      reject(new Error(`timed out waiting for React render value ${JSON.stringify(expected)}`));
    }, timeoutMs);
    waiters.add(waiter);
  });
}

function resolveRenderWaiters(value, waiters) {
  for (const waiter of Array.from(waiters)) {
    if (value === waiter.expected) {
      waiters.delete(waiter);
      waiter.resolve();
    }
  }
}

function assertRendered(actual, expected) {
  if (actual !== expected) throw new Error(`remote React render mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function serverUrl(server) {
  const address = server.address();
  if (!address || typeof address !== 'object' || !('port' in address)) throw new Error('invalid websocket server address');
  return `ws://127.0.0.1:${address.port}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function micros(ms) {
  return ms * 1000;
}

function percentile(sorted, fraction) { return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]; }
function readPackageVersion() { return JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version; }
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i++) { const arg = argv[i]; if (arg === '--iterations') out.iterations = argv[++i]; else if (arg === '--warmup') out.warmup = argv[++i]; else if (arg === '--out') out.out = argv[++i]; else if (arg === '--help' || arg === '-h') { console.log('Usage: npm run bench:e2e -- [--iterations 80] [--warmup 12] [--out benchmarks/results/e2e-flow-latest.json]'); process.exit(0); } else throw new Error('unknown argument: ' + arg); } return out; }
function readPositiveInt(value, fallback) { if (value === undefined) return fallback; const number = Number(value); if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value); return number; }
function round(value) { return Math.round(value * 100) / 100; }
function formatUs(value) { return value >= 1000 ? (value / 1000).toFixed(2) + ' ms' : value.toFixed(2) + ' us'; }
function padRight(value, width) { return String(value).padEnd(width); }
function padLeft(value, width) { return String(value).padStart(width); }
