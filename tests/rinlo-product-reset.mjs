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

  await app.waitForFunction(() => window.__rinloProductReset === 'v1' && window.__rinloCopyPass === 'v1' && window.__rinloTodayV3 === 'v3', null, { timeout: 15000 });
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
  await app.locator('#today.rinlo-today-v3').waitFor({ state: 'visible' });
  await app.getByRole('heading', { name: magicTitle, exact: true }).waitFor();
  await app.locator('.r3-hero').waitFor({ state: 'visible' });
  await app.getByText('Сегодня:', { exact: false }).waitFor();
  await app.locator('.r3-quick').waitFor({ state: 'visible' });
  await app.locator('.r3-targets').waitFor({ state: 'visible' });

  const hierarchy = await app.evaluate(() => {
    const today = document.getElementById('today');
    const hero = today?.querySelector('.r3-hero');
    const checkin = today?.querySelector('.r3-checkin');
    const quick = today?.querySelector('.r3-quick');
    const targets = today?.querySelector('.r3-targets');
    const compat = today?.querySelector('.r3-compat');
    return {
      visualVersion: window.__rinloTodayV3,
      dataVersion: today?.dataset.rinloToday || '',
      heroBeforeCheckin: Boolean(hero && checkin && (hero.compareDocumentPosition(checkin) & Node.DOCUMENT_POSITION_FOLLOWING)),
      checkinBeforeQuick: Boolean(checkin && quick && (checkin.compareDocumentPosition(quick) & Node.DOCUMENT_POSITION_FOLLOWING)),
      quickBeforeTargets: Boolean(quick && targets && (quick.compareDocumentPosition(targets) & Node.DOCUMENT_POSITION_FOLLOWING)),
      compatHidden: !compat || getComputedStyle(compat).display === 'none',
    };
  });
  assert(hierarchy.visualVersion === 'v3' && hierarchy.dataVersion === 'v3', `Today v3 visual contract missing: ${JSON.stringify(hierarchy)}`);
  assert(hierarchy.heroBeforeCheckin, 'Today v3 did not put the primary hero first');
  assert(hierarchy.checkinBeforeQuick, 'Today v3 did not keep compact check-in after the hero');
  assert(hierarchy.quickBeforeTargets, 'Today v3 did not put quick add before targets');
  assert(hierarchy.compatHidden, 'Legacy compatibility DOM leaked into the visible Today UI');

  console.log(`RINLO_PRODUCT_RESET_ACTION=${JSON.stringify({ title: magicTitle, effortMinutes: state.action.effortMinutes, kind: state.action.kind })}`);
  console.log('RINLO_PRODUCT_RESET_RESULT=PASS');
} finally {
  await browser.close();
}