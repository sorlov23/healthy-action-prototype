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
    && window.__rinloEveningReview === 'v1'
    && window.__rinloProductReset === 'v1'
    && window.__rinloProductPrecision === 'v1'
    && window.__rinloSmartFood === 'v1'
    && window.__rinloCopyPass === 'v1'
    && window.__rinloProductUi === 'v3'
  ), null, { timeout: 15000 });
  await page.waitForFunction(() => (
    window.RinloServerSync
    && window.RinloEveningReview?.version === 'v1'
    && window.HealthyActionAPI?.enabled === true
  ), null, { timeout: 15000 });
  return frame;
}

async function go(app, id) {
  await app.locator(`[data-rinlo-nav="${id}"]`).click();
  await app.locator(`#${id}`).waitFor({ state: 'visible' });
}

async function finishProductReset(app) {
  await app.locator('#rprWelcome .rpr-title').waitFor({ state: 'visible' });
  await app.evaluate(() => window.rinloProductStart());
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();
  await app.getByRole('button', { name: 'Нормально', exact: true }).click();
  await app.getByRole('button', { name: '15 минут', exact: true }).click();
  await app.locator('#rprCreate').click();
  await app.locator('.rpr-magic').waitFor({ state: 'visible', timeout: 10000 });
  await app.evaluate(() => window.rinloProductEnterApp());
  await app.locator('#today').waitFor({ state: 'visible' });
  await app.getByTestId('today-primary-action').waitFor({ state: 'visible' });
}

