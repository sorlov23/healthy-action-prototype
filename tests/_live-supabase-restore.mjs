import { chromium } from 'playwright';

const baseUrl = process.env.RINLO_E2E_URL || 'http://127.0.0.1:4173/pwa.html';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
const runtimeErrors = [];
let probeUserId = null;
let probeActionId = null;

page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.stack || error.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function appFrame({ requireGoal = true } = {}) {
  await page.waitForSelector('#app');
  const handle = await page.locator('#app').elementHandle();
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('Rinlo iframe not available');
  await frame.waitForFunction(() => (
    window.__rinloCoreUiV1 === true
    && window.__rinloFunctionalMvp === 'v1'
    && window.__rinloStability === 'v1'
    && window.__rinloServerSync === 'v1'
  ), null, { timeout: 15000 });
  await page.waitForFunction(() => (
    window.RinloServerSync
    && window.RinloActionSync?.version === 'v1'
    && window.RinloSupabaseAuth?.enabled === true
    && window.RinloSupabaseTransport?.enabled === true
  ), null, { timeout: 15000 });
  if (requireGoal) {
    await frame.locator('[data-primary-goal="weight_loss"]').waitFor({ state: 'attached', timeout: 10000 });
  }
  return frame;
}

async function syncNow() {
  let result = await page.evaluate(() => window.RinloServerSync.syncNow({ pullAfter: true }));
  if (result !== true) {
    // A mutation schedules its own auto-drain. syncNow() intentionally returns
    // false when that drain is already in progress, so wait for it to finish and
    // run once more to guarantee the post-drain bootstrap pull.
    await page.waitForFunction(() => window.RinloServerSync.pending().length === 0, null, { timeout: 15000 });
    result = await page.evaluate(() => window.RinloServerSync.syncNow({ pullAfter: true }));
  }
  assert(result === true, 'Live Supabase sync did not complete');
  await page.waitForFunction(() => window.RinloServerSync.pending().length === 0, null, { timeout: 15000 });
}

async function localState() {
  return page.locator('#app').evaluate((frame) => {
    const win = frame.contentWindow;
    return JSON.parse(win.localStorage.getItem('healthy-action-v07') || '{}');
  });
}

function completedWithFeedback(state) {
  for (const [day, value] of Object.entries(state.days || {})) {
    const action = (value?.rinloActions || []).find((item) => item.status === 'completed' && item.feedback?.useful === true);
    if (action) return { day, action };
  }
  return null;
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  let app = await appFrame();

  const session = await page.evaluate(() => window.RinloSupabaseAuth.ensureSession());
  probeUserId = session?.user?.id || null;
  assert(probeUserId, 'Anonymous Supabase user was not created');
  console.log(`LIVE_PROBE_USER_ID=${probeUserId}`);

  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rcOnNext').click();
  await app.locator('#obWeight').fill('85');
  await app.locator('#obGoal').fill('75');
  await app.locator('#obHeight').fill('176');
  await app.locator('#obAge').fill('37');
  await app.locator('#rcSex').selectOption('male');
  await app.locator('#rcOnNext').click();
  await app.locator('#rcOnNext').click();
  await app.locator('#rcOnNext').click();
  await app.locator('#today').waitFor({ state: 'visible', timeout: 10000 });

  await app.getByRole('button', { name: 'Нормально' }).click();
  await app.locator('.rc-action').waitFor({ state: 'visible', timeout: 10000 });
  await syncNow();

  await app.getByRole('button', { name: 'Сделано' }).click();
  await app.locator('.rc-action.completed').waitFor({ state: 'visible', timeout: 10000 });
  await syncNow();

  await app.locator('.rc-feedback button').filter({ hasText: 'Да' }).click();
  await syncNow();

  let state = await localState();
  let completed = completedWithFeedback(state);
  assert(completed, `Local completed action is missing feedback=true: ${JSON.stringify(state.days || {})}`);
  probeActionId = completed.action.serverId || completed.action.id;
  assert(probeActionId, 'Completed action has no server identity');
  console.log(`LIVE_PROBE_ACTION_ID=${probeActionId}`);

  const bootstrapBeforeWipe = await page.evaluate(async () => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return window.RinloSupabaseTransport.request(`/api/v1/bootstrap?day=${encodeURIComponent(day)}&timezoneOffsetMinutes=${encodeURIComponent(now.getTimezoneOffset())}`);
  });
  const remoteBeforeWipe = (bootstrapBeforeWipe?.actions || []).find((action) => action.status === 'completed' && action.feedback?.useful === true);
  assert(remoteBeforeWipe, `Supabase bootstrap did not return feedback=true before wipe: ${JSON.stringify(bootstrapBeforeWipe?.actions || [])}`);
  console.log('LIVE_PROBE_REMOTE_FEEDBACK_BEFORE_WIPE=true');

  // Remove the complete application payload and all queued operations while
  // preserving only the anonymous auth identity. Losing the auth token as well
  // would intentionally create a different anonymous user and therefore cannot
  // test server restoration for the same account.
  await page.evaluate(() => {
    const authSession = localStorage.getItem('rinlo_supabase_session_v1');
    localStorage.clear();
    if (authSession) localStorage.setItem('rinlo_supabase_session_v1', authSession);
  });

  const emptyAfterWipe = await page.evaluate(() => !localStorage.getItem('healthy-action-v07') && !localStorage.getItem('rinlo-sync-outbox-v1'));
  assert(emptyAfterWipe, 'Application local payload was not fully cleared');
  console.log('LIVE_PROBE_LOCAL_PAYLOAD_WIPED=true');

  await page.reload({ waitUntil: 'domcontentloaded' });
  app = await appFrame({ requireGoal: false });

  // With the preserved Supabase session, RinloServerSync.shouldAutoSync() is true.
  // Wait for the normal initial sync to rebuild the local payload; do not invoke
  // a private restore shortcut here.
  await page.waitForFunction(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    if (!db.profile) return false;
    return Object.values(db.days || {}).some((day) =>
      (day?.rinloActions || []).some((action) => action.status === 'completed' && action.feedback?.useful === true)
    );
  }, null, { timeout: 20000 });

  state = await localState();
  completed = completedWithFeedback(state);
  assert(state.profile?.weight === 85 && state.profile?.goal === 75, `Profile did not restore from live Supabase: ${JSON.stringify(state.profile)}`);
  assert(completed, `feedback.useful=true did not survive full local payload wipe: ${JSON.stringify(state.days || {})}`);
  assert(String(completed.action.serverId || completed.action.id) === String(probeActionId), 'Restored completed action identity changed');
  assert(completed.action.feedback?.useful === true, 'Restored action feedback is not true');

  const restoredSessionUserId = await page.evaluate(() => window.RinloSupabaseAuth.getUserId());
  assert(restoredSessionUserId === probeUserId, 'Anonymous Supabase identity changed during restore');

  console.log('LIVE_PROBE_RESTORED_FEEDBACK_USEFUL=true');
  console.log('LIVE_PROBE_RESULT=PASS');

  if (runtimeErrors.length) throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
} catch (error) {
  console.error(`LIVE_PROBE_RESULT=FAIL ${error?.stack || error}`);
  throw error;
} finally {
  if (probeUserId) console.log(`LIVE_PROBE_CLEANUP_USER_ID=${probeUserId}`);
  if (probeActionId) console.log(`LIVE_PROBE_CLEANUP_ACTION_ID=${probeActionId}`);
  await browser.close();
}
