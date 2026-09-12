import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const APP_KEY = 'healthy-action-v07';
const source = await fs.readFile(new URL('../rinlo-adaptive-learning-v1.js', import.meta.url), 'utf8');

function makeStorage(initial) {
  const values = new Map([[APP_KEY, JSON.stringify(initial)]]);
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    read() { return JSON.parse(values.get(APP_KEY) || '{}'); },
  };
}

function previousDay(review, kind = 'movement') {
  return {
    events: [], water: 0, steps: 0, habits: {}, closed: true,
    rinloActions: [{
      id: 'previous-action',
      kind,
      status: 'completed',
      title: 'Предыдущий шаг',
      rationale: 'Предыдущая рекомендация',
      effortMinutes: 10,
    }],
    rinloEveningReview: {
      day: '2026-09-11',
      ...review,
    },
  };
}

function currentDay() {
  return { events: [], water: 0, steps: 0, habits: {}, closed: false, rinloActions: [] };
}

function boot(initial, { replacementKind = 'hydration' } = {}) {
  const storage = makeStorage(initial);
  const win = {
    __haViewDay: '2026-09-12',
    eval() {},
    renderToday() {},
    async rinloCoreCheckin() {
      const db = storage.read();
      db.days['2026-09-12'].rinloActions.unshift({
        id: 'current-action',
        kind: 'movement',
        status: 'suggested',
        title: 'Пройдитесь 10 минут',
        rationale: 'Небольшой прогулки достаточно.',
        effortMinutes: 10,
        context: { signal: 'steps_low' },
      });
      storage.setItem(APP_KEY, JSON.stringify(db));
    },
    async rinloCoreSkipCheckin() { return this.rinloCoreCheckin(); },
    async rinloCoreReplaceAction() {
      const db = storage.read();
      const actions = db.days['2026-09-12'].rinloActions;
      const active = actions.find((action) => ['suggested','accepted'].includes(action.status));
      if (active) active.status = 'replaced';
      actions.unshift({
        id: 'replacement-action',
        kind: replacementKind,
        status: 'suggested',
        title: replacementKind === 'hydration' ? 'Выпейте стакан воды' : 'Другой шаг',
        rationale: 'Альтернативная рекомендация.',
        effortMinutes: replacementKind === 'hydration' ? 2 : 10,
        context: { signal: 'alternative' },
      });
      storage.setItem(APP_KEY, JSON.stringify(db));
    },
  };
  const frame = { contentWindow: win, addEventListener() {} };
  const outerWindow = {
    HEALTHY_ACTION_CONFIG: {},
    HealthyActionAPI: { enabled: false },
    RinloSupabaseTransport: { enabled: false },
    addEventListener() {},
  };
  const context = {
    window: outerWindow,
    document: { getElementById(id) { return id === 'app' ? frame : null; } },
    localStorage: storage,
    console,
    fetch: async () => { throw new Error('unexpected fetch'); },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
    Date,
    URL,
    RegExp,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Object,
    Array,
  };
  outerWindow.window = outerWindow;
  vm.runInNewContext(source, context, { filename: 'rinlo-adaptive-learning-v1.js' });
  return { storage, win, outerWindow };
}

{
  const { storage, win } = boot({
    profile: { primaryGoal: 'weight_loss' },
    days: {
      '2026-09-11': previousDay({ planFit: 'right', actionUseful: 'no' }),
      '2026-09-12': currentDay(),
    },
  });

  await win.rinloCoreCheckin('okay');
  const active = storage.read().days['2026-09-12'].rinloActions.find((action) => action.status === 'suggested');
  assert.equal(active.kind, 'hydration');
  assert.equal(active.context.adaptation.avoidedPreviousKind, true);
}

{
  const { storage, win } = boot({
    profile: { primaryGoal: 'weight_loss' },
    days: {
      '2026-09-11': previousDay({ planFit: 'too_much', actionUseful: 'yes' }),
      '2026-09-12': currentDay(),
    },
  });

  await win.rinloCoreCheckin('okay');
  const active = storage.read().days['2026-09-12'].rinloActions.find((action) => action.status === 'suggested');
  assert.equal(active.kind, 'movement');
  assert.equal(active.effortMinutes, 5);
  assert.equal(active.title, 'Пройдитесь 5 минут');
  assert.match(active.rationale, /шаг короче/);
  assert.equal(active.context.adaptation.effortReduced, true);
}

console.log('Rinlo adaptive learning browser contract passed');
