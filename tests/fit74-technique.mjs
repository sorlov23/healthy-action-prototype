import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, resolve, extname} from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = fileURLToPath(new URL('../fit74/', import.meta.url));
const qaDir = process.env.FIT74_QA_DIR;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/') path = '/index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root)) {res.writeHead(403);res.end();return;}
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});
    res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.FIT74_TEST_URL || `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({headless:true, ...(process.env.FIT74_CHROMIUM_PATH ? {executablePath:process.env.FIT74_CHROMIUM_PATH} : {}), args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
const page = await context.newPage();
const errors = [], failedAssets = [], writes = [];
const fixtureUser = {id:'00000000-0000-4000-8000-000000000074',email:'fit74-test@example.invalid'};
let savedSessions = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => {if (r.url().includes('/assets/') && !r.ok()) failedAssets.push(`${r.status()} ${r.url()}`);});

// All account traffic is intercepted. No live account or database is changed.
await context.route('https://*.supabase.co/**', async route => {
  const req = route.request(), url = req.url(), method = req.method();
  let result = [];
  if (url.includes('fit74_workout_sessions')) {
    if (method === 'POST') {
      const body = req.postDataJSON();
      writes.push(structuredClone(body));
      const i = savedSessions.findIndex(s=>s.workout_code===body.workout_code&&s.session_date===body.session_date);
      if (i < 0) savedSessions.push(body); else savedSessions[i] = {...savedSessions[i],...body};
      result = [body];
    } else if (method === 'DELETE') {
      const code = new URL(url).searchParams.get('workout_code')?.replace('eq.','');
      savedSessions = savedSessions.filter(s=>s.workout_code!==code);
    } else result = savedSessions;
  } else if (url.includes('fit74_preferences')) {
    result = [{user_id:fixtureUser.id,reminder_enabled:false}];
  } else if (method === 'POST' || method === 'PATCH') {
    result = [req.postDataJSON()];
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
});
await context.addInitScript(user => {
  localStorage.setItem('fit74_session', JSON.stringify({user,access_token:'local-fixture-token',expires_at:4102444800}));
  localStorage.setItem('fit74_test_sentinel', 'keep-existing-data');
}, fixtureUser);

async function screen(name) {
  if (!qaDir) return;
  await mkdir(qaDir,{recursive:true});
  await page.screenshot({path:join(qaDir,name+'.png')});
}
async function start(code) {
  await page.evaluate(code => window.Fit74ProgramV7.start(code,false,'2026-10-19'),code);
  await page.locator('#workoutPlayer.open').waitFor();
}
async function currentScene(slug) {
  assert.equal(await page.locator('#playerBody [data-technique-scene]').count(),1,`exactly one technique image for ${slug}`);
  assert.equal(await page.locator('#playerBody [data-technique-scene]').getAttribute('data-technique-scene'),slug);
  assert.equal(await page.locator('#playerBody [data-fit74-direct-technique]').count(),0,'no old duplicate diagram');
}

try {
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.Fit74ProgramV7&&window.Fit74TechniqueImages);
  // The redesign retains all daily controls and exposes only the card-based programs.
  assert.equal(await page.locator('.check-row').count(),7);
  await page.locator('.bottom-nav [data-screen="workouts"]').click();
  await page.locator('[data-v7-start="B"]').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('#weekPlanStrip [data-shift-code]').evaluateAll(els=>els.map(el=>el.dataset.shiftCode)),['A','REST','REST','B','GLUTES','REST','REST','LIGHT']);
  assert.deepEqual(await page.locator('#workoutHub [data-v7-start]').evaluateAll(els=>els.map(el=>el.dataset.v7Start)),['B','GLUTES','CARDIO','LIGHT']);
  await page.locator('.bottom-nav [data-screen="history"]').click();
  assert(await page.locator('#historyScreen').isVisible());
  await page.locator('[data-goto="trends"]').first().click();
  assert(await page.locator('#trendsScreen').isVisible());
  await page.locator('.bottom-nav [data-screen="settings"]').click();
  assert(await page.locator('#shiftSettingsCard').isVisible());
  await page.locator('.bottom-nav [data-screen="today"]').click();
  await page.locator('[data-field="movement"]').click();
  assert.equal(await page.locator('[data-field="movement"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#dailyScore').textContent(),'1/10');
  await page.locator('[data-field="movement"]').click();
  assert.equal(await page.locator('#dailyScore').textContent(),'0/10');
  const programs = await page.evaluate(()=>window.Fit74ProgramV7.programs);
  assert.deepEqual(programs.GLUTES.exercises.map(x=>x.asset),['weighted-glute-bridge','romanian-deadlift','reverse-lunge-glute','frog-pump','fire-hydrant','side-abduction']);
  assert.deepEqual(programs.GLUTES.exercises.map(x=>x.reps),['12–15','10–12','8–10 / нога','18–25','12 / сторона','15 / сторона']);
  assert.equal(programs.GLUTES.exercises[0].sets,4);
  let stepsChecked = 0;
  for (const code of ['A','B','CARDIO','LIGHT','GLUTES']) {
    await start(code);
    const w=programs[code];
    const steps=[...w.warmup.map(x=>x[3]),...(w.preTimer?[w.preTimer.asset]:[]),...w.exercises.map(x=>x.asset),...w.cooldown.map(x=>x[3])];
    for(let i=0;i<steps.length;i++) {
      await currentScene(steps[i]);
      const bounds=await page.locator('#playerBody .technique-images').boundingBox();
      assert(bounds.x>=0&&bounds.x+bounds.width<=391,'technique fits a phone');
      stepsChecked++;
      if (i<steps.length-1) await page.locator('#playerNext').click();
    }
  }

  // Opening a larger image must not record an approach or change progress.
  await start('A');
  for(let i=0;i<6;i++)await page.locator('#playerNext').click();
  await page.locator('[data-v7-set="1"]').click();
  assert(await page.locator('[data-v7-set="1"]').evaluate(el=>el.classList.contains('done')));
  await page.locator('[data-v7-set="1"]').click();
  assert(!(await page.locator('[data-v7-set="1"]').evaluate(el=>el.classList.contains('done'))),'approach can be undone');
  // Leaving immediately flushes the pending approach save.
  await page.locator('[data-v7-set="1"]').click();
  page.once('dialog', d=>d.accept());
  await page.locator('#closeWorkoutPlayer').click();
  await start('A');
  assert.equal(await page.locator('[data-v7-set="1"]').getAttribute('aria-pressed'),'true','quick exit keeps the latest approach');
  await page.locator('[data-v7-set="1"]').click();
  await page.locator('[data-technique-zoom]').click();
  assert(await page.locator('dialog[open]').isVisible());
  assert.equal(await page.locator('dialog[open] .technique-pose').count(),2);
  await screen('phone-squat-enlarged');
  await page.locator('[data-technique-close]').click();
  assert.equal(await page.locator('dialog[open]').count(),0);
  await currentScene('chair-goblet-squat');
  await screen('phone-squat');
  await page.locator('[data-technique-zoom]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(),0,'Escape closes enlargement');

  // Resume an existing v7 session at frog-pump after the card-based reorder.
  savedSessions=[{user_id:fixtureUser.id,session_date:'2026-10-19',workout_code:'GLUTES',started_at:new Date().toISOString(),progress:{program_version:'7.0',step:5,sets:{g_frog:[1],g_donkey:[1,2]},doneSimple:{warm_0:true},timerRemaining:{},short:false}}];
  await start('GLUTES');
  await currentScene('frog-pump');
  assert(await page.locator('[data-v7-set="1"]').evaluate(el=>el.classList.contains('done')),'existing frog-pump set kept');
  await page.waitForFunction(()=>document.querySelector('#playerKicker').textContent.includes('8 из'));
  await screen('phone-frog-pump');
  await page.locator('[data-technique-zoom]').click();
  await screen('phone-frog-pump-enlarged');
  await page.locator('[data-technique-close]').click();
  await page.locator('#playerPrev').click();
  await page.locator('#playerPrev').click();
  await currentScene('romanian-deadlift');
  assert.equal(await page.locator('[data-v7-set].done').count(),0,'old donkey kicks are not credited as deadlifts');
  assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_test_sentinel')),'keep-existing-data');
  await page.waitForFunction(()=>document.querySelector('#playerKicker').textContent.includes('6 из'));
  await new Promise(resolve=>setTimeout(resolve,500));
  const migration = writes.findLast(x=>x.workout_code==='GLUTES');
  assert(migration.progress.sets.g_frog.includes(1),'saved prior set preserved');
  assert.deepEqual(migration.progress.sets.g_donkey,[1,2],'historical data preserved');
  assert.equal(migration.progress.content_revision,'cards-2026-10');

  await page.setViewportSize({width:320,height:740});
  await screen('phone-small-rdl');
  const overflow=await page.evaluate(()=>document.querySelector('#playerBody').scrollWidth>document.querySelector('#playerBody').clientWidth);
  assert.equal(overflow,false,'no horizontal overflow at 320px');

  if(qaDir) {
    await page.setViewportSize({width:1200,height:1100});
    const slugs = await page.evaluate(()=>Object.keys(window.Fit74TechniqueImages.scenes));
    for(let batch=0;batch<Math.ceil(slugs.length/6);batch++) {
      await page.evaluate(slugs=>{
        document.body.className='';
        document.body.innerHTML='<main id="techniqueGallery" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:16px"></main>';
        document.querySelector('#techniqueGallery').innerHTML=slugs.map(slug=>'<div><h3 style="font:15px Arial;margin:4px">'+slug+'</h3>'+window.Fit74TechniqueImages.html(slug,slug)+'</div>').join('');
      },slugs.slice(batch*6,batch*6+6));
      await page.waitForLoadState('networkidle');
      await screen('gallery-'+(batch+1));
    }
  }
  assert.deepEqual(failedAssets,[],'all illustration assets load');
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log(JSON.stringify({ok:true,stepsChecked,programsChecked:5,enlargement:true,undo:true,legacyProgressPreserved:true,phoneWidths:[320,390],failedAssets,errors},null,2));
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
