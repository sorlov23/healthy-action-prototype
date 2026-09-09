import { chromium } from 'playwright';

const baseUrl = process.env.RINLO_E2E_URL || 'http://127.0.0.1:4173/pwa.html';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`); });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function appFrame() {
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
  await page.waitForFunction(() => window.RinloServerSync && window.HealthyActionAPI?.enabled === true, null, { timeout: 15000 });
  return frame;
}

async function syncNow() {
  const result = await page.evaluate(() => window.RinloServerSync.syncNow());
  assert(result === true, 'Rinlo outbox did not drain');
  const pending = await page.evaluate(() => window.RinloServerSync.pending().length);
  assert(pending === 0, `Outbox still has ${pending} item(s)`);
}

async function waitFor(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  let app = await appFrame();

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
  await app.locator('#today').waitFor({ state: 'visible' });

  await app.getByRole('button', { name: 'Нормально' }).click();
  await app.locator('.rc-action').waitFor({ state: 'visible' });

  await app.locator('.rc-quick button').filter({ hasText: '+250 мл' }).click();
  await app.locator('.rc-quick button').filter({ hasText: '+1000' }).click();

  // Hold the first food create request open so an edit happens while the create
  // item is genuinely in flight. The edit must survive as a dependent update.
  let foodCreateSeenResolve;
  let foodCreateRelease;
  let interceptFirstFoodCreate = true;
  const foodCreateSeen = new Promise((resolve) => { foodCreateSeenResolve = resolve; });
  await page.route('**/api/v1/food/logs', async (route) => {
    if (route.request().method() === 'POST' && interceptFirstFoodCreate) {
      interceptFirstFoodCreate = false;
      foodCreateSeenResolve();
      await new Promise((resolve) => { foodCreateRelease = resolve; });
    }
    await route.continue();
  });

  await app.locator('.rc-quick button').filter({ hasText: 'Еда' }).click();
  await app.locator('#rfFoodText').fill('омлет из двух яиц и кофе');
  await app.getByRole('button', { name: 'Получить оценку' }).click();
  await app.locator('#rfFoodCal').fill('310');
  await app.locator('#rfFoodProtein').fill('20');
  await app.getByRole('button', { name: 'Добавить в дневник' }).click();

  await waitFor(foodCreateSeen, 5000, 'Food create request never entered the in-flight state');
  let state = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}'));
  let dayKey = Object.keys(state.days || {}).sort().at(-1);
  let day = state.days?.[dayKey];
  let food = (day?.events || []).find((event) => event.type === 'food');
  assert(food && !food.serverId, 'Food create was not held before server identity assignment');

  await app.evaluate((id) => window.rinloEditEvent(id), food.id);
  await app.locator('#rfEditText').fill('омлет, кофе и йогурт');
  await app.locator('#rfEditCal').fill('420');
  await app.locator('#rfEditProtein').fill('31');
  await app.getByRole('button', { name: 'Сохранить изменения' }).click();

  const pendingDuringCreate = await page.evaluate(() => window.RinloServerSync.pending().map((item) => ({ kind: item.kind, serverId: item.serverId || null })));
  assert(pendingDuringCreate.some((item) => item.kind === 'food-create'), 'In-flight food create disappeared from outbox');
  assert(pendingDuringCreate.some((item) => item.kind === 'food-update' && !item.serverId), 'Edit during in-flight create did not queue a dependent update');

  foodCreateRelease();
  await page.waitForFunction(() => window.RinloServerSync.pending().length === 0, null, { timeout: 10000 });
  await page.unroute('**/api/v1/food/logs');

  await app.locator('.rc-quick button').filter({ hasText: 'Вес' }).click();
  await app.locator('#rfWeight').fill('84.6');
  await app.getByRole('button', { name: 'Сохранить' }).click();

  await syncNow();
  await syncNow();

  state = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}'));
  dayKey = Object.keys(state.days || {}).sort().at(-1);
  day = state.days?.[dayKey];
  assert(state.profile?.weight === 85, 'Local profile missing before restore');
  assert(day?.water === 250, `Unexpected water before restore: ${day?.water}`);
  assert(day?.steps === 1000, `Unexpected steps before restore: ${day?.steps}`);
  food = (day?.events || []).find((event) => event.type === 'food');
  const weight = (day?.events || []).find((event) => event.type === 'weight');
  assert(food?.serverId && food?.clientEventId, 'Food did not receive server identity');
  assert(food?.text === 'омлет, кофе и йогурт' && food?.cal === 420 && food?.protein === 31, 'Local food edit changed while create was in flight');
  assert(weight?.serverId && weight?.clientEventId, 'Weight did not receive server identity');

  await app.evaluate((id) => window.delEvent(id), weight.id);
  await syncNow();

  // Simulate loss of the local application payload while keeping the current
  // guest session identity. Full localStorage.clear() cannot restore an anonymous
  // user because the session token itself is stored locally.
  await page.evaluate(() => {
    localStorage.removeItem('healthy-action-v07');
    localStorage.removeItem('rinlo-sync-outbox-v1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  app = await appFrame();
  await app.locator('#today').waitFor({ state: 'visible', timeout: 15000 });

  state = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}'));
  const restoredDayKey = Object.keys(state.days || {}).sort().at(-1);
  const restored = state.days?.[restoredDayKey];
  assert(state.profile?.weight === 85 && state.profile?.goal === 75, `Profile was not restored: ${JSON.stringify(state.profile)}`);
  assert(restored?.water === 250, `Water duplicated or missing after restore: ${restored?.water}`);
  assert(restored?.steps === 1000, `Steps duplicated or missing after restore: ${restored?.steps}`);
  assert(restored?.rinloCheckin?.wellbeing === 'okay', `Check-in was not restored: ${JSON.stringify(restored?.rinloCheckin)}`);
  const restoredFood = (restored?.events || []).find((event) => event.type === 'food');
  const restoredWeight = (restored?.events || []).find((event) => event.type === 'weight');
  assert(restoredFood?.text === 'омлет, кофе и йогурт', `Food edit did not survive server restore: ${JSON.stringify(restoredFood)}`);
  assert(restoredFood?.cal === 420 && restoredFood?.protein === 31, 'Edited food nutrition did not survive restore');
  assert(!restoredWeight, `Deleted weight returned from server: ${JSON.stringify(restoredWeight)}`);

  if (runtimeErrors.length) throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
  console.log('Rinlo server sync E2E passed');
} finally {
  await browser.close();
}
