import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = fs.readFileSync(new URL('../rinlo-server-sync-v1.js', import.meta.url), 'utf8');
const APP_KEY = 'healthy-action-v07';
const OUTBOX_KEY = 'rinlo-sync-outbox-v1';
const day = '2026-09-10';
const calls = [];
let session = null;
let ensureCount = 0;

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

function readDb() {
  return JSON.parse(localStorage.getItem(APP_KEY) || '{}');
}

const initialDb = {
  profile: {
    weight: 85,
    goal: 75,
    height: 176,
    age: 37,
    sex: 'male',
    activity: 'low',
    habits: ['water'],
    primaryGoal: 'weight_loss',
    secondaryGoals: ['movement'],
    calorieTrackingEnabled: true,
  },
  days: {
    [day]: {
      water: 750,
      steps: 5000,
      habits: { water: true, vape: false, unsupported: true },
      closed: false,
      rinloCheckin: {
        wellbeing: 'okay',
        energy: 3,
        sleepQuality: 4,
        sleepMinutes: 430,
        note: 'legacy local state',
      },
      events: [
        {
          id: 'local-food-1',
          serverId: '11111111-1111-4111-8111-111111111111',
          clientEventId: 'food:legacy-local',
          type: 'food',
          time: '2026-09-10T08:00:00.000Z',
          text: 'омлет и кофе',
          cal: 310,
          protein: 20,
        },
        {
          id: 'local-weight-1',
          serverId: '22222222-2222-4222-8222-222222222222',
          type: 'weight',
          time: '2026-09-10T07:00:00.000Z',
          weight: 84.6,
        },
      ],
    },
  },
};
localStorage.setItem(APP_KEY, JSON.stringify(initialDb));
localStorage.setItem(OUTBOX_KEY, JSON.stringify([
  {
    id: 'stale-fastify-update',
    kind: 'food-update',
    day,
    localEventId: 'local-food-1',
    serverId: '11111111-1111-4111-8111-111111111111',
    attempts: 3,
    payload: { originalText: 'stale payload' },
  },
]));

const win = {
  __haViewDay: day,
  rinloSaveFood() {},
  rinloSaveWeight() {},
  targets() { return { cal: 1900, protein: 120, steps: 8000 }; },
  eval() {},
  render() {},
};
const frame = { contentWindow: win, addEventListener() {} };

const auth = {
  enabled: true,
  getSession() { return session; },
};

const transport = {
  enabled: true,
  shouldAutoSync() { return false; },
  async ensureSession() {
    ensureCount += 1;
    session ||= {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    };
    return session;
  },
  async request(path, options = {}) {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method: options.method || 'GET', body });
    if (path === '/api/v1/food/logs') {
      return { id: 'aaaaaaaa-1111-4111-8111-111111111111', clientEventId: body.clientEventId };
    }
    if (path === '/api/v1/weight/logs') {
      return { id: 'aaaaaaaa-2222-4222-8222-222222222222', clientEventId: body.clientEventId };
    }
    return { ok: true };
  },
};

const window = {
  HealthyActionAPI: { enabled: false, base: '', lastSyncAt: null, lastSyncError: null },
  HEALTHY_ACTION_CONFIG: {},
  RinloSupabaseAuth: auth,
  RinloSupabaseTransport: transport,
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

const result = await window.RinloServerSync.syncNow({ pullAfter: false });
assert.equal(result, true, 'First Supabase sync did not drain');
assert.ok(ensureCount >= 1, 'Supabase identity was not created');
assert.equal(window.RinloServerSync.pending().length, 0, 'Seed outbox did not fully drain');

assert.equal(calls.some((call) => call.path.includes('11111111-1111-4111-8111-111111111111')), false, 'Legacy Fastify serverId leaked into Supabase requests');
assert.equal(calls.some((call) => call.path === '/api/v1/profile' && call.method === 'PUT'), true, 'Profile was not seeded');
assert.equal(calls.some((call) => call.path === `/api/v1/checkins/${day}` && call.body?.wellbeing === 'okay'), true, 'Check-in was not seeded');

const metricCall = calls.find((call) => call.path === '/api/v1/daily/metrics');
assert.ok(metricCall, 'Metrics were not seeded');
assert.equal(metricCall.body.operationId, `supabase-seed-v1:${day}:metrics`);
assert.equal(metricCall.body.waterMlDelta, 750);
assert.equal(metricCall.body.stepsDelta, 5000);

assert.equal(calls.some((call) => call.path === '/api/v1/daily/habits/water' && call.body?.done === true), true, 'True habit was not seeded');
assert.equal(calls.some((call) => call.path === '/api/v1/daily/habits/vape' && call.body?.done === false), true, 'False habit was not seeded');
assert.equal(calls.some((call) => call.path.includes('unsupported')), false, 'Unsupported habit leaked into Supabase seed');

const foodCall = calls.find((call) => call.path === '/api/v1/food/logs');
const weightCall = calls.find((call) => call.path === '/api/v1/weight/logs');
assert.ok(foodCall, 'Food event was not seeded');
assert.ok(weightCall, 'Weight event was not seeded');
assert.equal(foodCall.body.clientEventId, 'food:legacy-local');
assert.equal(foodCall.body.originalText, 'омлет и кофе');
assert.ok(weightCall.body.clientEventId, 'Weight seed did not get a clientEventId');
assert.equal(weightCall.body.weightKg, 84.6);

const finalDb = readDb();
const finalFood = finalDb.days[day].events.find((event) => event.type === 'food');
const finalWeight = finalDb.days[day].events.find((event) => event.type === 'weight');
assert.equal(finalFood.serverId, 'aaaaaaaa-1111-4111-8111-111111111111', 'Food did not receive Supabase serverId');
assert.equal(finalWeight.serverId, 'aaaaaaaa-2222-4222-8222-222222222222', 'Weight did not receive Supabase serverId');
assert.notEqual(finalWeight.clientEventId, undefined, 'Generated weight clientEventId was not persisted locally');

console.log('Rinlo first Supabase identity seed regression passed');
