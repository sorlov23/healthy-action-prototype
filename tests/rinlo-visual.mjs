import { chromium } from 'playwright';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

async function assertScreen(app, id) {
  await app.locator(`#${id}`).waitFor({ state:'visible' });
  const geometry = await app.locator('body').evaluate((_body, screenId) => {
    const screen = document.getElementById(screenId);
    const active = [...document.querySelectorAll('.screen.on')].map((el) => el.id);
    const root = document.documentElement;
    const body = document.body;
    const rect = screen?.getBoundingClientRect();
    const nav = document.getElementById('nav')?.getBoundingClientRect();
    return {
      active,
      viewportWidth: root.clientWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      screen: rect ? { x:rect.x, width:rect.width, right:rect.right } : null,
      nav: nav ? { x:nav.x, width:nav.width, height:nav.height, bottom:nav.bottom } : null,
    };
  }, id);
  assert(geometry.active.length === 1 && geometry.active[0] === id, `multiple_or_wrong_active_screen:${JSON.stringify(geometry)}`);
  assert(geometry.documentWidth <= geometry.viewportWidth + 1, `horizontal_overflow_${id}:${JSON.stringify(geometry)}`);
  assert(geometry.screen && geometry.screen.x >= -1 && geometry.screen.right <= geometry.viewportWidth + 1, `screen_outside_viewport_${id}:${JSON.stringify(geometry)}`);
  assert(geometry.nav && geometry.nav.height >= 64 && geometry.nav.width <= geometry.viewportWidth - 16, `nav_geometry_${id}:${JSON.stringify(geometry)}`);
  return geometry;
}

