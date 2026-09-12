import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../rinlo-evening-review-v1.js', import.meta.url), 'utf8');
const storage = new Map();
const queued = [];
const styles = [];
let sheetHtml = '';
let closed = false;
let toastText = '';

const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

localStorage.setItem('healthy-action-v07', JSON.stringify({
  profile: { weight: 85, goal: 75 },
  days: {
    '2026-09-12': {
      events: [], water: 0, steps: 0, habits: {}, closed: false,
      rinloActions: [{
        id: 'local-action-1',
        serverId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        status: 'completed',
        feedback: { useful: true },
      }],
    },
  },
}));

const doc = {
  head: { appendChild(node) { styles.push(node); } },
  getElementById(id) { return styles.find((node) => node.id === id) || null; },
  createElement() { return {}; },
};

const win = {
  document: doc,
  __haViewDay: '2026-09-12',
  finishDay() {},
  openSheet(html) { sheetHtml = html; },
  closeSheet() { closed = true; },
  toast(text) { toastText = text; },
  eval() {},
  render() {},
};

const frame = {
  contentWindow: win,
  addEventListener() {},
};

const extensions = {};
const window = {
  HealthyActionAPI: { enabled: true },
  RinloSupabaseTransport: { enabled: false },
  RinloServerSyncExtensions: extensions,
  RinloServerSync: {
    enqueue(item, options) { queued.push({ item, options }); },
    pending() { return []; },
  },
  addEventListener() {},
};
const document = { getElementById(id) { return id === 'app' ? frame : null; } };

vm.runInContext(source, vm.createContext({
  window, document, localStorage, console,
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  Date, JSON, String, Boolean, Object, Array, RegExp, Error,
  encodeURIComponent, fetch: async () => { throw new Error('unexpected fetch'); },
}), { filename: 'rinlo-evening-review-v1.js' });

assert.equal(win.__rinloEveningReview, 'v1');
assert.equal(window.RinloEveningReview.version, 'v1');

win.finishDay();
assert.match(sheetHtml, /Как ощущался сегодняшний план/);
assert.match(sheetHtml, /Главное действие было полезным/);
assert.match(sheetHtml, /В самый раз/);
assert.match(sheetHtml, /Сохранить итог/);

// Existing per-action positive feedback prefills the usefulness answer.
assert.match(sheetHtml, /rer-option sel[^>]*>Да</);
win.rinloEveningReviewPlanFit('right');
win.rinloEveningReviewSave();

const state = JSON.parse(localStorage.getItem('healthy-action-v07'));
const review = state.days['2026-09-12'].rinloEveningReview;
assert.equal(state.days['2026-09-12'].closed, true);
assert.equal(review.planFit, 'right');
assert.equal(review.actionUseful, 'yes');
assert.equal(review.mainActionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
assert.equal(closed, true);
assert.equal(toastText, 'Итог сохранён');
assert.equal(queued.length, 1);
assert.equal(queued[0].item.kind, 'evening-review-upsert');
assert.equal(queued[0].item.day, '2026-09-12');
assert.equal(queued[0].options.replaceKey, 'evening-review:2026-09-12');

const ctxState = JSON.parse(localStorage.getItem('healthy-action-v07'));
const requestCalls = [];
const result = await extensions.processItem({
  kind: 'evening-review-upsert',
  day: '2026-09-12',
  payload: { planFit: 'easy', actionUseful: 'no', mainActionId: null },
}, {
  async request(path, options) {
    requestCalls.push({ path, options });
    return { eveningReview: {
      day: '2026-09-12', planFit: 'easy', actionUseful: 'no', mainActionId: null,
      createdAt: '2026-09-12T20:00:00.000Z', updatedAt: '2026-09-12T20:00:00.000Z',
    } };
  },
  readDb() { return JSON.parse(localStorage.getItem('healthy-action-v07')); },
  writeDb(db) { localStorage.setItem('healthy-action-v07', JSON.stringify(db)); },
  refreshFrame() {},
});
assert.equal(result.handled, true);
assert.equal(requestCalls[0].path, '/api/v1/evening-reviews/2026-09-12');
assert.equal(JSON.parse(localStorage.getItem('healthy-action-v07')).days['2026-09-12'].rinloEveningReview.planFit, 'easy');

const seedItems = [];
extensions.seedSupabaseIdentity({
  db: ctxState,
  add(item) { seedItems.push(item); },
});
assert.equal(seedItems.length, 1);
assert.equal(seedItems[0].kind, 'evening-review-upsert');
assert.equal(seedItems[0].replaceKey, 'evening-review:2026-09-12');

console.log('Evening review local-first bridge contract passed');
