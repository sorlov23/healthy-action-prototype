import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(fileURLToPath(new URL('../fit74/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{let path=new URL(req.url,'http://fixture').pathname;const legacy=path==='/legacy.html';if(path==='/'||legacy)path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.writeHead(403).end();return}
  let data=await readFile(file);if(legacy)data=Buffer.from(data.toString().replace(/<div id="boot"[\s\S]*?<\/script>/,'<div id="boot" class="boot">Fit74</div>'));
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(data);
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.FIT74_CHROMIUM_PATH?{executablePath:process.env.FIT74_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const user={id:'00000000-0000-4000-8000-000000000074',email:'startup-fixture@example.invalid'};
const session={user,access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:4102444800};
const draftKey='fit74:'+user.id+':2026-11-03';
const completed=[];
async function scenario(name,options,run){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,timezoneId:'Europe/Moscow'}),page=await context.newPage();
 const state={...options,refreshes:0,requests:0,writes:[],release:null};
 const saved=options.guest?null:{...session,...(options.expired?{expires_at:1}:{})};
 await context.addInitScript(({saved,draftKey})=>{
  if(localStorage.getItem('fixture_initialized'))return;
  localStorage.setItem('fixture_initialized','1');if(saved)localStorage.setItem('fit74_session',JSON.stringify(saved));
  localStorage.setItem('startup_sentinel','keep');localStorage.setItem(draftKey,JSON.stringify({dirty:true,data:{movement:true,water:true},at:1}));
 },{saved,draftKey});
 await page.clock.install({time:new Date('2026-11-03T09:00:00+03:00')});
 await context.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());state.requests++;
  const reply=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.includes('/auth/v1/token')){
   state.refreshes++;
   if(state.hangRefresh){await new Promise(resolve=>{state.release=resolve});return route.abort().catch(()=>{})}
   if(state.refreshDown)return reply(503,{message:'fixture unavailable'});
   if(state.invalidRefresh)return reply(400,{error_code:'refresh_token_not_found',message:'Invalid Refresh Token'});
   await new Promise(resolve=>setTimeout(resolve,50));return reply(200,{...session,access_token:'fixture-renewed',refresh_token:'fixture-renewed-refresh'});
  }
  if(req.method()!=='GET'){state.writes.push(req.postDataJSON());return reply(200,[req.postDataJSON()])}
  if(state.rejectOldAccess&&req.headers().authorization==='Bearer fixture-access')return reply(401,{message:'JWT expired'});
  if(state.prefsDown&&url.pathname.includes('fit74_preferences')||state.entriesDown&&url.pathname.includes('fit74_daily_entries'))return reply(503,{message:'fixture paused'});
  if(url.pathname.includes('fit74_preferences'))return reply(200,[{user_id:user.id,start_date:'2026-11-01',end_date:'2026-12-31',reminder_enabled:false}]);
  return reply(200,[]);
 });
 if(options.blockMain)await context.route('**/v3.js?*',route=>route.abort());
 try{await page.goto(base+(options.legacy?'/legacy.html':'/'));await run(page,state,saved);assert.equal(await page.evaluate(()=>localStorage.getItem('startup_sentinel')),'keep');assert(await page.evaluate(key=>!!localStorage.getItem(key),draftKey));assert.equal(state.writes.length,0,'startup never writes over saved history');completed.push(name)}
 finally{state.release?.();await context.close()}
}
const loaded=page=>page.locator('#appView:not(.hidden)').waitFor({state:'visible'});
const failure=async page=>{await page.getByRole('link',{name:'Повторить загрузку'}).waitFor({state:'visible'});assert.equal(await page.locator('#appView').isVisible(),false)};
try{
 await scenario('guest entry', {guest:true},async page=>{await page.locator('#authView:not(.hidden)').waitFor({state:'visible'});assert.equal(await page.locator('#boot').count(),0)});
 await scenario('paused database and successful retry', {prefsDown:true},async(page,state,saved)=>{
  await failure(page);assert.match(await page.locator('#bootStatus').textContent(),/временно недоступен/);assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_session')),JSON.stringify(saved));
  state.prefsDown=false;await page.getByRole('link',{name:'Повторить загрузку'}).click();await loaded(page);assert.match(page.url(),/index\.html\?fit74v=14$/);assert.equal(await page.locator('#challengeCount').textContent(),'3 из 61');assert.equal(await page.locator('[data-field="water"]').getAttribute('aria-pressed'),'true');
 });
 await scenario('history failure has recovery UI', {entriesDown:true},async page=>{await failure(page)});
 await scenario('network failure preserves saved login', {expired:true,refreshDown:true},async(page,state,saved)=>{await failure(page);assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_session')),JSON.stringify(saved));assert.equal(state.refreshes,1)});
 await scenario('invalid refresh returns to sign-in', {expired:true,invalidRefresh:true},async page=>{await page.locator('#authView:not(.hidden)').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_session')),null);assert.equal(await page.locator('#boot').count(),0)});
 await scenario('expired session refresh succeeds', {expired:true},async(page,state)=>{await loaded(page);assert.equal(state.refreshes,1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fit74_session')).access_token),'fixture-renewed')});
 await scenario('simultaneous 401 responses share one refresh', {rejectOldAccess:true},async(page,state)=>{await loaded(page);assert.equal(state.refreshes,1)});
 await scenario('stalled refresh times out with login preserved', {expired:true,hangRefresh:true},async(page,state,saved)=>{
  assert.equal(typeof state.release,'function','the refresh request is stalled');
  await page.clock.fastForward(12500);await failure(page);assert.match(await page.locator('#bootStatus').textContent(),/не ответил вовремя/);assert.equal(await page.evaluate(()=>localStorage.getItem('fit74_session')),JSON.stringify(saved));
 });
 await scenario('blocked script has independent recovery UI', {blockMain:true},async page=>{await page.clock.fastForward(16000);await failure(page);assert.match(await page.locator('#bootStatus').textContent(),/Загрузка занимает/)});
 await scenario('cached old entry has visible recovery UI', {legacy:true,prefsDown:true},async page=>{await failure(page);assert.match(await page.locator('#boot').textContent(),/Не удалось открыть Fit74/)});
 console.log(JSON.stringify({ok:true,scenarios:completed,phoneWidth:390,localDraftsPreserved:true,noHistoryWrites:true},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
