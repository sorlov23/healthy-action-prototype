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
  ), null, { timeout: 10000 });
  await frame.waitForFunction(() => document.getElementById('profile')?.dataset.rinloProfile === 'v01', null, { timeout: 10000 });
  await frame.locator('[data-primary-goal="weight_loss"]').waitFor({ state: 'attached', timeout: 10000 });
  return frame;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  const hasProfile = await app.evaluate(() => Boolean(JSON.parse(localStorage.getItem('healthy-action-v07') || '{}').profile));
  assert(hasProfile, 'Onboarding did not persist profile');

  await app.getByRole('button', { name: 'Нормально' }).click();
  await app.locator('.rc-action').waitFor({ state: 'visible' });
  assert((await app.locator('.rc-action h2').textContent())?.trim(), 'Rinlo action was not generated');

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

  await app.locator('.nav button').nth(1).click();
  await app.locator('#actions').waitFor({ state: 'visible' });
  const proteinRow = app.locator('#actionsList .item').filter({ hasText: 'Белковый приём пищи' }).first();
  if (await proteinRow.isVisible().catch(() => false)) {
    let clicked = false;
    try {
      // Plan can legitimately rerender while recommendations refresh. If this
      // optional row disappears during that rerender, treat it like the already
      // supported "row absent" case rather than waiting on a detached node.
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

  // The optional Plan row may trigger a legitimate rerender. Re-enter Plan
  // through navigation so the evening-review click always targets the current,
  // visible canonical screen rather than a hidden pre-rerender instance.
  await app.locator('.nav').waitFor({ state: 'visible' });
  await app.locator('.nav button').nth(0).click();
  await app.locator('#today').waitFor({ state: 'visible' });
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

  await app.locator('.nav button').nth(3).click();
  await app.locator('#profile').waitFor({ state: 'visible' });
  await app.getByRole('button', { name: /Изменить параметры/ }).waitFor({ state: 'visible' });

  // Persistence is checked independently of which tab the browser restores after reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  app = await appFrame();

  const persisted = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const days = Object.values(db.days || {});
    return {
      profile: Boolean(db.profile),
      water: days.some((day) => Number(day?.water || 0) >= 250),
      food: days.some((day) => (day?.events || []).some((event) => event.type === 'food' && event.text === 'омлет из двух яиц и кофе')),
      eveningReview: days.some((day) => day?.rinloEveningReview?.planFit === 'right' && day?.rinloEveningReview?.actionUseful === 'yes'),
    };
  });
  assert(persisted.profile && persisted.water && persisted.food && persisted.eveningReview, 'Saved Rinlo state did not survive reload');

  // Whatever tab the browser restores, the saved profile must keep navigation usable.
  await app.locator('.nav').waitFor({ state: 'visible' });
  await app.locator('.nav button').nth(0).click();
  await app.locator('#today').waitFor({ state: 'visible' });
  await app.locator('#rcTimeline').getByText('омлет из двух яиц и кофе').waitFor();

  // Profile editing must open the goal-first onboarding from step one. Assert
  // the user-visible step contract rather than a skin-specific CSS prefix.
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