try {
  await page.goto('http://127.0.0.1:4173/pwa.html?visual-test=1', { waitUntil:'domcontentloaded' });
  const app = page.frameLocator('#app');
  await app.locator('#rprWelcome .rpr-title').waitFor({ state:'visible', timeout:15000 });

  const onboarding = await app.locator('body').evaluate(() => {
    const stage = document.querySelector('.rpr-stage')?.getBoundingClientRect();
    const cta = document.querySelector('.rpr-primary')?.getBoundingClientRect();
    return { width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, stage:stage && {left:stage.left,right:stage.right}, cta:cta && {height:cta.height,left:cta.left,right:cta.right,bottom:cta.bottom} };
  });
  assert(onboarding.scrollWidth <= onboarding.width + 1, `onboarding_horizontal_overflow:${JSON.stringify(onboarding)}`);
  assert(onboarding.cta?.height >= 48, `onboarding_cta_too_small:${JSON.stringify(onboarding)}`);

  await app.locator('body').evaluate(() => window.rinloProductStart());
  await app.locator('[data-primary-goal="weight_loss"]').click();
  await app.locator('#rprNext').click();
  await app.getByRole('button', { name:'Нормально', exact:true }).click();
  await app.getByRole('button', { name:'15 минут', exact:true }).click();
  await app.locator('#rprCreate').click();
  await app.locator('.rpr-magic').waitFor({ state:'visible', timeout:10000 });
  await app.locator('body').evaluate(() => window.rinloProductEnterApp());
  await app.locator('body').evaluate(() => new Promise((resolve,reject) => {
    const started=Date.now();
    const tick=()=>{ if(window.__rinloProductUi==='v2') return resolve(); if(Date.now()-started>10000) return reject(new Error('product_ui_not_ready')); setTimeout(tick,50); };
    tick();
  }));

  const todayGeometry = await assertScreen(app,'today');
  const today = await app.locator('body').evaluate(() => {
    const action = document.querySelector('[data-testid="today-primary-action"]')?.getBoundingClientRect();
    const checkin = document.querySelector('[data-testid="today-checkin"]')?.getBoundingClientRect();
    const quick = document.querySelector('[data-testid="quick-actions"]')?.getBoundingClientRect();
    const quickButtons = [...document.querySelectorAll('[data-testid="quick-actions"] button')].map((el) => {
      const r = el.getBoundingClientRect();
      return { width:r.width,height:r.height,left:r.left,right:r.right };
    });
    const navButtons = [...document.querySelectorAll('#nav button')].map((el) => {
      const r = el.getBoundingClientRect();
      return { width:r.width,height:r.height };
    });
    const h1 = getComputedStyle(document.querySelector('.r2-greeting h1'));
    const actionTitle = getComputedStyle(document.querySelector('.r2-action h2'));
    return {
      action: action && {top:action.top,bottom:action.bottom,width:action.width},
      checkin: checkin && {top:checkin.top,bottom:checkin.bottom,width:checkin.width},
      quick: quick && {top:quick.top,bottom:quick.bottom,width:quick.width},
      quickButtons,
      navButtons,
      greetingFont:parseFloat(h1.fontSize),
      actionFont:parseFloat(actionTitle.fontSize),
    };
  });
  assert(today.action && today.checkin && today.quick, `today_core_blocks_missing:${JSON.stringify(today)}`);
  assert(today.action.top < today.checkin.top && today.checkin.bottom < today.quick.top, `today_hierarchy_wrong:${JSON.stringify(today)}`);
  assert(today.quickButtons.length === 4 && today.quickButtons.every((b) => b.height >= 80 && b.width >= 70), `quick_action_geometry:${JSON.stringify(today.quickButtons)}`);
  assert(today.quickButtons.every((b) => b.left >= 0 && b.right <= 390), `quick_actions_outside_viewport:${JSON.stringify(today.quickButtons)}`);
  assert(today.navButtons.length === 4 && today.navButtons.every((b) => b.height >= 54 && b.width >= 70), `nav_tap_targets:${JSON.stringify(today.navButtons)}`);
  assert(today.greetingFont >= 32 && today.actionFont >= 22, `weak_typography_hierarchy:${JSON.stringify(today)}`);

  for (const id of ['actions','progress','profile']) {
    await app.locator(`[data-rinlo-nav="${id}"]`).click();
    await assertScreen(app,id);
    const heading = app.locator(`#${id} h1`).first();
    await heading.waitFor({state:'visible'});
    const box = await heading.boundingBox();
    assert(box && box.width > 120 && box.height >= 24, `heading_geometry_${id}:${JSON.stringify(box)}`);
  }

  await app.locator('[data-rinlo-nav="today"]').click();
  await assertScreen(app,'today');
  await app.getByTestId('quick-food').click();
  await app.getByRole('heading',{name:'Добавить еду',exact:true}).waitFor({state:'visible'});
  const sheet = await app.locator('body').evaluate(() => {
    const overlay=document.getElementById('overlay')?.getBoundingClientRect();
    const panel=document.querySelector('.sheet')?.getBoundingClientRect();
    const modes=[...document.querySelectorAll('.rsf-mode')].map((el)=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right};});
    return { viewport:{width:document.documentElement.clientWidth,height:document.documentElement.clientHeight}, overlay:overlay&&{width:overlay.width,height:overlay.height}, panel:panel&&{left:panel.left,right:panel.right,top:panel.top,bottom:panel.bottom,width:panel.width,height:panel.height}, modes };
  });
  assert(sheet.panel && sheet.panel.left >= -1 && sheet.panel.right <= sheet.viewport.width + 1, `sheet_outside_viewport:${JSON.stringify(sheet)}`);
  assert(sheet.panel.height <= sheet.viewport.height * .9, `sheet_too_tall:${JSON.stringify(sheet)}`);
  assert(sheet.modes.length === 3 && sheet.modes.every((m)=>m.width >= 95 && m.height >= 80 && m.left >= 0 && m.right <= sheet.viewport.width), `smart_food_mode_geometry:${JSON.stringify(sheet.modes)}`);

  if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
  console.log(`RINLO_VISUAL_GEOMETRY=${JSON.stringify({ onboarding, todayGeometry, today, sheet })}`);
  console.log('RINLO_VISUAL_RESULT=PASS');
} finally {
  await browser.close();
}
