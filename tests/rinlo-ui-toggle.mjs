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

  await app.locator('[data-primary-goal="weight_loss"]').waitFor({ state: 'visible', timeout: 15000 });
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rcOnNext').click();
  await app.locator('#rcCalToggle').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(250);

  const measure = async () => {
    const track = await app.locator('#rcCalToggle').boundingBox();
    const thumb = await app.locator('#rcCalToggle i').boundingBox();
    const card = await app.locator('.rc-calorie-toggle').boundingBox();
    assert(track && thumb && card, 'calorie_switch_geometry_missing');
    return { track, thumb, card };
  };

  const on = await measure();
  assert(within(on.thumb, on.track), `calorie_switch_thumb_overflow_on:${JSON.stringify(on)}`);
  assert(on.track.width >= 49 && on.track.width <= 51, `calorie_switch_track_width:${on.track.width}`);
  assert(on.track.height >= 29 && on.track.height <= 31, `calorie_switch_track_height:${on.track.height}`);
  assert(on.thumb.width >= 25 && on.thumb.width <= 27, `calorie_switch_thumb_width:${on.thumb.width}`);
  assert(on.card.x + on.card.width - (on.track.x + on.track.width) >= 13, `calorie_switch_right_inset:${JSON.stringify(on)}`);
  assert(on.thumb.x - on.track.x >= 21, `calorie_switch_on_not_right:${JSON.stringify(on)}`);
  assert(await app.locator('#rcCalToggle').getAttribute('aria-checked') === 'true', 'calorie_switch_aria_on');

  await app.locator('#rcCalToggle').click();
  await page.waitForTimeout(250);
  const off = await measure();
  assert(within(off.thumb, off.track), `calorie_switch_thumb_overflow_off:${JSON.stringify(off)}`);
  assert(off.thumb.x - off.track.x <= 3, `calorie_switch_off_not_left:${JSON.stringify(off)}`);
  assert(await app.locator('#rcCalToggle').getAttribute('aria-checked') === 'false', 'calorie_switch_aria_off');

  await app.locator('#rcCalToggle').click();
  await page.waitForTimeout(250);
  const onAgain = await measure();
  assert(within(onAgain.thumb, onAgain.track), `calorie_switch_thumb_overflow_on_again:${JSON.stringify(onAgain)}`);
  assert(onAgain.thumb.x - onAgain.track.x >= 21, `calorie_switch_on_again_not_right:${JSON.stringify(onAgain)}`);
  assert(await app.locator('#rcCalToggle').getAttribute('aria-checked') === 'true', 'calorie_switch_aria_on_again');

  console.log(`RINLO_UI_TOGGLE_GEOMETRY=${JSON.stringify({ on, off, onAgain })}`);
  console.log('RINLO_UI_TOGGLE_RESULT=PASS');
} finally {
  await browser.close();
}
