import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const runId = String(process.env.GITHUB_RUN_ID || Date.now());
const marker = `rinlo-live-sync-${runId}`;
const day = '2026-09-10';

assert.ok(supabaseUrl && publishableKey, 'Supabase public config is required');

async function createMarkedAnonymousSession() {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify({
      data: { client: 'rinlo-live-sync-ci', run_id: runId, marker },
      gotrue_meta_security: { captcha_token: null },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`anonymous signup failed: ${response.status} ${JSON.stringify(data)}`);
  assert.ok(data.access_token && data.refresh_token && data.user?.id, 'anonymous session is incomplete');
  return data;
}

const session = await createMarkedAnonymousSession();
console.log(`LIVE_SYNC_RUN_ID=${runId}`);
console.log(`LIVE_SYNC_USER_ID=${session.user.id}`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') console.log(`BROWSER_ERROR ${message.text()}`);
  });
  page.on('pageerror', (error) => console.log(`PAGE_ERROR ${error.message}`));

  await page.goto('http://127.0.0.1:4173/pwa.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.RinloServerSync && window.RinloSupabaseTransport?.enabled), null, { timeout: 15000 });

  // Empty first load must stay lazy: no anonymous identity should have been created
  // by the app itself before we inject the explicitly marked test session.
  const beforeSession = await page.evaluate(() => localStorage.getItem('rinlo_supabase_session_v1'));
  assert.equal(beforeSession, null, 'PWA created an anonymous session on empty load');

  const seeded = await page.evaluate(({ session, marker, day }) => {
    localStorage.setItem('rinlo_supabase_session_v1', JSON.stringify(session));
    const profile = {
      weight: 85,
      goal: 70,
      height: 176,
      age: 37,
      activity: 'low',
      habits: ['water'],
      sex: 'male',
      primaryGoal: 'weight_loss',
      secondaryGoals: ['movement'],
      calorieTrackingEnabled: true,
    };
    const foodLocalId = `local-food:${marker}`;
    const weightLocalId = `local-weight:${marker}`;
    const foodClientEventId = `food:${marker}`;
    const weightClientEventId = `weight:${marker}`;
    const operationId = `metric:${marker}`;
    const eatenAt = '2026-09-10T08:15:00.000Z';
    const measuredAt = '2026-09-10T07:30:00.000Z';

    localStorage.setItem('healthy-action-v07', JSON.stringify({
      profile,
      days: {
        [day]: {
          events: [
            { id: foodLocalId, type: 'food', time: eatenAt, text: `Live probe ${marker}`, cal: 321, protein: 23, clientEventId: foodClientEventId },
            { id: weightLocalId, type: 'weight', time: measuredAt, weight: 82.3, clientEventId: weightClientEventId },
          ],
          water: 250,
          steps: 1200,
          habits: { water: true },
          closed: false,
          rinloCheckin: { wellbeing: 'good', energy: 4, sleepQuality: 4, sleepMinutes: 450, note: `Live probe ${marker}` },
        },
      },
    }));

    const outbox = [
      {
        id: `sync-profile:${marker}`,
        kind: 'profile-upsert',
        payload: {
          startWeightKg: 85,
          targetWeightKg: 70,
          heightCm: 176,
          ageYears: 37,
          sex: 'male',
          activity: 'low',
          focuses: ['water'],
          primaryGoal: 'weight_loss',
          secondaryGoals: ['movement'],
          calorieTrackingEnabled: true,
          calorieTarget: 1900,
          proteinTargetG: 120,
          stepTarget: 8000,
        },
      },
      {
        id: `sync-food:${marker}`,
        kind: 'food-create',
        day,
        localEventId: foodLocalId,
        payload: {
          clientEventId: foodClientEventId,
          eatenAt,
          source: 'manual',
          originalText: `Live probe ${marker}`,
          totalKcal: 321,
          totalProtein: 23,
          items: [],
        },
      },
      {
        id: `sync-weight:${marker}`,
        kind: 'weight-create',
        day,
        localEventId: weightLocalId,
        payload: {
          clientEventId: weightClientEventId,
          weightKg: 82.3,
          measuredAt,
        },
      },
      {
        id: `sync-metric:${marker}`,
        kind: 'metric-delta',
        day,
        operationId,
        waterMlDelta: 250,
        stepsDelta: 1200,
      },
      {
        id: `sync-habit:${marker}`,
        kind: 'habit-set',
        day,
        habit: 'water',
        done: true,
      },
      {
        id: `sync-checkin:${marker}`,
        kind: 'checkin-upsert',
        day,
        payload: { wellbeing: 'good', energy: 4, sleepQuality: 4, sleepMinutes: 450, note: `Live probe ${marker}` },
      },
    ].map((item) => ({ createdAt: new Date().toISOString(), attempts: 0, ...item }));
    localStorage.setItem('rinlo-sync-outbox-v1', JSON.stringify(outbox));
    return { foodLocalId, weightLocalId, foodClientEventId, weightClientEventId, operationId };
  }, { session, marker, day });

  const drained = await page.evaluate(async () => window.RinloServerSync.syncNow({ pullAfter: true }));
  assert.equal(drained, true, 'durable outbox did not drain');

  const state = await page.evaluate(({ day, seeded }) => {
    const outbox = JSON.parse(localStorage.getItem('rinlo-sync-outbox-v1') || '[]');
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const events = db.days?.[day]?.events || [];
    return {
      outbox,
      profile: db.profile || null,
      day: db.days?.[day] || null,
      food: events.find((event) => String(event.id) === seeded.foodLocalId || event.clientEventId === seeded.foodClientEventId),
      weight: events.find((event) => String(event.id) === seeded.weightLocalId || event.clientEventId === seeded.weightClientEventId),
      userId: window.RinloSupabaseAuth?.getUserId?.() || null,
      syncError: window.HealthyActionAPI?.lastSyncError || null,
    };
  }, { day, seeded });

  assert.equal(state.outbox.length, 0, `outbox still has ${state.outbox.length} entries`);
  assert.equal(state.userId, session.user.id, 'auth bridge replaced the injected anonymous identity');
  assert.equal(state.syncError, null, `sync error: ${state.syncError}`);
  assert.ok(state.food?.serverId, 'food did not receive serverId');
  assert.ok(state.weight?.serverId, 'weight did not receive serverId');
  assert.equal(Number(state.day?.water), 250);
  assert.equal(Number(state.day?.steps), 1200);
  assert.equal(state.day?.habits?.water, true);
  assert.equal(state.day?.rinloCheckin?.wellbeing, 'good');
  assert.equal(Number(state.profile?.weight), 85);

  const bootstrap = await page.evaluate(async ({ day }) => window.RinloSupabaseTransport.request(
    `/api/v1/bootstrap?day=${day}&timezoneOffsetMinutes=0`
  ), { day });
  assert.equal(bootstrap.profile.userId, session.user.id);
  assert.ok(bootstrap.day.food.items.some((item) => item.clientEventId === seeded.foodClientEventId));
  assert.ok(bootstrap.weights.some((item) => item.clientEventId === seeded.weightClientEventId));
  assert.equal(bootstrap.day.metrics.waterMl, 250);
  assert.equal(bootstrap.day.metrics.steps, 1200);
  assert.equal(bootstrap.day.metrics.habits.water, true);
  assert.equal(bootstrap.checkin.wellbeing, 'good');

  // Replay the exact same operation directly through the transport. The RPC must
  // report replay and must not double the accumulated metrics.
  const replay = await page.evaluate(async ({ day, operationId }) => window.RinloSupabaseTransport.request('/api/v1/daily/metrics', {
    method: 'POST',
    body: JSON.stringify({ operationId, day, waterMlDelta: 250, stepsDelta: 1200 }),
  }), { day, operationId: seeded.operationId });
  assert.equal(replay.replayed, true);
  assert.equal(replay.waterMl, 250);
  assert.equal(replay.steps, 1200);

  console.log('LIVE_SYNC_BROWSER_PROBE=PASS');
} finally {
  await browser.close();
}
