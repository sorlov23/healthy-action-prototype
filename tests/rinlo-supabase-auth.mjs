import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await fs.readFile(new URL('../rinlo-supabase-auth-v1.js', import.meta.url), 'utf8');
const values = new Map();
const events = [];
let signupCount = 0;
let refreshCount = 0;
let rejectRefresh = false;
let nextUser = 1;

const localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
  };
}

async function fetchMock(url, options = {}) {
  assert.equal(options.headers.apikey, 'sb_publishable_test');
  assert.match(options.headers.Authorization, /^Bearer /);
  if (String(url).endsWith('/auth/v1/signup')) {
    signupCount += 1;
    const id = `user-${nextUser++}`;
    return response(200, {
      access_token: `access-${id}`,
      refresh_token: `refresh-${id}`,
      token_type: 'bearer',
      expires_in: 3600,
      user: { id, is_anonymous: true },
    });
  }
  if (String(url).includes('/auth/v1/token?grant_type=refresh_token')) {
    refreshCount += 1;
    if (rejectRefresh) return response(401, { message: 'refresh token revoked' });
    const body = JSON.parse(options.body || '{}');
    assert.ok(body.refresh_token, 'refresh request must include the refresh token');
    return response(200, {
      access_token: 'access-refreshed',
      refresh_token: 'refresh-rotated',
      token_type: 'bearer',
      expires_in: 3600,
      user: { id: 'user-1', is_anonymous: true },
    });
  }
  throw new Error(`Unexpected fetch ${url}`);
}

class CustomEventMock {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}

const window = {
  HEALTHY_ACTION_CONFIG: {
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
    supabaseAuthEnabled: true,
  },
  addEventListener() {},
  dispatchEvent(event) { events.push(event); return true; },
};
window.window = window;

const context = vm.createContext({
  window,
  localStorage,
  fetch: fetchMock,
  CustomEvent: CustomEventMock,
  console,
  Date,
  Promise,
  JSON,
  String,
  Number,
  Boolean,
  Error,
  Object,
  Array,
  Math,
  setTimeout,
  clearTimeout,
});
vm.runInContext(source, context, { filename: 'rinlo-supabase-auth-v1.js' });

const auth = window.RinloSupabaseAuth;
assert.equal(auth.version, 'v1');
assert.equal(auth.enabled, true);
assert.equal(signupCount, 0, 'loading the bridge must not create an anonymous user');

const [first, concurrent] = await Promise.all([auth.ensureSession(), auth.ensureSession()]);
assert.equal(first.user.id, 'user-1');
assert.equal(concurrent.user.id, 'user-1');
assert.equal(signupCount, 1, 'concurrent ensureSession calls must share one signup request');
assert.equal(events.at(-1)?.detail?.event, 'SIGNED_IN');

const cached = await auth.ensureSession();
assert.equal(cached.user.id, 'user-1');
assert.equal(signupCount, 1, 'fresh persisted session must be reused without network');
assert.equal(refreshCount, 0);

const storageKey = 'rinlo_supabase_session_v1';
const expiring = JSON.parse(localStorage.getItem(storageKey));
expiring.expires_at = Math.floor(Date.now() / 1000) + 20;
localStorage.setItem(storageKey, JSON.stringify(expiring));
const refreshed = await auth.ensureSession();
assert.equal(refreshed.access_token, 'access-refreshed');
assert.equal(refreshed.refresh_token, 'refresh-rotated');
assert.equal(refreshCount, 1);
assert.equal(signupCount, 1);
assert.equal(events.at(-1)?.detail?.event, 'TOKEN_REFRESHED');

const revoked = JSON.parse(localStorage.getItem(storageKey));
revoked.expires_at = Math.floor(Date.now() / 1000) + 20;
localStorage.setItem(storageKey, JSON.stringify(revoked));
rejectRefresh = true;
const replacement = await auth.ensureSession();
assert.equal(refreshCount, 2);
assert.equal(signupCount, 2, 'revoked anonymous session must fall back to a new anonymous identity');
assert.equal(replacement.user.id, 'user-2');
assert.equal(auth.getUserId(), 'user-2');

const accessToken = await auth.getAccessToken();
assert.equal(accessToken, 'access-user-2');

auth.clearLocalSession();
assert.equal(auth.getSession(), null);

console.log('Rinlo Supabase auth bridge tests passed');
