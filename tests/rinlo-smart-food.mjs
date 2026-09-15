import { chromium } from 'playwright';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  localStorage.setItem('healthy-action-v07', JSON.stringify({
    profile: {
      weight:85, goal:75, height:176, age:37, activity:'low', sex:'male', habits:[],
      primaryGoal:'weight_loss', secondaryGoals:[], calorieTrackingEnabled:true,
      detailsComplete:false, productResetVersion:'v1'
    },
    days: { [key]: { events:[], water:0, steps:0, habits:{}, closed:false } }
  }));
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

try {
  await page.goto('http://127.0.0.1:4173/pwa.html?smart-food-test=1', { waitUntil:'domcontentloaded' });
  const app = page.frameLocator('#app');
  await app.locator('#today').waitFor({ state:'visible', timeout:15000 });
  await app.locator('body').evaluate(() => new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (
        window.__rinloSmartFood === 'v1'
        && window.RinloSmartFood?.version === 'v1'
        && window.__rinloSmartFoodEvents === 'v1'
        && window.__rinloProductUi === 'v3'
      ) return resolve();
      if (Date.now() - started > 10000) return reject(new Error('smart_food_not_ready'));
      setTimeout(tick, 50);
    };
    tick();
  }));

  const catalogRealms = await page.evaluate(() => ({
    outer: Array.isArray(window.HEALTHY_FOOD_CATALOG) ? window.HEALTHY_FOOD_CATALOG.length : -1,
    iframe: Array.isArray(document.getElementById('app')?.contentWindow?.HEALTHY_FOOD_CATALOG)
      ? document.getElementById('app').contentWindow.HEALTHY_FOOD_CATALOG.length
      : -1,
  }));
  assert(catalogRealms.outer > 0, `outer catalog missing: ${JSON.stringify(catalogRealms)}`);
  assert(catalogRealms.iframe === catalogRealms.outer, `catalog bridge mismatch: ${JSON.stringify(catalogRealms)}`);

  const directSuggestions = await app.locator('body').evaluate(() =>
    window.RinloSmartFood.suggestions('кури').map(item => item.name)
  );
  assert(directSuggestions.some(name => name.toLowerCase().includes('кур')), `catalog API did not suggest chicken: ${JSON.stringify(directSuggestions)}`);

  await app.getByTestId('quick-food').click();
  await app.getByRole('heading', { name:'Добавить еду', exact:true }).waitFor({ state:'visible' });
  await app.getByRole('button', { name:/Фото/ }).waitFor();
  await app.getByRole('button', { name:/Написать/ }).waitFor();
  await app.getByRole('button', { name:/Недавнее/ }).waitFor();

  const input = app.locator('#rsfText');
  await input.fill('кури');
  await app.locator('.rsf-suggestion').first().waitFor({ state:'visible', timeout:5000 });
  assert((await app.locator('.rsf-suggestion').first().innerText()).toLowerCase().includes('кур'), 'catalog suggestion missing from DOM');

  await input.fill('куриная грудка, рис и огурец');
  await app.getByRole('button', { name:'Распознать описание', exact:true }).click();
  await app.getByRole('heading', { name:'Вот что получилось', exact:true }).waitFor();
  const chips = await app.locator('.rsf-chip').allInnerTexts();
  assert(chips.some(v => v.includes('Куриная грудка')), `chicken not parsed: ${JSON.stringify(chips)}`);
  assert(chips.some(v => v.includes('Рис белый')), `rice not parsed: ${JSON.stringify(chips)}`);
  assert(chips.some(v => v.includes('Огурец')), `cucumber not parsed: ${JSON.stringify(chips)}`);

  const mediumCal = Number(await app.locator('#rfFoodCal').inputValue());
  const mediumProtein = Number(await app.locator('#rfFoodProtein').inputValue());
  assert(mediumCal > 450 && mediumCal < 560, `unexpected medium calories: ${mediumCal}`);
  assert(mediumProtein > 45 && mediumProtein < 60, `unexpected medium protein: ${mediumProtein}`);
  await app.getByRole('button', { name:'Большая', exact:true }).click();
  const largeCal = Number(await app.locator('#rfFoodCal').inputValue());
  assert(largeCal > mediumCal, `large portion did not increase calories: ${mediumCal} -> ${largeCal}`);

  await app.getByRole('button', { name:'Сохранить', exact:true }).click();
  await app.getByTestId('today-timeline').getByText('куриная грудка, рис и огурец').waitFor({ state:'visible' });
  const saved = await app.locator('body').evaluate(() => {
    const db = JSON.parse(localStorage.getItem('healthy-action-v07') || '{}');
    const key = Object.keys(db.days || {}).sort().at(-1);
    return (db.days?.[key]?.events || []).find(event => event.type === 'food');
  });
  assert(saved?.text === 'куриная грудка, рис и огурец', `food not saved: ${JSON.stringify(saved)}`);
  assert(Number(saved?.cal || 0) === largeCal, 'confirmed calories not preserved');

  await app.getByTestId('quick-food').click();
  await app.getByRole('button', { name:/Недавнее/ }).click();
  await app.getByRole('button', { name:/куриная грудка, рис и огурец/ }).waitFor({ state:'visible' });
  await app.getByRole('button', { name:/куриная грудка, рис и огурец/ }).click();
  await app.getByRole('heading', { name:'Вот что получилось', exact:true }).waitFor();
  assert(Number(await app.locator('#rfFoodCal').inputValue()) === largeCal, 'recent calories changed');
  await app.getByRole('button', { name:'← Назад', exact:true }).click();

  await app.getByRole('button', { name:/Фото/ }).click();
  const photo = app.locator('#rsfPhotoInput');
  assert(await photo.getAttribute('accept') === 'image/*', 'photo input does not accept images');
  assert(await photo.getAttribute('capture') === 'environment', 'camera capture hint missing');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  await photo.setInputFiles({ name:'meal.png', mimeType:'image/png', buffer:png });
  await app.locator('#rsfPhotoPreview img').waitFor({ state:'visible' });
  assert(await app.getByText(/Фото остаётся на устройстве и никуда не отправляется/).count() >= 1, 'photo privacy explanation missing');

  if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
  console.log(`RINLO_SMART_FOOD_SAVED=${JSON.stringify(saved)}`);
  console.log('RINLO_SMART_FOOD_RESULT=PASS');
} finally {
  await browser.close();
}
