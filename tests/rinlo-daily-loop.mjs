import { chromium } from 'playwright';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
const page = await context.newPage();

const localKey = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

try {
  await page.goto('http://127.0.0.1:4173/pwa.html?daily-loop-test=1', { waitUntil:'domcontentloaded' });
  const app = page.frameLocator('#app');
  await app.locator('#rprWelcome .rpr-title').waitFor({ state:'visible', timeout:15000 });

  await app.locator('body').evaluate(() => window.rinloProductStart());
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();
  await app.getByRole('button', { name:'Нормально', exact:true }).click();
  await app.getByRole('button', { name:'15 минут', exact:true }).click();
  await app.locator('#rprCreate').click();
  await app.locator('.rpr-magic').waitFor({ state:'visible', timeout:10000 });
  await app.locator('body').evaluate(() => window.rinloProductEnterApp());

  await app.locator('body').evaluate(() => new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.__rinloProductUi === 'v3' && window.__rinloDailyLoop === 'v1') return resolve();
      if (Date.now() - started > 10000) return reject(new Error('daily_loop_not_ready'));
      setTimeout(tick, 50);
    };
    tick();
  }));

  const today = localKey(0);
  const yesterday = localKey(-1);
  await app.locator('body').evaluate(({ today, yesterday }) => {
    const key = 'healthy-action-v07';
    const db = JSON.parse(localStorage.getItem(key) || '{}');
    db.days ||= {};
    db.days[yesterday] = {
      events: [], water: 0, steps: 0, habits: {}, closed: true,
      rinloActions: [{
        id: 'daily-loop-yesterday-action',
        kind: 'movement',
        status: 'completed',
        title: 'Пройдитесь 10 минут',
        rationale: 'Небольшой прогулки достаточно.',
        effortMinutes: 10,
        feedback: { useful: true, at: new Date().toISOString() },
      }],
      rinloEveningReview: {
        day: yesterday,
        planFit: 'too_much',
        actionUseful: 'yes',
        mainActionKind: 'movement',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    db.days[today] = {
      events: [], water: 0, steps: 0, habits: {}, closed: false,
      rinloCheckin: { day: today, wellbeing: 'okay', updatedAt: new Date().toISOString() },
      rinloActions: [{
        id: 'daily-loop-today-action',
        day: today,
        kind: 'movement',
        status: 'suggested',
        source: 'local-rules',
        title: 'Пройдитесь 10 минут',
        rationale: 'Сегодня движения пока немного. Небольшой прогулки достаточно.',
        effortMinutes: 10,
        context: { signal: 'steps_low' },
      }],
    };
    localStorage.setItem(key, JSON.stringify(db));
    window.__haViewDay = today;
    window.rinloProductGo?.('today');
  }, { today, yesterday });

  await page.evaluate(async (day) => { await window.RinloAdaptiveLearning?.adaptCurrentAction(day); }, today);
  await page.evaluate(() => window.RinloDailyLoop?.refresh());
  await page.waitForTimeout(80);
  await app.getByTestId('today-primary-action').waitFor({ state:'visible', timeout:10000 });

  const adapted = await app.locator('body').evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const day = db.days?.[window.__haViewDay] || {};
    const action = (day.rinloActions || []).find((item) => ['suggested','accepted'].includes(item.status));
    return {
      title: action?.title || '',
      effortMinutes: action?.effortMinutes ?? null,
      adaptation: action?.context?.adaptation || null,
      note: document.querySelector('#today [data-rinlo-daily-loop="adaptation"]')?.textContent || '',
    };
  });

  assert(adapted.effortMinutes === 5, `next_day_effort_not_reduced:${JSON.stringify(adapted)}`);
  assert(adapted.title.includes('5'), `next_day_title_not_adapted:${JSON.stringify(adapted)}`);
  assert(adapted.adaptation?.reviewDay === yesterday, `previous_review_not_linked:${JSON.stringify(adapted)}`);
  assert(adapted.adaptation?.effortReduced === true, `effort_adaptation_missing:${JSON.stringify(adapted)}`);
  assert(adapted.note.includes('Учли вчера') && adapted.note.includes('короче'), `visible_adaptation_missing:${JSON.stringify(adapted)}`);

  await app.locator('[data-rinlo-nav="actions"]').click();
  const planNote = await app.locator('#actions [data-rinlo-daily-loop="adaptation"]').textContent();
  assert(planNote.includes('Учли вчера'), `plan_adaptation_missing:${planNote}`);

  await app.locator('[data-rinlo-nav="today"]').click();
  await app.getByTestId('complete-action').click();
  await app.getByRole('button', { name:'Да', exact:true }).click();
  await app.locator('[data-rinlo-nav="actions"]').click();
  await app.getByRole('button', { name:'Подвести итог дня', exact:true }).click();
  await app.getByRole('button', { name:'Слишком много', exact:true }).click();
  await app.getByRole('button', { name:'Сохранить итог', exact:true }).click();
  await app.locator('[data-rinlo-nav="today"]').click();

  const promise = await app.getByTestId('daily-loop-next-day').textContent();
  assert(promise.includes('Завтра начнём с более короткого шага'), `next_day_promise_missing:${promise}`);

  const stored = await app.locator('body').evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    return db.days?.[window.__haViewDay]?.rinloEveningReview || null;
  });
  assert(stored?.planFit === 'too_much' && stored?.actionUseful === 'yes', `evening_review_not_saved:${JSON.stringify(stored)}`);

  console.log(`RINLO_DAILY_LOOP=${JSON.stringify({ adapted, promise, stored })}`);
  console.log('RINLO_DAILY_LOOP_RESULT=PASS');
} finally {
  await browser.close();
}
