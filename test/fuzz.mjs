import assert from 'node:assert';
import { applyPatchImmutable, diff } from '@shapeshift-labs/frontier';
import {
  createFrontierPatchStore,
  createFrontierStoreAdapter
} from '../dist/index.js';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 500);
const steps = readPositiveInt(args.steps, 64);
let seed = readSeed(args.seed, 0x7a9c12ef);

for (let caseIndex = 0; caseIndex < cases; caseIndex++) {
  runCase(caseIndex);
}

console.log(`frontier-react fuzz passed cases=${cases} steps=${steps} seed=${readSeed(args.seed, 0x7a9c12ef)}`);

function runCase(caseIndex) {
  let expected = { count: 0, rows: [], meta: { caseIndex } };
  const store = createFrontierPatchStore(expected);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications++;
  });

  for (let step = 0; step < steps; step++) {
    const previous = expected;
    const next = mutate(expected, caseIndex, step);
    if (randInt(2) === 0) {
      const patch = store.setSnapshot(next);
      expected = next;
      assert.deepStrictEqual(applyPatchImmutable(previous, patch), expected);
    } else {
      const patch = diff(previous, next);
      expected = applyPatchImmutable(expected, patch);
      store.applyPatch(patch);
    }
    assert.deepStrictEqual(store.getSnapshot(), expected);
  }

  assert.strictEqual(notifications, store.getPatchLog().length);
  store.clearPatchLog();
  assert.strictEqual(store.getPatchLog().length, 0);
  unsubscribe();

  const adapter = createFrontierStoreAdapter({
    getSnapshot: () => store.getSnapshot(),
    subscribe: (listener) => store.subscribe(listener)
  });
  assert.deepStrictEqual(adapter.getSnapshot(), expected);
}

function mutate(current, caseIndex, step) {
  const next = {
    count: current.count,
    rows: current.rows.map((row) => ({ ...row })),
    meta: { ...current.meta }
  };
  switch (randInt(5)) {
    case 0:
      next.count += randInt(5) - 2;
      break;
    case 1:
      next.rows.push({ id: `r${caseIndex}-${step}-${randInt(1000)}`, value: randInt(1000), done: false });
      break;
    case 2:
      if (next.rows.length > 0) next.rows.splice(randInt(next.rows.length), 1);
      break;
    case 3:
      if (next.rows.length > 0) {
        const row = next.rows[randInt(next.rows.length)];
        row.done = !row.done;
        row.value += 1;
      }
      break;
    default:
      next.meta.tick = step;
      break;
  }
  return next;
}

function randInt(max) {
  return nextRandom() % max;
}

function nextRandom() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--steps') out.steps = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node test/fuzz.mjs [--cases 500] [--steps 64] [--seed number]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error('expected positive integer, got ' + value);
  return number;
}

function readSeed(value, fallback) {
  if (value === undefined) return fallback >>> 0;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error('expected integer seed, got ' + value);
  return number >>> 0;
}
