import { chromium } from 'playwright';

const baseUrl = process.env.RINLO_E2E_URL || 'http://127.0.0.1:4173/pwa.html';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.stack || error.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`); });

async function appFrame() {
  await page.waitForSelector('#app');
  const handle = await page.locator('#app').elementHandle();
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('Rinlo iframe not available');
  await frame.waitForFunction(() => (
    window.__rinloCoreUiV1 === true
    && window.__rinloFunctionalMvp === 'v1'
    && window.__rinloStability === 'v1'
    && window.__rinloSettingsBridge === 'v1'
    && window.__rinloEveningReview === 'v1'
    && window.__rinloProductReset === 'v1'
  ), null, { timeout: 10000 });
  await frame.waitForFunction(() => document.getElementById('profile')?.dataset.rinloProfile === 'v01', null, { timeout: 10000 });
  return frame;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function finishProductReset(app) {
  await app.getByRole('heading', { name: /Не идеальный план/ }).waitFor({ state: 'visible' });
  await app.getByRole('button', { name: 'Показать мой первый шаг →', exact: true }).click();
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();
  await app.getByRole('button', { name: 'Нормально', exact: true }).click();
  await app.getByRole('button', { name: '15 минут', exact: true }).click();
  await app.locator('#rprCreate').click();
  await app.locator('.rpr-magic').waitFor({ state: 'visible', timeout: 10000 });
  await app.getByRole('button', { name: 'Оставить этот шаг', exact: true }).click();
  await app.locator('#today').waitFor({ state: 'visible' });
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  let app = await appFrame();
  await finishProductReset(app);

  const firstRun = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    const day = db.days?.[key] || {};
    return {
      profile: db.profile || null,
      checkin: day.rinloCheckin || null,
      action: (day.rinloActions || []).find((item) => ['suggested', 'accepted'].includes(item.status)) || null,
    };
  });
  assert(firstRun.profile?.primaryGoal === 'weight_loss', 'Product Reset did not persist the primary goal');
  assert(firstRun.profile?.detailsComplete === false, 'Detailed profile unexpectedly became mandatory');
  assert(firstRun.checkin?.wellbeing === 'okay', 'Product Reset did not persist today context');
  assert(firstRun.action?.title, 'Product Reset did not create the first action');

  await app.locator('.rc-quick button').filter({ hasText: '+250 мл' }).click();
  const water = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    return db.days?.[key]?.water || 0;
  });
  assert(water >= 250, 'Water quick action did not persist');

  await app.locator('.rc-quick button').filter({ hasText: 'Еда' }).click();
  await app.locator('#rfFoodText').fill('омлет из двух яиц и кофе');
  await app.getByRole('button', { name: 'Получить оценку' }).click();
  await app.locator('#rfFoodCal').fill('310');
  await app.locator('#rfFoodProtein').fill('20');
  await app.getByRole('button', { name: 'Добавить в дневник' }).click();
  await app.locator('#rcTimeline').getByText('омлет из двух яиц и кофе').waitFor();

  // Evening Review is a standalone Plan flow. Verify it before the older,
  // optional action-row regression so one scenario cannot leave transient UI
  // state that affects the other.
  await app.locator('.nav button').nth(1).click();
  await app.locator('#actions').waitFor({ state: 'visible' });
  const finishDay = app.getByRole('button', { name: 'Подвести спокойный итог дня', exact: true });
  await finishDay.waitFor({ state: 'visible' });
  await finishDay.click();
  await app.getByRole('heading', { name: 'Итог дня' }).waitFor();
  await app.getByRole('button', { name: 'В самый раз', exact: true }).click();
  await app.getByRole('button', { name: 'Да', exact: true }).click();
  await app.getByRole('button', { name: 'Сохранить итог', exact: true }).click();
  const eveningReview = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    return { review: db.days?.[key]?.rinloEveningReview || null, closed: db.days?.[key]?.closed === true };
  });
  assert(eveningReview.closed, 'Evening review did not close the local day');
  assert(eveningReview.review?.planFit === 'right', 'Evening review plan fit was not saved');
  assert(eveningReview.review?.actionUseful === 'yes', 'Evening review usefulness was not saved');

  // Keep the older optional Plan-row regression independently covered.
  await app.locator('.nav button').nth(0).click();
  await app.locator('#today').waitFor({ state: 'visible' });
  await app.locator('.nav button').nth(1).click();
  await app.locator('#actions').waitFor({ state: 'visible' });
  const proteinRow = app.locator('#actionsList .item').filter({ hasText: 'Белковый приём пищи' }).first();
  if (await proteinRow.isVisible().catch(() => false)) {
    let clicked = false;
    try {
      await proteinRow.click({ timeout: 1500 });
      clicked = true;
    } catch (error) {
      if (await proteinRow.isVisible().catch(() => false)) throw error;
    }
    if (clicked) {
      await app.getByRole('heading', { name: 'Добавить приём пищи' }).waitFor();
      await app.evaluate(() => window.closeSheet?.());
    }
  }

  await app.locator('.nav button').nth(3).click();
  await app.locator('#profile').waitFor({ state: 'visible' });
  await app.getByText('Rinlo уже работает без анкеты', { exact: true }).waitFor({ state: 'visible' });
  await app.getByRole('button', { name: /Изменить параметры/ }).waitFor({ state: 'visible' });

  await page.reload({ waitUntil: 'domcontentloaded' });
  app = await appFrame();

  const persisted = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const days = Object.values(db.days || {});
    return {
      profile: Boolean(db.profile),
      goal: db.profile?.primaryGoal || null,
      water: days.some((day) => Number(day?.water || 0) >= 250),
      food: days.some((day) => (day?.events || []).some((event) => event.type === 'food' && event.text === 'омлет из двух яиц и кофе')),
      eveningReview: days.some((day) => day?.rinloEveningReview?.planFit === 'right' && day?.rinloEveningReview?.actionUseful === 'yes'),
    };
  });
  assert(persisted.profile && persisted.goal === 'weight_loss' && persisted.water && persisted.food && persisted.eveningReview, 'Saved Rinlo state did not survive reload');

  await app.locator('.nav').waitFor({ state: 'visible' });
  await app.locator('.nav button').nth(0).click();
  await app.locator('#today').waitFor({ state: 'visible' });
  await app.locator('#rcTimeline').getByText('омлет из двух яиц и кофе').waitFor();

  // Detailed parameters are progressive profiling: they are opened only when
  // the user explicitly asks to make recommendations more precise.
  await app.locator('.nav button').nth(3).click();
  await app.locator('#profile').waitFor({ state: 'visible' });
  const editProfile = app.getByRole('button', { name: /Изменить параметры/ });
  await editProfile.waitFor({ state: 'visible' });
  await editProfile.click();
  await app.locator('#onboarding').waitFor({ state: 'visible' });
  await app.locator('#rcOnStep').filter({ hasText: '1 из 4' }).waitFor({ state: 'visible' });
  await app.getByRole('heading', { name: 'Что сейчас хочется улучшить?' }).waitFor();

  if (runtimeErrors.length) throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
  console.log('Rinlo functional MVP smoke test passed');
} finally {
  await browser.close();
}
