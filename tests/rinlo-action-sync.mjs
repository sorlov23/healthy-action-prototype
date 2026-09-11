import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../rinlo-action-sync-v1.js', import.meta.url), 'utf8');
const APP_KEY = 'healthy-action-v07';
const OUTBOX_KEY = 'rinlo-sync-outbox-v1';
const day = '2026-09-11';
const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
const readDb = () => JSON.parse(localStorage.getItem(APP_KEY) || '{}');
const writeDb = (db) => localStorage.setItem(APP_KEY, JSON.stringify(db));
let queue = [];
function enqueue(item, { replaceKey = null } = {}) {
  if (replaceKey) queue = queue.filter((entry) => entry.replaceKey !== replaceKey);
  queue.push({ id: item.id || `queue-${queue.length + 1}`, attempts: 0, ...item, ...(replaceKey ? { replaceKey } : {}) });
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
}
function syncQueueFromStorage() {
  queue = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
}
function pending() { return queue.map((item) => ({ ...item })); }

let uuidSeq = 0;
const crypto = { randomUUID() { uuidSeq += 1; return `00000000-0000-4000-8000-${String(uuidSeq).padStart(12, '0')}`; } };

const inner = {
  __haViewDay: day,
  async rinloCoreCheckin() {},
  async rinloCoreSkipCheckin() {},
  async rinloCoreCompleteAction() {
    const db = readDb();
    const action = db.days[day].rinloActions.find((item) => ['suggested','accepted'].includes(item.status));
    action.status = 'completed';
    action.completedAt = '2026-09-11T12:05:00.000Z';
    writeDb(db);
  },
  async rinloCoreReplaceAction() {
    const db = readDb();
    const action = db.days[day].rinloActions.find((item) => ['suggested','accepted'].includes(item.status));
    action.status = 'replaced';
    db.days[day].rinloActions.unshift({
      id: 'local-next', day, kind: 'hydration', title: 'Выпейте стакан воды',
      rationale: 'Небольшой следующий шаг', effortMinutes: 2, source: 'local-rules',
      status: 'suggested', suggestedAt: '2026-09-11T12:06:00.000Z', context: {},
    });
    writeDb(db);
  },
  async rinloCoreDismissReason(reason) {
    const db = readDb();
    const action = db.days[day].rinloActions.find((item) => ['suggested','accepted'].includes(item.status));
    action.status = 'dismissed';
    action.dismissReason = reason;
    writeDb(db);
  },
  async rinloCoreActionFeedback(useful) {
    const db = readDb();
    const action = db.days[day].rinloActions.find((item) => item.status === 'completed');
    action.feedback = { useful: Boolean(useful), at: '2026-09-11T12:10:00.000Z' };
    writeDb(db);
  },
};

const frame = {
  contentWindow: inner,
  addEventListener() {},
};
const document = { getElementById(id) { return id === 'app' ? frame : null; } };
const window = {
  RinloSupabaseTransport: { enabled: true },
  RinloServerSyncExtensions: {},
  RinloServerSync: { enqueue, pending },
};

writeDb({ days: { [day]: { rinloActions: [{
  id: 'local-current', serverId: 'server-current', clientActionId: 'local-current',
  day, kind: 'movement', title: 'Пройдитесь 10 минут', rationale: 'Небольшой шаг',
  effortMinutes: 10, source: 'local-rules', status: 'suggested',
  suggestedAt: '2026-09-11T12:00:00.000Z', context: {},
}] } } });

const context = vm.createContext({
  window, document, localStorage, crypto, Date, JSON, String, Number, Boolean,
  Array, Object, Map, Set, RegExp, Error,
  setTimeout(fn) { fn(); return 0; },
  console,
});
vm.runInContext(source, context, { filename: 'rinlo-action-sync-v1.js' });
assert.equal(inner.__rinloActionSync, 'v1');
assert.equal(window.RinloActionSync.version, 'v1');

// A completed action becomes one durable action-event with the known server id.
queue = [];
localStorage.removeItem(OUTBOX_KEY);
await inner.rinloCoreCompleteAction();
assert.equal(queue.length, 1);
assert.equal(queue[0].kind, 'action-event');
assert.equal(queue[0].eventType, 'completed');
assert.equal(queue[0].actionId, 'server-current');

