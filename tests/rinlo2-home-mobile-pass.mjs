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
  const assertTouchHeight = async (selector, label) => {
    const box = await page.locator(selector).boundingBox();
    assert(box && box.height >= 43.5, `${label}_touch_target_too_small:${JSON.stringify(box)}`);
  };

  await page.goto(`${baseUrl}?reset=1&local=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#homeSuggestNow')?.dataset.zeroPromptReady !== undefined);
  await assertTouchHeight('#skipOnboarding', 'onboarding_skip');
  const strayBodyText = await page.evaluate(() => [...document.body.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .filter((text) => /^\s*\\\s*$/.test(text)));
  assert.equal(strayBodyText.length, 0, `stray_body_text_present:${JSON.stringify(strayBodyText)}`);

  await page.locator('#startSetup').click();
  await assertTouchHeight('#backWelcome', 'onboarding_back');
  await page.locator('#currentWeight').fill('80');
  await page.locator('#targetWeight').fill('72');
  await page.locator('#finishOnboarding').click();
  await page.locator('[data-screen="home"].active').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#homeSuggestNow')?.dataset.zeroPromptReady === 'false');
  await assertTouchHeight('.icon-button', 'profile_icon');

  assert.equal((await page.locator('.home-suggest-kicker').textContent())?.trim(), 'НАСТРОЙ ОДИН РАЗ');
  assert((await page.locator('#homeSuggestContext').textContent())?.includes('Выбери 2 продукта'), 'first_use_context_missing');
  assert((await page.locator('#homeSuggestReadiness').textContent())?.includes('Дальше'), 'first_use_readiness_missing');

  const firstBox = await page.locator('#homeSuggestNow').boundingBox();
  assert(firstBox && firstBox.x >= 0 && firstBox.x + firstBox.width <= 390, `first_use_cta_overflow:${JSON.stringify(firstBox)}`);

  await page.locator('#homeSuggestNow').click();
  await page.locator('[data-screen="profile"].active').waitFor({ state: 'visible' });
  await page.waitForTimeout(450);

  const setupLanding = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom } : null;
    };
    return {
      head: rect('.profile-staples-head'),
      chips: rect('.profile-staples'),
      save: rect('#saveDecisionProfile'),
      nav: rect('.bottom-nav'),
    };
  });
  assert(setupLanding.head && setupLanding.chips && setupLanding.save && setupLanding.nav,
    `home_setup_target_missing:${JSON.stringify(setupLanding)}`);
  assert(setupLanding.head.top >= 0 && setupLanding.save.bottom <= setupLanding.nav.top + 1,
    `home_setup_not_in_first_view:${JSON.stringify(setupLanding)}`);

  await page.locator('[data-profile-staple="eggs"]').click();
  await page.locator('[data-profile-staple="cheese"]').click();
  await page.locator('#saveDecisionProfile').click();
  await page.locator('[data-screen="home"].active').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#homeSuggestNow')?.dataset.zeroPromptReady === 'true');

  assert.equal((await page.locator('.home-suggest-kicker').textContent())?.trim(), 'ZERO-PROMPT');
  assert((await page.locator('#homeSuggestContext').textContent())?.includes('Яйца'), 'ready_context_missing');

  await page.locator('#homeSuggestNow').click();
  await page.locator('[data-cook-step="result"].active').waitFor({ state: 'visible' });
  await assertTouchHeight('[data-cook-step="result"] .flow-header button', 'cook_back');

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

  console.log(`RINLO2_HOME_SETUP=${JSON.stringify(setupLanding)}`);
  console.log(`RINLO2_HOME_MOBILE_PASS=${JSON.stringify(structure)}`);
  console.log('RINLO2_HOME_MOBILE_RESULT=PASS');
} finally {
  await browser.close();
}
