import { chromium } from 'playwright';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const within = (inner, outer, tolerance = 0.75) => (
  inner.x >= outer.x - tolerance
  && inner.y >= outer.y - tolerance
  && inner.x + inner.width <= outer.x + outer.width + tolerance
  && inner.y + inner.height <= outer.y + outer.height + tolerance
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:4173/pwa.html?ui-toggle-test=1', { waitUntil: 'domcontentloaded' });
  const app = page.frameLocator('#app');

  await app.locator('#rprWelcome .rpr-title').waitFor({ state: 'visible', timeout: 15000 });
  await app.locator('body').evaluate(() => window.rinloProductStart());
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();
  await app.getByRole('button', { name: 'Нормально', exact: true }).click();
  await app.getByRole('button', { name: '15 минут', exact: true }).click();
  await app.locator('#rprCreate').click();
  await app.locator('.rpr-magic').waitFor({ state: 'visible', timeout: 10000 });
  await app.locator('body').evaluate(() => window.rinloProductEnterApp());
  await app.locator('#today').waitFor({ state: 'visible' });

  await app.locator('.nav button').nth(3).click();
  await app.locator('#profile').waitFor({ state: 'visible' });
  await app.getByRole('button', { name: /Настроить под себя/ }).click();
  await app.getByRole('heading', { name: 'Настроить под себя', exact: true }).waitFor({ state: 'visible' });
  await app.locator('#rppCalories').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(220);

  const measure = async () => {
    const track = await app.locator('#rppCalories').boundingBox();
    const thumb = await app.locator('#rppCalories i').boundingBox();
    const card = await app.locator('.rpp-calories').boundingBox();
    assert(track && thumb && card, 'calorie_switch_geometry_missing');
    return { track, thumb, card };
  };

  const off = await measure();
  assert(within(off.thumb, off.track), `calorie_switch_thumb_overflow_off:${JSON.stringify(off)}`);
  assert(off.track.width >= 49 && off.track.width <= 51, `calorie_switch_track_width:${off.track.width}`);
  assert(off.track.height >= 29 && off.track.height <= 31, `calorie_switch_track_height:${off.track.height}`);
  assert(off.thumb.width >= 25 && off.thumb.width <= 27, `calorie_switch_thumb_width:${off.thumb.width}`);
  assert(off.card.x + off.card.width - (off.track.x + off.track.width) >= 12, `calorie_switch_right_inset:${JSON.stringify(off)}`);
  assert(off.thumb.x - off.track.x <= 3, `calorie_switch_off_not_left:${JSON.stringify(off)}`);
  assert(await app.locator('#rppCalories').getAttribute('aria-checked') === 'false', 'calorie_switch_aria_off');

  await app.locator('#rppCalories').click();
  await page.waitForTimeout(220);
  const on = await measure();
  assert(within(on.thumb, on.track), `calorie_switch_thumb_overflow_on:${JSON.stringify(on)}`);
  assert(on.thumb.x - on.track.x >= 19, `calorie_switch_on_not_right:${JSON.stringify(on)}`);
  assert(await app.locator('#rppCalories').getAttribute('aria-checked') === 'true', 'calorie_switch_aria_on');

  await app.locator('#rppCalories').click();
  await page.waitForTimeout(220);
  const offAgain = await measure();
  assert(within(offAgain.thumb, offAgain.track), `calorie_switch_thumb_overflow_off_again:${JSON.stringify(offAgain)}`);
  assert(offAgain.thumb.x - offAgain.track.x <= 3, `calorie_switch_off_again_not_left:${JSON.stringify(offAgain)}`);
  assert(await app.locator('#rppCalories').getAttribute('aria-checked') === 'false', 'calorie_switch_aria_off_again');

  console.log(`RINLO_UI_TOGGLE_GEOMETRY=${JSON.stringify({ off, on, offAgain })}`);
  console.log('RINLO_UI_TOGGLE_RESULT=PASS');
} finally {
  await browser.close();
}