// Replacement preserves causal ordering: event for current action, then create next action.
writeDb({ days: { [day]: { rinloActions: [{
  id: 'local-current', serverId: 'server-current', clientActionId: 'local-current',
  day, kind: 'movement', title: 'Пройдитесь 10 минут', rationale: 'Небольшой шаг',
  effortMinutes: 10, source: 'local-rules', status: 'suggested',
  suggestedAt: '2026-09-11T12:00:00.000Z', context: {},
}] } } });
queue = [];
localStorage.removeItem(OUTBOX_KEY);
await inner.rinloCoreReplaceAction();
assert.deepEqual(queue.map((item) => item.kind), ['action-event', 'action-create']);
assert.equal(queue[0].eventType, 'replaced');
assert.equal(queue[0].actionId, 'server-current');
assert.equal(queue[1].localActionId, 'local-next');

// Feedback is durable too.
let db = readDb();
db.days[day].rinloActions = [{
  id: 'local-current', serverId: 'server-current', clientActionId: 'local-current',
  day, kind: 'movement', title: 'Пройдитесь 10 минут', rationale: 'Небольшой шаг',
  effortMinutes: 10, source: 'local-rules', status: 'completed',
  suggestedAt: '2026-09-11T12:00:00.000Z', context: {},
}];
writeDb(db);
queue = [];
localStorage.removeItem(OUTBOX_KEY);
await inner.rinloCoreActionFeedback(true);
assert.equal(queue.length, 1);
assert.equal(queue[0].eventType, 'feedback');
assert.equal(queue[0].payload.useful, true);

// Existing-session backfill queues every unsynced action/history entry.
writeDb({ days: { [day]: { rinloActions: [
  { id: 'new-active', day, kind: 'movement', title: 'Новый', rationale: 'Новый шаг', status: 'suggested', suggestedAt: '2026-09-11T12:00:00.000Z' },
  { id: 'old-completed', day, kind: 'nutrition', title: 'Старый', rationale: 'Старый шаг', status: 'completed', suggestedAt: '2026-09-11T08:00:00.000Z', feedback: { useful: true } },
] } } });
queue = [];
localStorage.removeItem(OUTBOX_KEY);
window.RinloActionSync.backfillUnsyncedActions();
assert.equal(queue.filter((item) => item.kind === 'action-create').length, 2);
assert.ok(queue.some((item) => item.kind === 'action-event' && item.localActionId === 'old-completed' && item.eventType === 'completed'));
assert.ok(queue.some((item) => item.kind === 'action-event' && item.localActionId === 'old-completed' && item.eventType === 'feedback'));

// First Supabase identity seed explicitly preserves chronological action history.
const seeded = [];
const seedDb = readDb();
window.RinloServerSyncExtensions.seedSupabaseIdentity({
  db: seedDb,
  add(item) { seeded.push(item); },
  uid(prefix) { return `${prefix}:seed-${seeded.length + 1}`; },
});
assert.equal(seeded[0].kind, 'action-create');
assert.equal(seeded[0].localActionId, 'old-completed');
assert.ok(seeded.findIndex((item) => item.localActionId === 'old-completed' && item.eventType === 'completed') < seeded.findIndex((item) => item.localActionId === 'new-active' && item.kind === 'action-create'));

// Processing create assigns serverId to the local action and all dependent events.
writeDb({ days: { [day]: { rinloActions: [{
  id: 'local-process', day, kind: 'movement', title: 'Процесс', rationale: 'Проверка',
  status: 'suggested', suggestedAt: '2026-09-11T13:00:00.000Z', context: {},
}] } } });
localStorage.setItem(OUTBOX_KEY, JSON.stringify([
  { id: 'create-1', kind: 'action-create', day, localActionId: 'local-process', payload: {} },
  { id: 'event-1', kind: 'action-event', day, localActionId: 'local-process', actionId: null, eventType: 'completed', operationId: 'op-1', payload: {} },
]));
syncQueueFromStorage();
const ctx = {
  async request(path) {
    if (path === '/api/v1/actions/import-local') return { action: {
      id: 'server-process', clientActionId: 'local-process', day, kind: 'movement',
      title: 'Процесс', rationale: 'Проверка', effortMinutes: null, source: 'rules',
      status: 'suggested', context: {}, suggestedAt: '2026-09-11T13:00:00.000Z',
    }, reused: false };
    throw new Error(`Unexpected ${path}`);
  },
  readOutbox() { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); },
  writeOutbox(items) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); syncQueueFromStorage(); },
  refreshFrame() {},
};
const processed = await window.RinloServerSyncExtensions.processItem(queue[0], ctx);
assert.equal(processed.handled, true);
assert.equal(readDb().days[day].rinloActions[0].serverId, 'server-process');
assert.equal(JSON.parse(localStorage.getItem(OUTBOX_KEY))[1].actionId, 'server-process');

console.log('Durable Plan action sync regression passed');
