import { chromium } from 'playwright';

const baseUrl = process.env.RINLO_E2E_URL || 'http://127.0.0.1:4173/pwa.html';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`); });

async function appFrame() {
  await page.waitForSelector('#app');
  const handle = await page.locator('#app').elementHandle();
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('Rinlo iframe not available');
  await frame.waitForFunction(() => window.__rinloFunctionalMvp === 'v1', null, { timeout: 10000 });
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
  if (await proteinRow.count()) {
    await proteinRow.click();
    await app.getByRole('heading', { name: 'Добавить приём пищи' }).waitFor();
    await app.evaluate(() => window.closeSheet?.());
  }

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
    };
  });
  assert(persisted.profile && persisted.water && persisted.food, 'Saved Rinlo state did not survive reload');

  // Whatever tab the browser restores, the saved profile must keep navigation usable.
  await app.locator('.nav').waitFor({ state: 'visible' });
  await app.locator('.nav button').nth(0).click();
  await app.locator('#today').waitFor({ state: 'visible' });
  await app.locator('#rcTimeline').getByText('омлет из двух яиц и кофе').waitFor();

  // Profile editing still opens the goal-first onboarding from step one.
  await app.locator('.nav button').nth(3).click();
  await app.getByRole('button', { name: /Изменить параметры/ }).click();
  await app.getByRole('heading', { name: 'Что сейчас хочется улучшить?' }).waitFor();

  if (runtimeErrors.length) throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
  console.log('Rinlo functional MVP smoke test passed');
} finally {
  await browser.close();
}
