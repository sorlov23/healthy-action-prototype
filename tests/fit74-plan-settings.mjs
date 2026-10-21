import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(fileURLToPath(new URL('../fit74/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://local').pathname;if(path==='/')path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.writeHead(403).end();return}res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.FIT74_CHROMIUM_PATH?{executablePath:process.env.FIT74_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,timezoneId:'Europe/Moscow'}),page=await context.newPage();
const user={id:'00000000-0000-4000-8000-000000000074',email:'fixture@example.invalid'};
let preferences={user_id:user.id,start_date:'2026-10-15',end_date:'2027-01-31',shift_anchor_date:'2026-10-19',reminder_enabled:false};
let entries=[{user_id:user.id,entry_date:'2026-10-19',workout:true,nutrition:2,movement:true,water:true}];
const sessions=[{user_id:user.id,session_date:'2026-10-19',workout_code:'A',started_at:'2026-10-19T10:00:00Z',progress:{program_version:'7.0',content_revision:'cards-2026-10',step:6,sets:{a_squat:[1,2]},doneSimple:{},timerRemaining:{},short:false},completed_at:'2026-10-19T11:00:00Z'}];
const sessionSnapshot=structuredClone(sessions),queries=[],preferenceWrites=[],dailyWrites=[],errors=[],failedAssets=[];
let rejectSave=false;
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&!r.ok())failedAssets.push(r.url())});
await context.route('https://*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),method=req.method(),table=url.pathname.split('/').pop();let result=[];
 if(method==='GET')queries.push(url.toString());
 if(table==='fit74_preferences'){
  if(method==='POST'){
   if(rejectSave){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Тест: сервер недоступен'})});return}
   const body=req.postDataJSON();preferenceWrites.push(body);preferences={...preferences,...body};
  }
  result=[preferences];
 }else if(table==='fit74_daily_entries'){
  if(method==='POST'){const body=req.postDataJSON();dailyWrites.push(body);await new Promise(resolve=>setTimeout(resolve,100));entries=entries.filter(e=>e.entry_date!==body.entry_date);entries.push(body);result=[body]}else result=entries;
 }else if(table==='fit74_workout_sessions')result=sessions;
 else if(table==='fit74_shift_overrides')result=[];
 if(method==='GET'){
  result=result.filter(row=>[...url.searchParams].every(([key,value])=>value.startsWith('gte.')?row[key]>=value.slice(4):value.startsWith('lte.')?row[key]<=value.slice(4):value.startsWith('eq.')?row[key]===value.slice(3):true));
  const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||result.length);result=result.slice(offset,offset+limit);
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
});
await context.addInitScript(user=>{
 const NativeDate=Date,fixed=NativeDate.parse('2026-10-21T00:15:00+03:00');window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}};
 localStorage.setItem('fit74_session',JSON.stringify({user,access_token:'fixture-only',expires_at:4102444800}));localStorage.setItem('fit74_test_sentinel','keep');
},user);
const settings=async()=>{await page.locator('.bottom-nav [data-screen="settings"]').click();await page.locator('#planStartInput').waitFor({state:'visible'})};
const savePeriod=async(start,end,total)=>{
 await settings();await page.locator('#planStartInput').fill(start);await page.locator('#planEndInput').fill(end);await page.locator('#savePlanPeriodBtn').click();
 await page.waitForFunction(total=>window.Fit74PlanPeriod.current.total===total,total);await page.waitForFunction(()=>!document.querySelector('#savePlanPeriodBtn').disabled);
};
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.Fit74PlanPeriod?.loaded&&window.Fit74ProgramV7);
 assert.equal(await page.locator('#challengeCount').textContent(),'7 из 109','stored dates must be loaded before the first data query');
 assert(queries.some(q=>q.includes('entry_date=gte.2026-10-15')&&q.includes('entry_date=lte.2027-01-31')));
 assert(!queries.some(q=>/session_date=lte.2026-12-31|entry_date=lte.2026-12-31/.test(q)),'no default-range startup race');
 await settings();assert.equal(await page.locator('#planStartInput').inputValue(),'15.10.2026');assert.equal(await page.locator('#planEndInput').inputValue(),'31.01.2027');
 const anchorBefore=await page.locator('#shiftAnchorTitle').textContent();
 await page.locator('#planEndInput').fill('14.10.2026');await page.locator('#savePlanPeriodBtn').click();assert.match(await page.locator('#planDateError').textContent(),/раньше/);assert.equal(preferenceWrites.length,0);
 await page.locator('#planEndInput').fill('31.02.2027');await page.locator('#savePlanPeriodBtn').click();assert.match(await page.locator('#planDateError').textContent(),/существующие/);assert.equal(preferenceWrites.length,0);
 await page.locator('#planStartInput').fill('22.10.2026');await page.locator('#planEndInput').fill('01.11.2026');
 await page.locator('[data-plan-picker="end"]').click();await page.locator('[data-plan-date="2026-11-05"]').click();assert.equal(await page.locator('#planEndInput').inputValue(),'05.11.2026');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('[data-plan-picker="start"]').click();await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('#habit1Input').fill('Несохранённая привычка');
 await page.locator('#savePlanPeriodBtn').click();await page.waitForFunction(()=>window.Fit74PlanPeriod.current.total===15);await page.waitForFunction(()=>!document.querySelector('#savePlanPeriodBtn').disabled);
 assert.equal(await page.locator('#habit1Input').inputValue(),'Несохранённая привычка','saving dates does not discard other draft settings');
 assert.equal(preferences.start_date,'2026-10-22');assert.equal(preferences.end_date,'2026-11-05');assert.equal(preferenceWrites[0].shift_anchor_date,undefined);
 assert.equal(await page.locator('#shiftAnchorTitle').textContent(),anchorBefore);assert.equal(await page.locator('#shiftExceptionStart').getAttribute('min'),'2026-10-22');assert.equal(await page.locator('#shiftExceptionEnd').getAttribute('max'),'2026-11-05');
 assert.equal(await page.locator('#challengeCount').textContent(),'0 из 15');assert.match(await page.locator('#prestartBanner').textContent(),/22 октября/);
 await page.locator('.bottom-nav [data-screen="today"]').click();assert.equal(await page.locator('[data-field="water"]').isDisabled(),true,'future daily entries cannot be marked');
 await page.locator('.bottom-nav [data-screen="workouts"]').click();assert.equal(await page.locator('[data-shift-date="2026-10-22"]').getAttribute('data-shift-code'),'A');
 assert.equal(await page.evaluate(()=>window.Fit74ShiftSchedule.slotFor('2026-11-01').code),'GLUTES');assert.deepEqual(sessions,sessionSnapshot);assert.equal(entries.length,1,'shrinking the period deletes no entries');
 await savePeriod('19.10.2026','31.01.2027',105);
 assert.equal(await page.locator('#challengeCount').textContent(),'3 из 105');assert.equal(await page.locator('#completedStat').textContent(),'1/105','past progress returns when the period is expanded');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.Fit74PlanPeriod.loaded);assert.equal(await page.locator('#challengeCount').textContent(),'3 из 105');
 await page.locator('.bottom-nav [data-screen="history"]').click();assert.equal(await page.locator('#calendarTitle').textContent(),'105 дней');assert.equal(await page.locator('#calendarGrid button').count(),84);await page.locator('#calendarNext').click();assert.equal(await page.locator('#calendarGrid button').count(),21);
 await page.locator('.bottom-nav [data-screen="today"]').click();await page.locator('[data-field="water"]').click();
 await savePeriod('22.10.2026','22.10.2026',1);
 assert(dailyWrites.some(row=>row.entry_date==='2026-10-21'&&row.water),'an in-flight save keeps its original date');assert(!dailyWrites.some(row=>row.entry_date==='2026-10-22'));
 assert(entries.some(row=>row.entry_date==='2026-10-21'&&row.water));
 await savePeriod('19.10.2026','19.10.2026',1);
 await page.locator('.bottom-nav [data-screen="history"]').click();assert.equal(await page.locator('#calendarGrid button').count(),1);assert.equal(await page.locator('#milestoneNumber').textContent(),'1 день');assert.equal(await page.locator('#completedStat').textContent(),'1/1');assert.equal(await page.locator('#daysLeft').textContent(),'0');
 rejectSave=true;await settings();await page.locator('#planEndInput').fill('20.10.2026');await page.locator('#savePlanPeriodBtn').click();await page.waitForFunction(()=>document.querySelector('#planDateError').textContent.includes('Не удалось сохранить'));
 assert.equal(preferences.end_date,'2026-10-19');assert.equal(await page.locator('#challengeCount').textContent(),'1 из 1','failed save cannot apply unsaved dates');assert.equal(await page.locator('#planEndInput').inputValue(),'20.10.2026');
 rejectSave=false;await savePeriod('19.10.2026','31.01.2027',105);
 await page.locator('#saveSettingsBtn').click();await page.waitForFunction(()=>!document.querySelector('#saveSettingsBtn').disabled);assert.equal(preferences.end_date,'2027-01-31','general settings cannot reset the period');
 await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-plan-picker="end"]').click();assert.equal(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right>innerWidth),false);await page.keyboard.press('Escape');
 assert.deepEqual(sessions,sessionSnapshot);assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_test_sentinel')),'keep');assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
 console.log(JSON.stringify({ok:true,storedDatesAtStartup:true,calendarPicker:true,invalidRangeRejected:true,reloadPersistence:true,singleDayAndYearBoundary:true,pendingSavePreserved:true,historyAndApproachesPreserved:true,shiftAnchorPreserved:true,failedSaveKeepsDraft:true,phone320:true},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
