import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../rinlo-supabase-transport-v1.js', import.meta.url), 'utf8');
const calls = [];
const userId = '11111111-1111-4111-8111-111111111111';

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
  };
}

async function fetchMock(url, options = {}) {
  calls.push({ url: String(url), options });
  const parsed = new URL(String(url));
  const path = parsed.pathname;

  if (path === '/rest/v1/profiles' && options.method === 'POST') {
    const body = JSON.parse(options.body);
    return response(201, [{
      ...body,
      created_at: '2026-09-10T10:00:00.000Z',
      updated_at: '2026-09-10T10:00:00.000Z',
    }]);
  }
  if (path === '/rest/v1/rpc/rinlo_apply_metric_operation') {
    const body = JSON.parse(options.body);
    return response(200, {
      day: body.p_day,
      waterMl: 250,
      steps: 0,
      habits: {},
      replayed: false,
      operationId: body.p_operation_id,
    });
  }
  if (path === '/rest/v1/food_logs' && options.method === 'GET') {
    return response(200, [{
      id: 'food-1', client_event_id: 'food:1', eaten_at: '2026-09-10T08:00:00.000Z',
      source: 'manual', original_text: 'Омлет', total_kcal: 300, total_protein_g: 20,
      created_at: '2026-09-10T08:00:00.000Z',
    }]);
  }
  if (path === '/rest/v1/daily_metrics') {
    return response(200, [{
      day: '2026-09-10', water_ml: 750, steps: 4200, habit_flags: { water: true },
      updated_at: '2026-09-10T09:00:00.000Z',
    }]);
  }
  if (path === '/rest/v1/weight_logs') {
    const isDayQuery = parsed.searchParams.has('measured_at');
    const rows = [{
      id: 'weight-1', client_event_id: 'weight:1', measured_at: '2026-09-10T07:00:00.000Z',
      weight_kg: 82.4, created_at: '2026-09-10T07:00:00.000Z',
    }];
    return response(200, isDayQuery ? rows : rows);
  }
  if (path === '/rest/v1/daily_checkins') {
    return response(200, [{
      day: '2026-09-10', wellbeing: 'good', energy: 4, sleep_quality: 4,
      sleep_minutes: 450, note: null, created_at: '2026-09-10T06:00:00.000Z',
      updated_at: '2026-09-10T06:00:00.000Z',
    }]);
  }
  if (path === '/rest/v1/rinlo_actions') return response(200, []);
  throw new Error(`Unexpected fetch ${options.method || 'GET'} ${url}`);
}

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

const auth = {
  enabled: true,
  async ensureSession() {
    return { access_token: 'access-token', user: { id: userId } };
  },
  getSession() { return null; },
};

const window = {
  HEALTHY_ACTION_CONFIG: {
    supabaseDataEnabled: true,
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  },
  RinloSupabaseAuth: auth,
};

const context = vm.createContext({
  window,
  localStorage,
  fetch: fetchMock,
  URL,
  Date,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  encodeURIComponent,
  decodeURIComponent,
});
vm.runInContext(source, context, { filename: 'rinlo-supabase-transport-v1.js' });

const transport = window.RinloSupabaseTransport;
assert.equal(transport.enabled, true);
assert.deepEqual(
  transport.localDayUtcRange('2026-09-10', -180),
  { start: '2026-09-09T21:00:00.000Z', end: '2026-09-10T21:00:00.000Z' },
);

const profileResult = await transport.request('/api/v1/profile', {
  method: 'PUT',
  body: JSON.stringify({
    startWeightKg: 85, targetWeightKg: 70, heightCm: 176, ageYears: 37,
    sex: 'male', activity: 'low', focuses: ['water'], primaryGoal: 'weight_loss',
    secondaryGoals: ['movement'], calorieTrackingEnabled: true,
    calorieTarget: 1900, proteinTargetG: 120, stepTarget: 8000,
  }),
});
assert.equal(profileResult.profile.userId, userId);
assert.equal(profileResult.profile.startWeightKg, 85);
const profileCall = calls.find((call) => call.url.includes('/rest/v1/profiles'));
assert.ok(profileCall.url.includes('on_conflict=user_id'));
assert.equal(profileCall.options.headers.apikey, 'sb_publishable_test');
assert.equal(profileCall.options.headers.Authorization, 'Bearer access-token');

const metricResult = await transport.request('/api/v1/daily/metrics', {
  method: 'POST',
  body: JSON.stringify({ operationId: 'water:1', day: '2026-09-10', waterMlDelta: 250, stepsDelta: 0 }),
});
assert.equal(metricResult.waterMl, 250);
assert.equal(metricResult.operationId, 'water:1');
assert.ok(calls.some((call) => call.url.endsWith('/rest/v1/rpc/rinlo_apply_metric_operation')));

const bootstrap = await transport.request('/api/v1/bootstrap?day=2026-09-10&timezoneOffsetMinutes=-180');
assert.equal(bootstrap.profile.startWeightKg, 85);
assert.equal(bootstrap.day.food.totals.kcal, 300);
assert.equal(bootstrap.day.food.totals.protein, 20);
assert.equal(bootstrap.day.metrics.waterMl, 750);
assert.equal(bootstrap.day.metrics.steps, 4200);
assert.equal(bootstrap.day.weight.weightKg, 82.4);
assert.equal(bootstrap.checkin.wellbeing, 'good');

const foodCall = calls.find((call) => call.url.includes('/rest/v1/food_logs?') && call.url.includes('order=eaten_at.asc'));
assert.ok(foodCall.url.includes('eaten_at=gte.2026-09-09T21%3A00%3A00.000Z'));
assert.ok(foodCall.url.includes('eaten_at=lt.2026-09-10T21%3A00%3A00.000Z'));

console.log('Supabase transport compatibility lifecycle passed');
