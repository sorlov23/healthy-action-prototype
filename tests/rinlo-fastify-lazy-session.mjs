import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const APP_KEY = 'healthy-action-v07';
const SESSION_KEY = 'ha_api_session_v1';
const source = await fs.readFile(new URL('../pwa-sync.js', import.meta.url), 'utf8');

function makeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const storage = makeStorage();
const requests = [];
const api = { enabled: true, base: 'http://api.test' };
const frameWindow = {
  saveFood() {},
  __selectedFoodIds: [],
  __photoFood: { selected: [] },
};
const frameDocument = { readyState: 'complete', getElementById() { return null; } };
const frame = {
  contentWindow: frameWindow,
  contentDocument: frameDocument,
  addEventListener() {},
};

const context = {
  window: {
    HealthyActionAPI: api,
    HEALTHY_ACTION_CONFIG: { apiTimeoutMs: 1000 },
    HEALTHY_FOOD_CATALOG: [],
  },
  document: { getElementById(id) { return id === 'app' ? frame : null; } },
  localStorage: storage,
  fetch: async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method || 'GET' });
    return {
      ok: true,
      status: 201,
      async json() {
        return {
          token: 'guest-token',
          userId: '11111111-1111-4111-8111-111111111111',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        };
      },
    };
  },
  setTimeout(fn) { fn(); return 0; },
  clearTimeout() {},
  AbortController,
  console,
  Date,
  JSON,
  Number,
  String,
  Boolean,
  Map,
  Set,
};
context.window.window = context.window;

vm.runInNewContext(source, context, { filename: 'pwa-sync.js' });

await Promise.resolve();
assert.equal(requests.length, 0, 'fresh install created a guest session during page load');
assert.equal(storage.getItem(SESSION_KEY), null, 'fresh install persisted a server session');
assert.equal(await api.ensureSession(), null, 'fresh install should keep Fastify identity lazy');
assert.equal(requests.length, 0, 'explicit ensureSession without profile called the backend');

storage.setItem(APP_KEY, JSON.stringify({ profile: { weight: 85 }, days: {} }));
const session = await api.ensureSession();
assert.equal(session?.token, 'guest-token');
assert.equal(requests.length, 1);
assert.match(requests[0].url, /\/api\/v1\/auth\/guest$/);
assert.ok(storage.getItem(SESSION_KEY), 'profile-backed guest session was not persisted');

console.log('Rinlo lazy Fastify session regression passed');
