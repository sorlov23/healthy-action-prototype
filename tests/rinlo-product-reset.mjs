import { chromium } from 'playwright';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
const page = await context.newPage();

try {
  await page.goto('http://127.0.0.1:4173/pwa.html?product-reset-test=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app');
  const handle = await page.locator('#app').elementHandle();
  const app = await handle.contentFrame();
  if (!app) throw new Error('Rinlo iframe not available');

  await app.waitForFunction(() => window.__rinloProductReset === 'v1' && window.__rinloCopyPass === 'v1' && window.__rinloTodayV2 === 'v1', null, { timeout: 15000 });
  await app.locator('#rprWelcome .rpr-title').waitFor({ state: 'visible' });
  await app.evaluate(() => window.rinloProductStart());

  await app.locator('.rpr-goals').waitFor({ state: 'visible' });
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();

  await app.locator('.rpr-context-block').first().waitFor({ state: 'visible' });
  await app.getByRole('button', { name: 'Мало сил', exact: true }).click();
  await app.getByRole('button', { name: '5 минут', exact: true }).click();
  await app.locator('#rprCreate').click();

  await app.locator('.rpr-magic').waitFor({ state: 'visible', timeout: 10000 });
  const magicTitle = (await app.locator('.rpr-magic h2').textContent())?.trim();
  assert(magicTitle, 'Product Reset did not generate the first action');

  const state = await app.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    const day = db.days?.[key] || {};
    const action = (day.rinloActions || []).find((item) => ['suggested', 'accepted'].includes(item.status)) || null;
    return { profile: db.profile || null, day, action };
  });
  assert(state.profile?.primaryGoal === 'weight_loss', `Primary goal changed: ${JSON.stringify(state.profile)}`);
  assert(state.profile?.detailsComplete === false, 'Product Reset unexpectedly requires detailed profile fields');
  assert(state.day?.rinloCheckin?.wellbeing === 'poor', `Energy context was not converted to check-in: ${JSON.stringify(state.day?.rinloCheckin)}`);
  assert(Number(state.day?.rinloTimeBudgetMinutes) === 5, 'Time budget was not persisted locally');
  assert(state.action, 'First action missing from local state');
  assert(Number(state.action.effortMinutes || 0) <= 5, `First action ignored the 5-minute budget: ${JSON.stringify(state.action)}`);

  await app.evaluate(() => window.rinloProductEnterApp());
  await app.locator('#today.rtv2').waitFor({ state: 'visible' });
  await app.getByRole('heading', { name: magicTitle, exact: true }).waitFor();
  await app.getByRole('button', { name: 'Почему этот шаг?', exact: true }).waitFor();
  await app.getByText('Сегодня:', { exact: false }).waitFor();
  await app.getByRole('heading', { name: 'Добавить', exact: true }).waitFor();

  const hierarchy = await app.evaluate(() => {
    const today = document.getElementById('today');
    const action = document.getElementById('rcAction');
    const checkin = document.getElementById('rcCheckin');
    const metrics = document.getElementById('rcMetrics');
    const quick = today?.querySelector('.rc-quick');
    const precision = today?.querySelector('.rpr-precision');
    return {
      actionBeforeCheckin: Boolean(today && action && checkin && (action.compareDocumentPosition(checkin) & Node.DOCUMENT_POSITION_FOLLOWING)),
      quickBeforeMetrics: Boolean(today && quick && metrics && (quick.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING)),
      metricsDisplay: metrics?.style.display || '',
      precisionHidden: !precision || getComputedStyle(precision).display === 'none',
    };
  });
  assert(hierarchy.actionBeforeCheckin, 'Today hierarchy did not put the chosen action first after onboarding check-in');
  assert(hierarchy.quickBeforeMetrics, 'Today v2 did not put quick add actions before detailed metrics');
  assert(hierarchy.metricsDisplay === 'none', 'Numeric metrics are still primary before optional profile details');
  assert(hierarchy.precisionHidden, 'Today v2 still exposes the recurring precision-profile prompt');

  console.log(`RINLO_PRODUCT_RESET_ACTION=${JSON.stringify({ title: magicTitle, effortMinutes: state.action.effortMinutes, kind: state.action.kind })}`);
  console.log('RINLO_PRODUCT_RESET_RESULT=PASS');
} finally {
  await browser.close();
}