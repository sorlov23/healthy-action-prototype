import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHandler, validSubscription, notificationPayload, APP_ORIGIN } from '../supabase/functions/fit74-push/core.mjs';

const subscription = { endpoint: 'https://web.push.apple.com/test-device', keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'A'.repeat(22) } };
assert(validSubscription(subscription));
for (const endpoint of ['http://web.push.apple.com/test', 'https://127.0.0.1/test',
  'https://web.push.apple.com.attacker.invalid/test', 'https://user@web.push.apple.com/test',
  'https://web.push.apple.com:444/test']) assert(!validSubscription({ ...subscription, endpoint }));
assert(!validSubscription({ ...subscription, keys: { auth: 'bad', p256dh: 'bad' } }));

function fixture(options = {}) {
  const calls = [];
  const config = { scheduler_secret: 'private-dispatch-key', vapid_public: 'public-key',
    vapid_private: 'private-signing-key', last_run_at: '2026-11-04T18:29:00Z' };
  const store = {
    config: async () => config,
    initializeKeys: async keys => Object.assign(config, { vapid_public: keys.publicKey, vapid_private: keys.privateKey }),
    subscribe: async (...args) => calls.push(['subscribe', ...args]),
    owned: async (...args) => { calls.push(['owned', ...args]); return { enabled: true }; },
    disable: async (...args) => calls.push(['disable', ...args]),
    claimDue: async () => [{ endpoint: subscription.endpoint, ...subscription.keys, local_date: '2026-11-04' }],
    claimTest: async (...args) => { calls.push(['claimTest', ...args]); return options.throttle ? null : { endpoint: subscription.endpoint, ...subscription.keys }; },
    sent: async (...args) => calls.push(['sent', ...args]),
    failed: async (...args) => calls.push(['failed', ...args]),
    heartbeat: async result => calls.push(['heartbeat', result]),
  };
  const push = { generateVAPIDKeys: () => ({ publicKey: 'public-key', privateKey: 'private-signing-key' }),
    sendNotification: async (...args) => { calls.push(['push', ...args]); if (options.expired) throw { statusCode: 410 }; } };
  const handler = createHandler({ store, push, now: () => new Date('2026-11-04T18:30:00Z'),
    authenticate: async header => header === 'Bearer valid-user' ? { id: 'authenticated-user' } : null });
  const request = (body, headers = {}) => handler(new Request(APP_ORIGIN, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }));
  return { handler, request, calls, config };
}

{
  const f = fixture(), result = await f.handler(new Request(APP_ORIGIN));
  const data = await result.json();
  assert.equal(result.status, 200); assert.equal(data.schedulerHealthy, true);
  assert.equal(data.timeZone, 'Europe/Moscow');
  assert(!JSON.stringify(data).includes('private-'));
  assert.equal((await f.request({ action: 'dispatch' })).status, 401);
  assert.equal((await f.request({ action: 'subscribe', subscription })).status, 401);
  assert.equal(f.calls.length, 0);
}
{
  const f = fixture(), headers = { Authorization: 'Bearer valid-user' };
  assert.equal((await f.request({ action: 'subscribe', subscription: { ...subscription, endpoint: 'https://internal.invalid' } }, headers)).status, 400);
  assert.equal((await f.request({ action: 'subscribe', subscription, user_id: 'other-user' }, headers)).status, 200);
  assert.deepEqual(f.calls[0], ['subscribe', 'authenticated-user', subscription, 'Europe/Moscow']);
  assert.equal((await f.request({ action: 'test', endpoint: subscription.endpoint, user_id: 'other-user' }, headers)).status, 200);
  assert.equal(f.calls.find(x => x[0] === 'claimTest')[1], 'authenticated-user');
  assert.equal(f.calls.filter(x => x[0] === 'sent').length, 0, 'test does not consume the daily reminder');
}
{
  const f = fixture({ throttle: true });
  assert.equal((await f.request({ action: 'test', endpoint: subscription.endpoint }, { Authorization: 'Bearer valid-user' })).status, 429);
  assert(!f.calls.some(x => x[0] === 'push'));
}
{
  const f = fixture();
  const result = await f.request({ action: 'dispatch' }, { 'x-fit74-scheduler': f.config.scheduler_secret });
  assert.deepEqual(await result.json(), { claimed: 1, sent: 1 });
  const sent = f.calls.find(x => x[0] === 'push');
  assert.equal(sent[3].TTL, 1800); assert.equal(sent[3].urgency, 'high');
  assert.equal(sent[3].vapidDetails.privateKey, 'private-signing-key');
  assert.equal(JSON.parse(sent[2]).web_push, 8030);
  assert.deepEqual(f.calls.find(x => x[0] === 'sent'), ['sent', subscription.endpoint, '2026-11-04']);
}
{
  const f = fixture({ expired: true });
  const result = await f.request({ action: 'dispatch' }, { 'x-fit74-scheduler': f.config.scheduler_secret });
  assert.deepEqual(await result.json(), { claimed: 1, sent: 0 });
  assert.deepEqual(f.calls.find(x => x[0] === 'failed'), ['failed', subscription.endpoint, 410, true]);
  assert(!f.calls.some(x => x[0] === 'sent'));
}

