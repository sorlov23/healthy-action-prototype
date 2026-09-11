import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../rinlo-supabase-evening-review-transport-v1.js', import.meta.url), 'utf8');
const calls = [];
const fallbackCalls = [];

function response(status, data) {
  return { ok: status >= 200 && status < 300, status, async json() { return data; } };
}

async function fetchMock(url, options = {}) {
  calls.push({ url: String(url), options });
  const parsed = new URL(String(url));
  assert.equal(parsed.pathname, '/rest/v1/daily_evening_reviews');

  if ((options.method || 'GET').toUpperCase() === 'POST') {
    assert.equal(parsed.searchParams.get('on_conflict'), 'user_id,day');
    const body = JSON.parse(options.body);
    assert.deepEqual(body, {
      user_id: 'user-1',
      day: '2026-09-12',
      plan_fit: 'right',
      action_useful: 'yes',
      main_action_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      updated_at: body.updated_at,
    });
    return response(201, [{
      ...body,
      created_at: '2026-09-12T19:00:00.000Z',
    }]);
  }

  assert.equal(parsed.searchParams.get('day'), 'eq.2026-09-12');
  return response(200, [{
    user_id: 'user-1',
    day: '2026-09-12',
    plan_fit: 'right',
    action_useful: 'yes',
    main_action_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    created_at: '2026-09-12T19:00:00.000Z',
    updated_at: '2026-09-12T19:01:00.000Z',
  }]);
}

const transport = {
  enabled: true,
  async request(path, options = {}) {
    fallbackCalls.push({ path, options });
    if (path.startsWith('/api/v1/bootstrap')) return { profile: { startWeightKg: 85 }, actions: [] };
    return { fallback: true };
  },
};

const window = {
  HEALTHY_ACTION_CONFIG: {
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  },
  RinloSupabaseAuth: {
    async ensureSession() { return { access_token: 'token-1', user: { id: 'user-1' } }; },
  },
  RinloSupabaseTransport: transport,
};

vm.runInContext(source, vm.createContext({
  window, fetch: fetchMock, URL, JSON, String, Boolean, Date, Error,
  encodeURIComponent,
}), { filename: 'rinlo-supabase-evening-review-transport-v1.js' });

assert.equal(transport.eveningReviewVersion, 'v1');

const saved = await transport.request('/api/v1/evening-reviews/2026-09-12', {
  method: 'PUT',
  body: JSON.stringify({
    planFit: 'right',
    actionUseful: 'yes',
    mainActionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }),
});
assert.equal(saved.eveningReview.planFit, 'right');
assert.equal(saved.eveningReview.actionUseful, 'yes');
assert.equal(saved.eveningReview.mainActionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

const bootstrap = await transport.request('/api/v1/bootstrap?day=2026-09-12&timezoneOffsetMinutes=-180');
assert.equal(bootstrap.profile.startWeightKg, 85);
assert.equal(bootstrap.eveningReview.planFit, 'right');
assert.equal(bootstrap.eveningReview.actionUseful, 'yes');
assert.equal(fallbackCalls.length, 1);
assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer token-1'));
assert.ok(calls.every((call) => call.options.headers.apikey === 'sb_publishable_test'));

console.log('Supabase evening review transport contract passed');
