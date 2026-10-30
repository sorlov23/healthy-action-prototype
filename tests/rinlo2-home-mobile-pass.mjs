import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.RINLO2_BASE_URL || 'http://127.0.0.1:4173/rinlo2/';
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}?reset=1&local=1`, { waitUntil: 'networkidle' });
  await page.locator('#startSetup').click();
  await page.locator('#currentWeight').fill('80');
  await page.locator('#targetWeight').fill('72');
  await page.locator('#finishOnboarding').click();
  await page.locator('[data-screen="home"].active').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#homeSuggestNow')?.dataset.zeroPromptReady === 'false');

  assert.equal((await page.locator('.home-suggest-kicker').textContent())?.trim(), 'НАСТРОЙ ОДИН РАЗ');
  assert((await page.locator('#homeSuggestContext').textContent())?.includes('Сначала выбери'), 'first_use_context_missing');
  assert((await page.locator('#homeSuggestReadiness').textContent())?.includes('Дальше'), 'first_use_readiness_missing');

  const firstBox = await page.locator('#homeSuggestNow').boundingBox();
  assert(firstBox && firstBox.x >= 0 && firstBox.x + firstBox.width <= 390, `first_use_cta_overflow:${JSON.stringify(firstBox)}`);

  await page.evaluate(() => {
    const key = 'rinlo2-foundation-state-v1';
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    state.staples = ['eggs', 'cheese'];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#homeSuggestNow')?.dataset.zeroPromptReady === 'true');

  assert.equal((await page.locator('.home-suggest-kicker').textContent())?.trim(), 'ZERO-PROMPT');
  assert((await page.locator('#homeSuggestContext').textContent())?.includes('Яйца'), 'ready_context_missing');

  await page.locator('#homeSuggestNow').click();
  await page.locator('[data-cook-step="result"].active').waitFor({ state: 'visible' });

  const structure = await page.evaluate(() => ({
    kicker: Boolean(document.querySelector('#homeSuggestNow .home-suggest-kicker')),
    title: document.querySelector('#homeSuggestNow .home-suggest-main b')?.textContent || '',
    context: Boolean(document.getElementById('homeSuggestContext')),
    readiness: Boolean(document.getElementById('homeSuggestReadiness')),
    status: Boolean(document.getElementById('homeSuggestStatus')),
    width: document.querySelector('#homeSuggestNow')?.getBoundingClientRect().width || 0,
  }));

  assert(structure.kicker && structure.context && structure.readiness && structure.status,
    `home_cta_structure_destroyed:${JSON.stringify(structure)}`);
  assert.equal(structure.title, 'Предложи мне');
  assert(structure.width <= 358.5, `home_cta_width_wrong:${JSON.stringify(structure)}`);

  await page.locator('[data-cook-step="result"] [data-cook-back]').click();
  await page.locator('[data-cook-step="ingredients"] [data-cook-back]').click();
  await page.locator('#cookFlow').waitFor({ state: 'hidden' });
  assert.equal((await page.locator('.home-suggest-main b').textContent())?.trim(), 'Предложи мне');

  console.log(`RINLO2_HOME_MOBILE_PASS=${JSON.stringify(structure)}`);
  console.log('RINLO2_HOME_MOBILE_RESULT=PASS');
} finally {
  await browser.close();
}
