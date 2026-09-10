import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = fs.readFileSync(new URL('../rinlo-server-sync-v1.js', import.meta.url), 'utf8');
const APP_KEY = 'healthy-action-v07';
const OUTBOX_KEY = 'rinlo-sync-outbox-v1';
const day = '2026-09-10';

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

function readDb() {
  return JSON.parse(localStorage.getItem(APP_KEY) || '{}');
}

function writeDb(db) {
  localStorage.setItem(APP_KEY, JSON.stringify(db));
}

function readOutbox() {
  return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
}

function writeState(events, outbox) {
  writeDb({ days: { [day]: { events, water: 0, steps: 0, habits: {}, closed: false } } });
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

const win = {
  __haViewDay: day,
  rinloSaveFood() {},
  rinloSaveWeight() {},
  rinloSaveEventEdit(id) {
    const db = readDb();
    const event = db.days[day].events.find((item) => String(item.id) === String(id));
    if (event.type === 'food') {
      event.text = 'омлет, кофе и йогурт';
      event.cal = 420;
      event.protein = 31;
    } else if (event.type === 'weight') {
      event.weight = 83.9;
    }
    writeDb(db);
    return true;
  },
  delEvent(id) {
    const db = readDb();
    db.days[day].events = db.days[day].events.filter((item) => String(item.id) !== String(id));
    writeDb(db);
    return true;
  },
};

const frame = {
  contentWindow: win,
  addEventListener() {},
};

const window = {
  HealthyActionAPI: {
    enabled: false,
    base: '',
    lastSyncAt: null,
    lastSyncError: null,
  },
  HEALTHY_ACTION_CONFIG: {},
  addEventListener() {},
};

const document = {
  visibilityState: 'visible',
  getElementById(id) { return id === 'app' ? frame : null; },
  addEventListener() {},
};

const context = vm.createContext({
  window,
  document,
  localStorage,
  navigator: { onLine: true },
  crypto: webcrypto,
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  URL,
  encodeURIComponent,
  decodeURIComponent,
});

vm.runInContext(source, context, { filename: 'rinlo-server-sync-v1.js' });
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(win.__rinloServerSyncWrapped, true, 'Server sync did not wrap mutation functions');

// Once a create has been attempted, its outcome is uncertain. An edit must not
// rewrite the create payload because the server may already have committed it.
writeState([
  {
    id: 'food-local-1',
    type: 'food',
    time: '2026-09-10T08:00:00.000Z',
    text: 'омлет и кофе',
    cal: 300,
    protein: 20,
    clientEventId: 'food:lost-response',
  },
], [
  {
    id: 'sync:create-food',
    kind: 'food-create',
    day,
    localEventId: 'food-local-1',
    attempts: 1,
    payload: {
      clientEventId: 'food:lost-response',
      eatenAt: '2026-09-10T08:00:00.000Z',
      source: 'manual',
      originalText: 'омлет и кофе',
      totalKcal: 300,
      totalProtein: 20,
      items: [],
    },
  },
]);

win.rinloSaveEventEdit('food-local-1');
let outbox = readOutbox();
assert.equal(outbox.length, 2, 'Uncertain create edit should create a dependent update');
assert.equal(outbox[0].kind, 'food-create');
assert.equal(outbox[0].attempts, 1);
assert.equal(outbox[0].payload.originalText, 'омлет и кофе', 'Attempted create payload was rewritten');
assert.equal(outbox[1].kind, 'food-update');
assert.equal(outbox[1].serverId, null);
assert.equal(outbox[1].payload.originalText, 'омлет, кофе и йогурт');
assert.equal(outbox[1].payload.totalKcal, 420);
assert.equal(outbox[1].payload.totalProtein, 31);

// Deleting the same uncertain create must keep it until replay resolves serverId,
// then queue a dependent delete. Otherwise a committed server row could become a ghost.
win.delEvent('food-local-1');
outbox = readOutbox();
assert.equal(outbox[0].kind, 'food-create', 'Attempted create was incorrectly cancelled on delete');
assert.ok(outbox.some((item) => item.kind === 'food-delete' && item.serverId == null), 'Dependent delete was not queued');

// A create that has never left the device is still safe to collapse locally.
writeState([
  {
    id: 'weight-local-1',
    type: 'weight',
    time: '2026-09-10T09:00:00.000Z',
    weight: 84.6,
    clientEventId: 'weight:not-sent',
  },
], [
  {
    id: 'sync:create-weight',
    kind: 'weight-create',
    day,
    localEventId: 'weight-local-1',
    attempts: 0,
    payload: {
      clientEventId: 'weight:not-sent',
      measuredAt: '2026-09-10T09:00:00.000Z',
      weightKg: 84.6,
    },
  },
]);

win.rinloSaveEventEdit('weight-local-1');
outbox = readOutbox();
assert.equal(outbox.length, 1, 'Never-attempted create edit should stay collapsed into create');
assert.equal(outbox[0].kind, 'weight-create');
assert.equal(outbox[0].payload.weightKg, 83.9);

win.delEvent('weight-local-1');
outbox = readOutbox();
assert.equal(outbox.length, 0, 'Never-attempted create should be cancellable without a delete');

console.log('Rinlo uncertain-create outbox regression passed');