async function completeDetailedProfile(app) {
  await go(app, 'profile');
  await app.getByRole('button', { name: /Настроить под себя/ }).click();
  await app.getByRole('heading', { name: 'Настроить под себя', exact: true }).waitFor({ state: 'visible' });
  await app.locator('#rppWeight').fill('85');
  await app.locator('#rppGoal').fill('75');
  await app.locator('#rppHeight').fill('176');
  await app.locator('#rppAge').fill('37');
  await app.locator('#rppActivity').selectOption('low');
  await app.locator('#rppSex').selectOption('male');
  await app.locator('.rpp-save').click();
  const profile = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}').profile || null);
  assert(profile?.detailsComplete === true, 'Progressive profile did not become complete');
  assert(profile?.primaryGoal === 'weight_loss', 'Progressive profile overwrote Product Reset goal');
  assert(profile?.weight === 85 && profile?.goal === 75 && profile?.height === 176 && profile?.age === 37, 'Progressive profile values missing');
  await go(app, 'today');
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
  await finishProductReset(app);

  const minimalProfile = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}').profile || null);
  assert(minimalProfile?.primaryGoal === 'weight_loss' && minimalProfile?.detailsComplete === false, 'Product Reset did not create the minimal local profile');

  await completeDetailedProfile(app);

  const checkinAfterProfile = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    return db.days?.[key]?.rinloCheckin || null;
  });
  assert(checkinAfterProfile?.wellbeing === 'okay', `Product Reset check-in changed after profile completion: ${JSON.stringify(checkinAfterProfile)}`);
  await app.getByTestId('today-checkin').getByText('Сегодня:', { exact: true }).waitFor({ state: 'visible' });
  await app.getByTestId('today-primary-action').waitFor({ state: 'visible' });

  await app.getByTestId('quick-water').click();
  await app.getByTestId('quick-steps').click();

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

  await app.getByTestId('quick-food').click();
  await app.getByRole('heading', { name: 'Добавить еду', exact: true }).waitFor({ state: 'visible' });
  await app.locator('#rsfText').fill('омлет из двух яиц и кофе');
  await app.getByRole('button', { name: 'Распознать описание', exact: true }).click();
  await app.getByRole('heading', { name: 'Вот что получилось', exact: true }).waitFor();
  await app.locator('#rfFoodCal').fill('310');
  await app.locator('#rfFoodProtein').fill('20');
  await app.getByRole('button', { name: 'Сохранить', exact: true }).click();

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

  await app.getByTestId('quick-weight').click();
  await app.locator('#rfWeight').fill('84.6');
  await app.getByRole('button', { name: 'Сохранить' }).click();

  await go(app, 'actions');
  await app.getByRole('button', { name: 'Подвести итог дня', exact: true }).click();
  await app.getByRole('heading', { name: 'Итог дня', exact: true }).waitFor();
  await app.getByRole('button', { name: 'В самый раз', exact: true }).click();
  await app.getByRole('button', { name: 'Да', exact: true }).click();
  await app.getByRole('button', { name: 'Готово', exact: true }).click();

  await syncNow();
  await syncNow();

  state = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}'));
  dayKey = Object.keys(state.days || {}).sort().at(-1);
  day = state.days?.[dayKey];
  assert(state.profile?.weight === 85, 'Local detailed profile missing before restore');
  assert(day?.water === 250, `Unexpected water before restore: ${day?.water}`);
  assert(day?.steps === 1000, `Unexpected steps before restore: ${day?.steps}`);
  assert(day?.rinloEveningReview?.planFit === 'right', `Evening review plan fit missing before restore: ${JSON.stringify(day?.rinloEveningReview)}`);
  assert(day?.rinloEveningReview?.actionUseful === 'yes', 'Evening review usefulness missing before restore');
  assert(day?.closed === true, 'Day was not closed by evening review');
  food = (day?.events || []).find((event) => event.type === 'food');
  const weight = (day?.events || []).find((event) => event.type === 'weight');
  assert(food?.serverId && food?.clientEventId, 'Smart Food did not receive server identity through durable outbox');
  assert(food?.text === 'омлет, кофе и йогурт' && food?.cal === 420 && food?.protein === 31, 'Local food edit changed while create was in flight');
  assert(weight?.serverId && weight?.clientEventId, 'Weight did not receive server identity');

  await app.evaluate((id) => window.delEvent(id), weight.id);
  await syncNow();

  await page.evaluate(() => {
    localStorage.removeItem('healthy-action-v07');
    localStorage.removeItem('rinlo-sync-outbox-v1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  app = await appFrame();
  await app.locator('#today').waitFor({ state: 'visible', timeout: 15000 });
  await app.waitForFunction(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    return Object.values(db.days || {}).some((value) =>
      value?.rinloEveningReview?.planFit === 'right'
      && value?.rinloEveningReview?.actionUseful === 'yes'
    );
  }, null, { timeout: 15000 });

  state = await app.evaluate(() => JSON.parse(localStorage.getItem('healthy-action-v07') || '{}'));
  const restoredDayKey = Object.keys(state.days || {}).sort().at(-1);
  const restored = state.days?.[restoredDayKey];
  assert(state.profile?.weight === 85 && state.profile?.goal === 75, `Profile was not restored: ${JSON.stringify(state.profile)}`);
  assert(restored?.water === 250, `Water duplicated or missing after restore: ${restored?.water}`);
  assert(restored?.steps === 1000, `Steps duplicated or missing after restore: ${restored?.steps}`);
  assert(restored?.rinloCheckin?.wellbeing === 'okay', `Check-in was not restored: ${JSON.stringify(restored?.rinloCheckin)}`);
  assert(restored?.rinloEveningReview?.planFit === 'right', `Evening review did not restore: ${JSON.stringify(restored?.rinloEveningReview)}`);
  assert(restored?.rinloEveningReview?.actionUseful === 'yes', 'Restored evening review usefulness changed');
  assert(restored?.closed === true, 'Restored evening review did not keep day closed');
  const restoredFood = (restored?.events || []).find((event) => event.type === 'food');
  const restoredWeight = (restored?.events || []).find((event) => event.type === 'weight');
  assert(restoredFood?.text === 'омлет, кофе и йогурт', `Smart Food edit did not survive server restore: ${JSON.stringify(restoredFood)}`);
  assert(restoredFood?.cal === 420 && restoredFood?.protein === 31, 'Edited Smart Food nutrition did not survive restore');
  assert(!restoredWeight, `Deleted weight returned from server: ${JSON.stringify(restoredWeight)}`);

  if (runtimeErrors.length) throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
  console.log('Rinlo product UI server sync E2E passed');
} finally {
  await browser.close();
}
