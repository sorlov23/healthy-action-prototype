import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../rinlo-supabase-action-transport-v1.js', import.meta.url), 'utf8');
const calls = [];

function response(status, data) {
  return { ok: status >= 200 && status < 300, status, async json() { return data; } };
}

async function fetchMock(url, options = {}) {
  calls.push({ url: String(url), options });
  const path = new URL(String(url)).pathname;
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === '/rest/v1/rpc/rinlo_import_action') {
    return response(200, {
      action: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        clientActionId: body.p_client_action_id,
        day: body.p_day,
        kind: body.p_kind,
        title: body.p_title,
        rationale: body.p_rationale,
        effortMinutes: body.p_effort_minutes,
        source: 'rules', status: 'suggested', context: body.p_context,
        suggestedAt: body.p_suggested_at, completedAt: null,
      },
      replayed: false,
      reused: false,
    });
  }
  if (path === '/rest/v1/rpc/rinlo_add_action_event') {
    return response(200, {
      action: {
        id: body.p_action_id,
        clientActionId: 'local-action-1',
        day: '2026-09-11', kind: 'movement', title: 'Пройдитесь 10 минут',
        rationale: 'Небольшой шаг', effortMinutes: 10, source: 'rules',
        status: body.p_event_type === 'completed' ? 'completed' : 'suggested',
        context: {}, suggestedAt: '2026-09-11T10:00:00.000Z',
        completedAt: body.p_event_type === 'completed' ? '2026-09-11T10:05:00.000Z' : null,
      },
      replayed: false,
      operationId: body.p_operation_id,
    });
  }
  throw new Error(`Unexpected fetch ${options.method || 'GET'} ${url}`);
}

const fallbackCalls = [];
const originalTransport = {
  enabled: true,
  async request(path, options = {}) {
    fallbackCalls.push({ path, options });
    if (path.startsWith('/api/v1/bootstrap')) {
      return {
        actions: [{ id: 'server-1', status: 'suggested' }],
        currentAction: { id: 'server-1', status: 'suggested' },
      };
    }
    return { fallback: true };
  },
};

const window = {
  HEALTHY_ACTION_CONFIG: {
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  },
  RinloSupabaseAuth: {
    async ensureSession() { return { access_token: 'access-token', user: { id: 'user-1' } }; },
  },
  RinloSupabaseTransport: originalTransport,
};

vm.runInContext(source, vm.createContext({
  window, fetch: fetchMock, URL, JSON, String, Boolean, Number, Date,
  RegExp, Error, encodeURIComponent, decodeURIComponent,
}), { filename: 'rinlo-supabase-action-transport-v1.js' });

const transport = window.RinloSupabaseTransport;
assert.equal(transport.actionSyncVersion, 'v1');

const imported = await transport.request('/api/v1/actions/import-local', {
  method: 'POST',
  body: JSON.stringify({
    clientActionId: 'local-action-1', day: '2026-09-11', kind: 'movement',
    title: 'Пройдитесь 10 минут', rationale: 'Небольшой шаг', effortMinutes: 10,
    context: { signal: 'steps_low' }, suggestedAt: '2026-09-11T10:00:00.000Z',
  }),
});
assert.equal(imported.action.clientActionId, 'local-action-1');
const importCall = calls.find((call) => call.url.endsWith('/rest/v1/rpc/rinlo_import_action'));
assert.ok(importCall);
const importBody = JSON.parse(importCall.options.body);
assert.equal(importBody.p_client_action_id, 'local-action-1');
assert.equal(importBody.p_day, '2026-09-11');
assert.equal(importCall.options.headers.Authorization, 'Bearer access-token');
assert.equal(importCall.options.headers.apikey, 'sb_publishable_test');

const eventResult = await transport.request('/api/v1/actions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events', {
  method: 'POST',
  body: JSON.stringify({
    operationId: 'action-op-1', eventType: 'completed', reasonCode: null, payload: {},
  }),
});
assert.equal(eventResult.action.status, 'completed');
const eventCall = calls.find((call) => call.url.endsWith('/rest/v1/rpc/rinlo_add_action_event'));
const eventBody = JSON.parse(eventCall.options.body);
assert.equal(eventBody.p_operation_id, 'action-op-1');
assert.equal(eventBody.p_action_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
assert.equal(eventBody.p_event_type, 'completed');

const bootstrap = await transport.request('/api/v1/bootstrap?day=2026-09-11');
assert.equal(bootstrap.actions[0].serverId, 'server-1');
assert.equal(bootstrap.currentAction.serverId, 'server-1');
assert.equal(fallbackCalls.length, 1);

console.log('Supabase action transport contract passed');