const workerSource = await readFile(new URL('../fit74/sw.js', import.meta.url), 'utf8');
{
  const handlers = {}, notifications = [], opened = [], messages = [];
  const self = { addEventListener: (name, fn) => handlers[name] = fn, skipWaiting() {},
    location: new URL(APP_ORIGIN + '/sw.js'), registration: { showNotification: async (...args) => notifications.push(args) },
    clients: { claim: async () => {}, matchAll: async () => [{ url: APP_ORIGIN, focus: async () => {}, postMessage: data => messages.push(data) }], openWindow: async url => opened.push(url) } };
  vm.runInNewContext(workerSource, { self, caches: { keys: async () => [], delete: async () => {} }, URL });
  assert(!handlers.fetch, 'worker never intercepts application loads');
  let pending;
  handlers.push({ data: { json: () => notificationPayload('2026-11-04') }, waitUntil: p => pending = p });
  await pending;
  assert.equal(notifications.length, 1); assert.equal(notifications[0][0], 'Fit74 · день ещё открыт');
  handlers.push({ data: { json: () => { throw Error('bad json'); } }, waitUntil: p => pending = p });
  await pending; assert.equal(notifications.length, 2, 'even malformed pushes show a visible fallback');
  handlers.notificationclick({ notification: { close() {} }, waitUntil: p => pending = p });
  await pending; assert.deepEqual(JSON.parse(JSON.stringify(messages)), [{ type: 'fit74-open-checkin' }]);
  self.clients.matchAll = async () => [];
  handlers.notificationclick({ notification: { close() {} }, waitUntil: p => pending = p });
  await pending; assert.equal(opened[0], APP_ORIGIN + '/index.html?fit74v=19&checkin=1');
}

const clientSource = await readFile(new URL('../fit74/push-notifications.js', import.meta.url), 'utf8');
const previewSource = await readFile(new URL('../scripts/preview-fit74.mjs', import.meta.url), 'utf8');
const fixtureStart = previewSource.indexOf('const fixture=`') + 'const fixture=`'.length;
const fixtureEnd = previewSource.indexOf('`;\ncreateServer', fixtureStart);
new vm.Script(previewSource.slice(fixtureStart, fixtureEnd).replace(/^<script>\n/, '').replace(/<\/script>$/, ''));
const settle = () => new Promise(resolve => setImmediate(resolve));
async function clientFixture({ iphone = false, standalone = false, denied = false } = {}) {
  const elements = Object.fromEntries(['reminderHint', 'connectPushBtn', 'testPushBtn'].map(id => [id, { addEventListener(name, cb) { this[name] = cb; } }]));
  const calls = [], subscription = { endpoint: 'device', toJSON: () => ({ endpoint: 'device' }), unsubscribe: async () => calls.push('unsubscribe') };
  const registration = { active: {}, update: async () => {}, pushManager: { getSubscription: async () => null,
    subscribe(options) { calls.push(['subscribe', options.userVisibleOnly]); return Promise.resolve(subscription); } } };
  const window = { PushManager() {}, Notification: { permission: denied ? 'denied' : 'default' } };
  const sandbox = { window, navigator: { userAgent: iphone ? 'iPhone' : 'Chrome', standalone,
    serviceWorker: { register: async () => registration, addEventListener() {} } },
    Notification: window.Notification, matchMedia: () => ({ matches: standalone }),
    document: { querySelector: s => elements[s.slice(1)], addEventListener() {} },
    atob: value => Buffer.from(value, 'base64').toString('binary'), Uint8Array, setTimeout, clearTimeout, console };
  vm.runInNewContext(clientSource, sandbox);
  const context = { userId: 'fixture-user', settings: { reminder_enabled: true },
    publicConfig: async () => ({ publicKey: 'B' + 'A'.repeat(86), schedulerHealthy: true }),
    request: async body => { calls.push(body.action); return { connected: body.action === 'subscribe' }; }, openCheckin() {} };
  window.Fit74Push.start(context); await settle(); await settle();
  return { elements, calls, api: window.Fit74Push };
}
{
  const f = await clientFixture({ iphone: true });
  assert.match(f.elements.reminderHint.textContent, /экрана «Домой»/);
  assert.equal(f.elements.connectPushBtn.disabled, true); assert.equal(f.calls.length, 0);
}
{
  const f = await clientFixture({ denied: true });
  assert.match(f.elements.reminderHint.textContent, /запрещены/);
  assert.equal(f.elements.connectPushBtn.disabled, true);
}
{
  const f = await clientFixture();
  assert.equal(f.calls.length, 0, 'no permission prompt on app startup');
  const promise = f.elements.connectPushBtn.click();
  assert.deepEqual(f.calls, [['subscribe', true]], 'subscription starts synchronously from the user gesture');
  await promise; assert.deepEqual(f.calls, [['subscribe', true], 'subscribe']);
  assert.equal(f.elements.testPushBtn.hidden, false); assert.match(f.elements.reminderHint.textContent, /устройство подключено/);
  await f.elements.testPushBtn.click(); assert(f.calls.includes('test'));
  await f.api.disconnect(); assert.deepEqual(f.calls.slice(-2), ['unsubscribe', 'unsubscribe']);
}
console.log('Fit74 push: auth, ownership, endpoint validation, dispatch, test throttling, expired devices, visible worker, deep links and client permission flow passed.');
