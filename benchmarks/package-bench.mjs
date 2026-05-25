import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  createFrontierPatchStore,
  createFrontierStateStore,
  createFrontierStoreAdapter
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const args = parseArgs(process.argv.slice(2));
const rounds = readPositiveInt(args.rounds, 9);
const outPath = args.out ? path.resolve(rootDir, args.out) : null;
let sink = 0;

const baseRows = Array.from({ length: 1000 }, (_value, index) => ({ id: `r${index}`, value: index, done: false }));
const patchStore = createFrontierPatchStore({ rows: baseRows, tick: 0 });
const adapterSource = createAdapterSource({ count: 0 });
const adapter = createFrontierStoreAdapter(adapterSource);
const stateStore = createFrontierStateStore(createStateEngineLike({ value: 0 }));

const rows = [
  runRow('React patch store replace, 1k rows one edit', 500, () => {
    const current = patchStore.getSnapshot();
    const rows = current.rows.slice();
    rows[17] = { ...rows[17], done: !rows[17].done };
    sink += patchStore.setSnapshot({ rows, tick: current.tick + 1 }).length;
  }),
  runRow('External store adapter notify 10 listeners', 50000, () => {
    sink += adapterSource.emit();
  }),
  runRow('State engine adapter snapshot read', 200000, () => {
    sink += stateStore.getSnapshot().value;
  })
];

finish('@shapeshift-labs/frontier-react', rows);

function measure(fn, inner) {
  for (let i = 0; i < inner; i++) fn();
  const samples = new Array(rounds);
  for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
    const start = performance.now();
    for (let i = 0; i < inner; i++) fn();
    samples[roundIndex] = ((performance.now() - start) * 1000) / inner;
  }
  samples.sort((left, right) => left - right);
  return { median: percentile(samples, 0.5), p95: percentile(samples, 0.95) };
}

function runRow(name, inner, fn) {
  const timing = measure(fn, inner);
  return { fixture: name, medianUs: round(timing.median), p95Us: round(timing.p95) };
}

function createAdapterSource(initial) {
  let value = initial;
  const listeners = new Set();
  for (let i = 0; i < 10; i++) listeners.add(() => { sink++; });
  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit() {
      value = { count: value.count + 1 };
      for (const listener of listeners) listener();
      return value.count;
    }
  };
}

function createStateEngineLike(initial) {
  const listeners = new Set();
  return {
    get: () => initial,
    watch(_path, listener) {
      listeners.add(listener);
      return { unsubscribe: () => listeners.delete(listener) };
    }
  };
}

function finish(packageName, rows) {
  const report = {
    package: packageName,
    version: readPackageVersion(),
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform + ' ' + process.arch,
    rounds,
    rows
  };
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  }
  printReport(report);
  if (sink === 42) console.log('sink=' + sink);
}

function printReport(report) {
  console.log(report.package + ' package benchmark');
  console.log('Node ' + report.node + ' on ' + report.platform + ', rounds=' + rounds);
  console.log('These are Frontier-only package measurements, not competitor comparisons.');
  console.log('');
  console.log(padRight('Fixture', 48) + padLeft('Median', 12) + padLeft('p95', 11));
  for (const row of report.rows) {
    console.log(padRight(row.fixture, 48) + padLeft(formatUs(row.medianUs), 12) + padLeft(formatUs(row.p95Us), 11));
  }
  if (outPath) console.log('\nwrote ' + path.relative(rootDir, outPath));
}

function percentile(sorted, fraction) { return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]; }
function readPackageVersion() { return JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version; }
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i++) { const arg = argv[i]; if (arg === '--rounds') out.rounds = argv[++i]; else if (arg === '--out') out.out = argv[++i]; else if (arg === '--help' || arg === '-h') { console.log('Usage: npm run bench -- [--rounds 9] [--out benchmarks/results/package-bench.json]'); process.exit(0); } else throw new Error('unknown argument: ' + arg); } return out; }
function readPositiveInt(value, fallback) { if (value === undefined) return fallback; const number = Number(value); if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value); return number; }
function round(value) { return Math.round(value * 100) / 100; }
function formatUs(value) { return value >= 1000 ? (value / 1000).toFixed(2) + ' ms' : value.toFixed(2) + ' us'; }
function padRight(value, width) { return String(value).padEnd(width); }
function padLeft(value, width) { return String(value).padStart(width); }
