// A CDN can briefly serve an older entry page with newly deployed scripts.
// Recover to the versioned entry without clearing the session or local drafts.
if(!window.Fit74PlanPeriod){
 const fresh=new URL('./index.html',location.href);fresh.searchParams.set('fit74v','14');
 if(location.href!==fresh.href)location.replace(fresh.href);
 throw new Error('Fit74: загружаем актуальную страницу без удаления локальных данных.');
}
const API='https://dllanxwrezqqufgzucuc.supabase.co';
const KEY='sb_publishable_RQHLHJfu2da4RllXAXyEIw_MBi-MoTU';
const planPeriod=window.Fit74PlanPeriod;
let {start:START,end:END,total:TOTAL}=planPeriod.current;
const defaults={habit_1_name:'10 минут без телефона утром',habit_2_name:'5 минут порядка / подготовка на завтра',habit_3_name:'Отметить трекер до сна',weekly_workout_goal:2,weekly_nutrition_goal:5,weekly_water_goal:6,reminder_enabled:false,reminder_time:'21:30'};
const empty=()=>({workout:false,nutrition:0,movement:false,water:false,sleep:false,habit_1:false,habit_2:false,habit_3:false,weight_kg:null,mood:null,notes:'',minimum_mode:false});
let session=null,user=null,prefs={...defaults},entries=[],draft=empty(),selectedDate=START,saveTimer=null,undoDraft=null,quickIndex=0,trendRange=14,reminderTimer=null,calendarOffset=0,settingsSaving=false,refreshTask=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const dateFromISO=iso=>{const[y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d,12,0,0)};
const isoLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayISO=()=>isoLocal(new Date());
const clamp=iso=>iso<START?START:iso>END?END:iso;
const diff=(a,b)=>Math.round((dateFromISO(b)-dateFromISO(a))/86400000);
const addDays=(iso,n)=>isoLocal(new Date(dateFromISO(iso).getTime()+n*86400000));
const fmt=iso=>dateFromISO(iso).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
const fmtShort=iso=>dateFromISO(iso).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','');
const score=e=>(e.workout?2:0)+(Number(e.nutrition)||0)+(e.movement?1:0)+(e.water?1:0)+(e.sleep?1:0)+(e.habit_1?1:0)+(e.habit_2?1:0)+(e.habit_3?1:0);
const gentleComplete=e=>!!(e.minimum_mode&&e.movement&&e.water&&e.habit_3);
const stable=e=>score(e)>=5||gentleComplete(e);
const show=(el,yes=true)=>el&&el.classList.toggle('hidden',!yes);
const pct=(value,target)=>target<=0?100:Math.min(100,Math.round(value/target*100));
const plural=(n,a,b,c)=>{n=Math.abs(n)%100;const n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c};
function pulse(){try{navigator.vibrate?.(8)}catch{}}
function toast(msg,withUndo=false){const t=$('#toast'),txt=$('#toastText'),a=$('#toastAction');txt.textContent=msg;show(a,withUndo);t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2400)}
function sync(state,text){const p=$('#syncPill');p.className='sync-pill'+(state?' '+state:'');p.textContent=text}
function saveSession(s){session=s;if(s)localStorage.setItem('fit74_session',JSON.stringify(s));else localStorage.removeItem('fit74_session')}
function loadSession(){try{return JSON.parse(localStorage.getItem('fit74_session')||'null')}catch{return null}}
async function cloudJSON(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url,{...options,signal:controller.signal});
  const data=response.status===204?null:await response.json().catch(error=>{if(controller.signal.aborted)throw error;if(response.ok)throw new Error('Не удалось прочитать ответ сервиса. Повтори загрузку.');return {}});
  if(!response.ok){const error=new Error(response.status>=500?'Сервис временно недоступен. Попробуй ещё раз через несколько минут.':data?.msg||data?.message||data?.error_description||'Не удалось выполнить запрос.');error.status=response.status;error.code=data?.error_code||data?.code;throw error}
  return data;
 }catch(error){
  if(controller.signal.aborted)throw new Error('Сервис не ответил вовремя. Проверь интернет и повтори загрузку.');
  if(error instanceof TypeError)throw new Error('Не удалось подключиться к сервису. Проверь интернет и повтори загрузку.');
  throw error;
 }finally{clearTimeout(timer)}
}
async function authReq(path,body){return cloudJSON(API+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)})}
async function login(email,password){const j=await authReq('token?grant_type=password',{email,password});saveSession(j);return j}
async function signup(email,password){const redirect=encodeURIComponent(location.origin+location.pathname),j=await authReq('signup?redirect_to='+redirect,{email,password});if(j.access_token)saveSession(j);return j}
async function refresh(){
 if(refreshTask)return refreshTask;
 if(!session?.refresh_token)return null;
 const previous=session;
 refreshTask=(async()=>{
  try{const next=await authReq('token?grant_type=refresh_token',{refresh_token:previous.refresh_token});saveSession(next);return next}
  catch(error){if(error.status===400||error.status===401||error.status===403){if(session===previous)saveSession(null);return null}throw error}
  finally{refreshTask=null}
 })();
 return refreshTask;
}
async function ensureSession(){session=loadSession();if(!session?.access_token||!session?.user?.id){session=null;return null}const exp=session.expires_at?session.expires_at*1000:0;if(exp&&Date.now()>exp-60000){if(session.refresh_token)await refresh();else saveSession(null)}return session}
async function db(path,opts={}){
 if(!session?.access_token)throw new Error('Сессия завершена. Войди снова.');
 const usedToken=session.access_token,headers={apikey:KEY,Authorization:'Bearer '+usedToken,'Content-Type':'application/json',...(opts.headers||{})};
 try{return await cloudJSON(API+'/rest/v1/'+path,{...opts,headers})}
 catch(error){
  if(error.status!==401)throw error;
  if(session?.access_token===usedToken&&!await refresh())throw error;
  if(!session?.access_token)throw error;
  headers.Authorization='Bearer '+session.access_token;return cloudJSON(API+'/rest/v1/'+path,{...opts,headers});
 }
}
function completeStartup(){document.documentElement.classList.add('fit74-ready');$('#appView')?.classList.add('fit74-ui-ready');window.Fit74Startup?.complete();$('#boot')?.remove()}
function failStartup(error){
 console.error('Fit74 startup',error);
 if(!session?.access_token&&user){user=null;showAuth();$('#authMessage').textContent='Сессия завершена. Войди снова — твои записи сохранены.';return}
 show($('#appView'),false);show($('#authView'),false);
 if(window.Fit74Startup){window.Fit74Startup.fail(error.message);return}
 // Older cached HTML must also have a visible recovery path.
 let panel=$('#boot');if(!panel){panel=document.createElement('div');panel.id='boot';panel.className='boot';document.body.appendChild(panel)}
 panel.style.cssText='position:fixed;inset:0;z-index:999;display:grid;place-content:center;gap:20px;padding:24px;background:#f8f8f6;color:#252c31;font:16px/1.5 system-ui;text-align:center';
 panel.textContent='Не удалось открыть Fit74. Проверь интернет и попробуй ещё раз.';
 const retry=document.createElement('a');retry.href='./index.html?fit74v=14';retry.textContent='Повторить загрузку';panel.appendChild(retry);
}
async function boot(){registerSW();await ensureSession();if(session?.user){user=session.user;await enter()}else showAuth()}
function showAuth(){show($('#authView'));show($('#appView'),false);completeStartup()}
async function enter(){await loadPrefs();applyPlanPeriod();selectedDate=clamp(todayISO());await loadEntries();loadDraft();$('#accountEmail').textContent=user.email||'';renderAll();scheduleReminder();show($('#authView'),false);show($('#appView'));planPeriod.publish();completeStartup();startPush();if(new URL(location.href).searchParams.get('checkin')==='1'){openNotificationCheckin();const clean=new URL(location.href);clean.searchParams.delete('checkin');history.replaceState(null,'',clean)}}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();const m=$('#authMessage');m.textContent='Входим…';try{const j=await login($('#email').value.trim(),$('#password').value);user=j.user;await enter();m.textContent=''}catch(err){m.textContent=err.message}});
$('#signupBtn').addEventListener('click',async()=>{const email=$('#email').value.trim(),password=$('#password').value,m=$('#authMessage');if(!email||password.length<8){m.textContent='Нужен email и пароль минимум из 8 символов.';return}m.textContent='Создаём аккаунт…';try{const j=await signup(email,password);if(j.access_token){session=j;user=j.user;await enter()}else m.textContent='Аккаунт создан. Если придёт письмо — подтверди email, затем войди.'}catch(err){m.textContent=err.message}});
async function loadPrefs(){const d=await db('fit74_preferences?select=*&user_id=eq.'+user.id);if(d?.[0])prefs={...defaults,...d[0]};else{const arr=await db('fit74_preferences',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:user.id,...defaults,start_date:START,end_date:END})});prefs={...defaults,...(arr?.[0]||{})}}}
function applyPlanPeriod(){
 try{({start:START,end:END,total:TOTAL}=planPeriod.update(prefs.start_date||planPeriod.DEFAULT_START,prefs.end_date||planPeriod.DEFAULT_END))}
 catch(error){console.warn('Fit74 plan dates',error);({start:START,end:END,total:TOTAL}=planPeriod.update(planPeriod.DEFAULT_START,planPeriod.DEFAULT_END))}
}
async function loadEntries(){const period=planPeriod.current,rows=await planPeriod.readRange(db,'fit74_daily_entries?select=*&order=entry_date.asc','entry_date',period);if(period!==planPeriod.current)return;entries=[...entries.filter(e=>e.entry_date<period.start||e.entry_date>period.end),...rows]}
function loadDraft(){const remote=entries.find(e=>e.entry_date===selectedDate);let local=null;try{local=JSON.parse(localStorage.getItem('fit74:'+user.id+':'+selectedDate)||'null')}catch{}draft={...empty(),...(remote||{}),...(local?.dirty?local.data:{})}}
function payload(){return{user_id:user.id,entry_date:selectedDate,workout:!!draft.workout,nutrition:Number(draft.nutrition)||0,movement:!!draft.movement,water:!!draft.water,sleep:!!draft.sleep,habit_1:!!draft.habit_1,habit_2:!!draft.habit_2,habit_3:!!draft.habit_3,weight_kg:draft.weight_kg?Number(draft.weight_kg):null,mood:draft.mood?Number(draft.mood):null,notes:(draft.notes||'').trim()||null,minimum_mode:!!draft.minimum_mode}}
function dirty(){if(!user)return;localStorage.setItem('fit74:'+user.id+':'+selectedDate,JSON.stringify({dirty:true,data:payload(),at:Date.now()}));sync('saving','… облако');$('#autosaveText').textContent='… сохраняю';clearTimeout(saveTimer);saveTimer=setTimeout(saveRemote,450)}
async function saveRemote(body=payload()){
 if(body.entry_date>todayISO())return false;
 if(!navigator.onLine){sync('offline','● офлайн');$('#autosaveText').textContent='на iPhone';return false}
 const key='fit74:'+body.user_id+':'+body.entry_date,localBefore=localStorage.getItem(key);
 try{const arr=await db('fit74_daily_entries?on_conflict=user_id,entry_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});const d=arr?.[0];if(d){const unchanged=localBefore===localStorage.getItem(key);if(unchanged)localStorage.removeItem(key);const i=entries.findIndex(e=>e.entry_date===body.entry_date);if(i>=0)entries[i]=d;else entries.push(d);entries.sort((a,b)=>a.entry_date.localeCompare(b.entry_date));if(unchanged&&selectedDate===body.entry_date)draft={...draft,...d}}sync('','✓ облако');$('#autosaveText').textContent='✓ сохранено';renderSummary();renderWeeklyGoals();checkSmartReminder();return true}catch(err){console.error(err);sync('offline','● локально');$('#autosaveText').textContent='на iPhone';return false}
}
function snapshot(){undoDraft={...draft}}
function mutate(fn,label='Изменено'){snapshot();fn();pulse();renderToday();renderWeeklyGoals();dirty();toast(label,true)}
$('#toastAction').onclick=()=>{if(!undoDraft)return;draft={...undoDraft};undoDraft=null;renderToday();renderWeeklyGoals();dirty();toast('Отменено')};
$$('.check-row').forEach(b=>b.onclick=()=>mutate(()=>{draft[b.dataset.field]=!draft[b.dataset.field]},draft[b.dataset.field]?'Снято':'Засчитано'));
$$('[data-nutrition]').forEach(b=>b.onclick=()=>mutate(()=>{draft.nutrition=Number(b.dataset.nutrition)},'Питание обновлено'));
$$('[data-mood]').forEach(b=>b.onclick=()=>mutate(()=>{const n=Number(b.dataset.mood);draft.mood=draft.mood===n?null:n},'Самочувствие обновлено'));
$('#weightInput').oninput=e=>{draft.weight_kg=e.target.value||null;dirty()};
$('#notesInput').oninput=e=>{draft.notes=e.target.value;dirty()};
$('#minimumToggle').onclick=()=>mutate(()=>{draft.minimum_mode=!draft.minimum_mode},draft.minimum_mode?'Бережный режим выключен':'Бережный режим включён');
$('#finishDayBtn').onclick=async()=>{const ok=await saveRemote(),s=score(draft),g=gentleComplete(draft);pulse();toast(!ok?'Сохранено на iPhone — синхронизирую позже':s>=8?'🔥 '+s+'/10. Сильный день!':s>=5?'✅ '+s+'/10. День засчитан.':g?'🛟 Бережный день закрыт. Серия сохранена.':s+'/10. Завтра просто продолжаем.');renderAll()};
const quickSteps=[
 {field:'workout',emoji:'🏋️',title:'Тренировка?',sub:'По плану или восстановление — засчитываем оба варианта.',options:[['Нет',false],['Да',true]]},
 {field:'nutrition',emoji:'🥗',title:'Как с питанием?',sub:'Не оцениваем себя — только факт дня.',options:[['Мимо',0],['Частично',1],['В цель',2]]},
 {field:'movement',emoji:'🚶',title:'Движение было?',sub:'Твой минимальный уровень активности на сегодня.',options:[['Нет',false],['Да',true]]},
 {field:'water',emoji:'💧',title:'Воду закрыл?',sub:'Норма дня выполнена?',options:[['Нет',false],['Да',true]]},
 {field:'sleep',emoji:'🌙',title:'Режим бережём?',sub:'Сон и вечерний режим были в порядке?',options:[['Нет',false],['Да',true]]},
 {field:'habit_1',emoji:'①',title:()=>prefs.habit_1_name,sub:'Первая личная привычка.',options:[['Нет',false],['Да',true]]},
 {field:'habit_2',emoji:'②',title:()=>prefs.habit_2_name,sub:'Вторая личная привычка.',options:[['Нет',false],['Да',true]]},
 {field:'habit_3',emoji:'③',title:()=>prefs.habit_3_name,sub:'Последний чек — и готово.',options:[['Нет',false],['Да',true]]}
];
function openQuick(){quickIndex=0;renderQuick();$('#quickModal').classList.add('open');$('#quickModal').setAttribute('aria-hidden','false')}
function closeQuick(){const m=$('#quickModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');renderToday();renderWeeklyGoals()}
function renderQuick(){const s=quickSteps[quickIndex],opts=$('#quickOptions');$('#quickCounter').textContent=(quickIndex+1)+' из '+quickSteps.length;$('#quickProgress').style.width=((quickIndex+1)/quickSteps.length*100)+'%';$('#quickEmoji').textContent=s.emoji;$('#quickTitle').textContent=typeof s.title==='function'?s.title():s.title;$('#quickSubtitle').textContent=s.sub;opts.className='quick-options '+(s.options.length===3?'three':'two');opts.innerHTML='';s.options.forEach(([label,val],idx)=>{const b=document.createElement('button');b.textContent=label;if(idx===s.options.length-1)b.classList.add('primary-choice');b.onclick=()=>{snapshot();draft[s.field]=val;pulse();renderToday();dirty();if(quickIndex<quickSteps.length-1){quickIndex++;renderQuick()}else{closeQuick();toast('⚡ Чек-ин готов — '+score(draft)+'/10')}};opts.appendChild(b)});show($('#quickBack'),quickIndex>0)}
$('#quickCheckinBtn').onclick=openQuick;$('#quickClose').onclick=closeQuick;$('#quickBack').onclick=()=>{if(quickIndex>0){quickIndex--;renderQuick()}};$('#quickModal').addEventListener('click',e=>{if(e.target.id==='quickModal')closeQuick()});
$$('.bottom-nav button').forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));
function switchScreen(name){
 const navName=name==='trends'?'history':name;
 $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===navName));
 if(name==='workouts'){$('#openWorkoutLibrary')?.click();return}
 $('#workoutHub')?.classList.remove('open');$('#workoutHub')?.setAttribute('aria-hidden','true');document.body.classList.remove('workout-lock');
 $$('.screen').forEach(s=>s.classList.remove('active'));$('#'+name+'Screen')?.classList.add('active');
 if(name==='history')renderHistory();if(name==='trends')renderTrends();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:'instant'});
}
function boundGoal(v,fallback){const n=Number(v);return Number.isFinite(n)?Math.min(7,Math.max(0,Math.round(n))):fallback}
async function savePreferences(periodOnly=false){
 if(settingsSaving||!user)return;
 let period;try{period=window.Fit74PlanSettings.read()}catch(error){window.Fit74PlanSettings.setError(error.message);$('#planSettingsCard').scrollIntoView({behavior:'smooth',block:'start'});return}
 const changed=period.start!==START||period.end!==END,enabled=$('#reminderEnabled').checked;
 const p={user_id:user.id,start_date:period.start,end_date:period.end};
 if(!periodOnly)Object.assign(p,{habit_1_name:$('#habit1Input').value.trim()||defaults.habit_1_name,habit_2_name:$('#habit2Input').value.trim()||defaults.habit_2_name,habit_3_name:$('#habit3Input').value.trim()||defaults.habit_3_name,weekly_workout_goal:boundGoal($('#weeklyWorkoutGoal').value,2),weekly_nutrition_goal:boundGoal($('#weeklyNutritionGoal').value,5),weekly_water_goal:boundGoal($('#weeklyWaterGoal').value,6),reminder_enabled:enabled,reminder_time:$('#reminderTime').value||'21:30'});
 settingsSaving=true;window.Fit74PlanSettings.setSaving(true);$('#saveSettingsBtn').disabled=true;
 try{
  // A pending daily save belongs to its original calendar date, even if the plan moves.
  if(changed){clearTimeout(saveTimer);saveTimer=null;const key='fit74:'+user.id+':'+selectedDate;if(localStorage.getItem(key))await saveRemote(payload())}
  const arr=await db('fit74_preferences?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(p)});
  if(!arr?.[0])throw new Error('Сервер не подтвердил сохранение. Попробуй ещё раз.');
  prefs={...defaults,...prefs,...p,...arr[0]};let historyLoaded=true;
  if(changed){applyPlanPeriod();selectedDate=clamp(todayISO());undoDraft=null;calendarOffset=0;try{await loadEntries()}catch(error){console.warn('Fit74 plan history',error);historyLoaded=false}loadDraft();}
  renderHeader();renderLabels();renderToday();renderSummary();renderWeeklyGoals();
  if(periodOnly)window.Fit74PlanSettings.render();else renderSettings();
  if($('#historyScreen').classList.contains('active'))renderHistory();if($('#trendsScreen').classList.contains('active'))renderTrends();
  show($('#smartNudge'),false);scheduleReminder();if(changed)planPeriod.publish();
  toast(!historyLoaded?'Даты сохранены. Историю не удалось загрузить — обнови страницу.':periodOnly?'Период сохранён · '+TOTAL+' '+plural(TOTAL,'день','дня','дней'):'Настройки сохранены ✓');
 }catch(error){console.error(error);window.Fit74PlanSettings.setError('Не удалось сохранить. '+error.message);toast('Изменения не сохранены — попробуй ещё раз')}
 finally{settingsSaving=false;window.Fit74PlanSettings.setSaving(false);$('#saveSettingsBtn').disabled=false}
}
$('#saveSettingsBtn').onclick=()=>savePreferences();window.addEventListener('fit74:save-plan',()=>savePreferences(true));
$('#logoutBtn').onclick=async()=>{try{await window.Fit74Push?.disconnect()}catch{console.warn('Fit74: push disconnect unavailable')}saveSession(null);location.reload()};
function effectiveEntries(){const list=entries.filter(e=>e.entry_date>=START&&e.entry_date<=END).map(e=>({...e}));const now=todayISO();if(user&&selectedDate<=now&&selectedDate>=START&&selectedDate<=END){const i=list.findIndex(e=>e.entry_date===selectedDate);const p={...payload(),score:score(draft)};if(i>=0)list[i]={...list[i],...p};else if(Object.values(draft).some(v=>v===true||Number(v)>0||typeof v==='string'&&v.trim()))list.push(p)}return list}
function renderAll(){renderHeader();renderLabels();renderToday();renderSummary();renderWeeklyGoals();renderSettings();checkSmartReminder()}
function renderHeader(){
 const now=todayISO(),pre=now<START,d=selectedDate,day=diff(START,d)+1,archive=!pre&&d!==now,elapsed=now<START?0:Math.min(TOTAL,diff(START,clamp(now))+1);
 $('#heroTitle').innerHTML=pre?(diff(now,START)===1?'Твой план<br>на завтра':'Твой план<br>к старту'):archive?'Твой план<br>на '+dateFromISO(d).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}):'Твой план<br>на сегодня';
 $('#heroDate').textContent=dateFromISO(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
 const name=user?.user_metadata?.first_name||user?.user_metadata?.display_name?.split(' ')[0]||user?.user_metadata?.full_name?.split(' ')[0];
 $('#greeting').textContent=name?'Привет, '+name+'!':'Привет!';
 $('#daysLeft').textContent=pre?TOTAL:Math.max(0,diff(clamp(now),END));show($('#prestartBanner'),pre);
 $('#daysLeftUnit').textContent=plural(Number($('#daysLeft').textContent),'день','дня','дней');
 $('#prestartBanner').textContent='Старт '+dateFromISO(START).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})+'. Можно заранее настроить привычки 👌';
 const startLabel=dateFromISO(START).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
 $('#challengeStatus').textContent=pre?((diff(now,START)===1?'Старт завтра · ':'Старт · ')+startLabel):now>END?'Дистанция завершена':archive?'Марафон · день '+day+' · архив':'Марафон · день '+day;
 $('#challengeCount').textContent=elapsed+' из '+TOTAL;
 const ticks=Math.min(74,TOTAL);$('#challengeTicks').style.setProperty('--plan-ticks',ticks);$('#challengeTicks').innerHTML=Array.from({length:ticks},(_,i)=>'<i'+((i+1)/ticks<=elapsed/TOTAL?' class="past"':'')+'></i>').join('');
 $('#calendarTitle').textContent=TOTAL+' '+plural(TOTAL,'день','дня','дней');
 $$('.check-row,[data-nutrition],[data-mood],#weightInput,#notesInput,#minimumToggle,#finishDayBtn,#quickCheckinBtn').forEach(control=>control.disabled=d>now);
}
function renderLabels(){$('#habit1Label').textContent=prefs.habit_1_name||defaults.habit_1_name;$('#habit2Label').textContent=prefs.habit_2_name||defaults.habit_2_name;$('#habit3Label').textContent=prefs.habit_3_name||defaults.habit_3_name}
function renderToday(){$$('.check-row').forEach(b=>{b.classList.toggle('on',!!draft[b.dataset.field]);b.setAttribute('aria-pressed',String(!!draft[b.dataset.field]))});$$('[data-nutrition]').forEach(b=>b.classList.toggle('active',Number(b.dataset.nutrition)===Number(draft.nutrition||0)));$$('[data-mood]').forEach(b=>b.classList.toggle('active',Number(b.dataset.mood)===Number(draft.mood)));if(document.activeElement!==$('#weightInput'))$('#weightInput').value=draft.weight_kg??'';if(document.activeElement!==$('#notesInput'))$('#notesInput').value=draft.notes??'';const s=score(draft),g=gentleComplete(draft);$('#scoreValue').textContent=s;$('#dailyScore').textContent=s+'/10';$('#scoreRing').style.setProperty('--score',s);$('#scoreLabel').textContent=s>=8?'Сильный день 🔥':s>=5?'День засчитан ✅':g?'Бережный день 🛟':s>0?'Уже не ноль':'Начинаем';$('#minimumCard').classList.toggle('active',!!draft.minimum_mode);$('#minimumToggle').textContent=draft.minimum_mode?'Включён':'Включить';const core=[['#minMove',draft.movement],['#minWater',draft.water],['#minTrack',draft.habit_3]];let n=0;core.forEach(([sel,val])=>{$(sel).classList.toggle('done',!!val);if(val)n++});$('#minProgress').style.width=(n/3*100)+'%';$('#minStatus').textContent=n+'/3'+(draft.minimum_mode&&n===3?' · серия сохранена':'')}
function streaks(){const map=new Map(effectiveEntries().map(e=>[e.entry_date,e]));let best=0,run=0,previous=null;for(const d of [...map.keys()].sort()){const e=map.get(d);if(stable(e)){run=previous&&diff(previous,d)===1?run+1:1;best=Math.max(best,run);previous=d}else{run=0;previous=null}}let a=clamp(todayISO());if(!map.has(a)&&a>START)a=addDays(a,-1);let cur=0;while(a>=START){const e=map.get(a);if(!e||!stable(e))break;cur++;a=addDays(a,-1)}return{cur,best}}
function renderSummary(){const list=effectiveEntries(),{cur,best}=streaks(),good=list.filter(e=>score(e)>=5).length,strong=list.filter(e=>score(e)>=8).length;$('#streakText').textContent='Серия: '+cur+' '+plural(cur,'день','дня','дней');$('#currentStreak').textContent=cur;$('#bestStreak').textContent=best;$('#strongDays').textContent=strong;$('#completedStat').textContent=good+'/'+TOTAL}
function weekBounds(iso){const d=dateFromISO(iso),monday=new Date(d);monday.setDate(d.getDate()-((d.getDay()+6)%7));let s=isoLocal(monday),e=addDays(s,6);if(s<START)s=START;if(e>END)e=END;return[s,e]}
function weekEntries(iso){const[s,e]=weekBounds(iso);return effectiveEntries().filter(x=>x.entry_date>=s&&x.entry_date<=e)}
function renderWeeklyGoals(){const now=todayISO(),focus=clamp(now),[s,e]=weekBounds(focus),list=weekEntries(focus),workouts=list.filter(x=>x.workout).length,nutrition=list.filter(x=>Number(x.nutrition)===2).length,water=list.filter(x=>x.water).length,gw=Number(prefs.weekly_workout_goal??2),gn=Number(prefs.weekly_nutrition_goal??5),gwater=Number(prefs.weekly_water_goal??6);$('#goalWorkoutCount').textContent=workouts+'/'+gw;$('#goalNutritionCount').textContent=nutrition+'/'+gn;$('#goalWaterCount').textContent=water+'/'+gwater;$('#goalWorkoutBar').style.width=pct(workouts,gw)+'%';$('#goalNutritionBar').style.width=pct(nutrition,gn)+'%';$('#goalWaterBar').style.width=pct(water,gwater)+'%';const daysSoFar=now<START?0:Math.min(7,diff(s,focus)+1),stableDays=list.filter(stable).length,stability=daysSoFar?Math.round(stableDays/daysSoFar*100):0;$('#weekStability').textContent=stability+'% стабильности';let note='Неделя ещё впереди — без форсажа.';if(now>=START){const remaining=Math.max(0,diff(focus,e));note=remaining?('До конца недели '+remaining+' '+plural(remaining,'день','дня','дней')+'. Держим ровный темп.'):'Неделя закрывается сегодня. Никаких догонялок.'}$('#weekNote').textContent=note}
function renderHistory(){renderSummary();renderWeekSummary();renderCalendar();renderMilestone();renderHistoryList()}
function renderWeekSummary(){const focus=clamp(todayISO()),[s,e]=weekBounds(focus),list=weekEntries(focus),scores=list.map(score),good=scores.filter(x=>x>=5).length,avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0,moods=list.map(x=>Number(x.mood)).filter(Boolean),mood=moods.length?moods.reduce((a,b)=>a+b,0)/moods.length:null;$('#weekRange').textContent=fmtShort(s)+' — '+fmtShort(e);$('#weekGoodDays').textContent=good;$('#weekAvgScore').textContent=avg.toFixed(1);$('#weekMood').textContent=mood?mood.toFixed(1):'—';let insight='После старта здесь появится короткий разбор недели.';if(list.length){const cats=[['вода',list.filter(x=>x.water).length],['движение',list.filter(x=>x.movement).length],['сон',list.filter(x=>x.sleep).length],['питание',list.filter(x=>Number(x.nutrition)===2).length]];cats.sort((a,b)=>b[1]-a[1]);const weak=[...cats].sort((a,b)=>a[1]-b[1])[0];insight=`Лучше всего сейчас идёт ${cats[0][0]}. Меньше всего закрывается ${weak[0]}. Просто учитываем это на следующей неделе.`}$('#weekInsight').textContent=insight}
function renderCalendar(){const map=new Map(effectiveEntries().map(e=>[e.entry_date,e])),grid=$('#calendarGrid'),now=todayISO(),size=84;calendarOffset=Math.max(0,Math.min(calendarOffset,Math.floor((TOTAL-1)/size)*size));const end=Math.min(TOTAL,calendarOffset+size);show($('#calendarPager'),TOTAL>size);$('#calendarPrev').disabled=calendarOffset===0;$('#calendarNext').disabled=end===TOTAL;$('#calendarPageRange').textContent=fmtShort(addDays(START,calendarOffset))+' — '+fmtShort(addDays(START,end-1));grid.innerHTML='';for(let i=calendarOffset;i<end;i++){const iso=addDays(START,i),e=map.get(iso),s=e?score(e):0,c=document.createElement('button');c.className='cal-day';c.textContent=i+1;c.title=fmt(iso);c.setAttribute('aria-label','День '+(i+1)+' · '+fmt(iso));if(s>=8)c.classList.add('strong');else if(s>=5)c.classList.add('good');else if(e&&gentleComplete(e))c.classList.add('gentle');else if(iso<now&&!e)c.classList.add('gap');else if(iso>now)c.classList.add('future');if(iso===selectedDate)c.classList.add('selected');c.onclick=()=>{if(iso>now){toast('Этот день ещё впереди 🙂');return}selectDay(iso)};grid.appendChild(c)}}
$('#calendarPrev').onclick=()=>{calendarOffset-=84;renderCalendar()};$('#calendarNext').onclick=()=>{calendarOffset+=84;renderCalendar()};
function renderMilestone(){const now=todayISO(),elapsed=now<START?0:Math.min(TOTAL,diff(START,clamp(now))+1),targets=[...new Set([7,14,30,Math.ceil(TOTAL/2),50,TOTAL].filter(x=>x<=TOTAL))].sort((a,b)=>a-b),target=targets.find(x=>x>=elapsed)||TOTAL,prev=targets.filter(x=>x<target).pop()||0,span=target-prev,progress=Math.max(0,Math.min(100,(elapsed-prev)/span*100));$('#milestoneNumber').textContent=target+' '+plural(target,'день','дня','дней');$('#milestoneBar').style.width=progress+'%';const left=Math.max(0,target-elapsed);$('#milestoneText').textContent=elapsed===target&&elapsed>0?'Рубеж взят ✨ Это уже настоящая дистанция.':elapsed?('До рубежа '+left+' '+plural(left,'день','дня','дней')+'. Ровно идём дальше.'):'Первый маленький рубеж уже близко.'}
function renderHistoryList(){const l=$('#historyList'),list=effectiveEntries().filter(e=>e.entry_date<=todayISO()).sort((a,b)=>b.entry_date.localeCompare(a.entry_date));l.innerHTML='';if(!list.length){l.innerHTML='<div class="history-item"><div><b>Пока пусто</b><small>Первая запись появится после старта.</small></div></div>';return}list.forEach(e=>{const s=score(e),i=document.createElement('div');i.className='history-item';const label=s>=8?'Сильный день 🔥':s>=5?'День засчитан ✅':gentleComplete(e)?'Бережный день 🛟':'Ниже минимума';i.innerHTML=`<div><b>${fmt(e.entry_date)}</b><small>${label}</small></div><div class="history-score">${s}/10</div>`;i.onclick=()=>selectDay(e.entry_date);l.appendChild(i)})}
function selectDay(iso){clearTimeout(saveTimer);saveTimer=null;const key='fit74:'+user.id+':'+selectedDate;if(localStorage.getItem(key))saveRemote(payload());selectedDate=clamp(iso);undoDraft=null;loadDraft();renderAll();switchScreen('today');window.Fit74ShiftSchedule?.renderToday()}
$$('[data-range]').forEach(b=>b.onclick=()=>{trendRange=Number(b.dataset.range);$$('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderTrends()});
function rangeEntries(days){const end=clamp(todayISO()),start=addDays(end,-days+1);return effectiveEntries().filter(e=>e.entry_date>=start&&e.entry_date<=end)}
function renderTrends(){const list=rangeEntries(trendRange),scores=list.map(score),stableN=list.filter(stable).length,moods=list.map(x=>Number(x.mood)).filter(Boolean);$('#trendAvgScore').textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—';$('#trendStability').textContent=list.length?Math.round(stableN/list.length*100)+'%':'—';$('#trendMood').textContent=moods.length?(moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1):'—';drawScoreChart(list);drawWeightChart(list);renderInsights(list)}
function svgEl(tag,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function drawBase(svg){svg.innerHTML='';for(let i=0;i<4;i++){const y=10+i*40;svg.appendChild(svgEl('line',{x1:0,y1:y,x2:320,y2:y,class:'chart-grid'}))}}
function makePoints(values,min,max){if(!values.length)return[];const span=Math.max(.1,max-min),w=300/(Math.max(1,values.length-1));return values.map((v,i)=>[10+i*w,130-(v-min)/span*110])}
function drawLine(svg,pts,cls='chart-line'){if(!pts.length)return;const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');svg.appendChild(svgEl('path',{d,class:cls}));pts.forEach(p=>svg.appendChild(svgEl('circle',{cx:p[0],cy:p[1],r:3,class:'chart-dot'})))}
function drawScoreChart(list){const svg=$('#scoreChart');drawBase(svg);drawLine(svg,makePoints(list.map(score),0,10))}
function drawWeightChart(list){const svg=$('#weightChart'),vals=list.map(e=>Number(e.weight_kg)).filter(Boolean);$('#weightEmpty').textContent=vals.length<2?'Добавь хотя бы два значения веса — появится тренд.':'';if(!vals.length){svg.innerHTML='';$('#weightDelta').textContent='—';return}const min=Math.min(...vals)-.5,max=Math.max(...vals)+.5;drawBase(svg);drawLine(svg,makePoints(vals,min,max),'chart-line chart-weight');$('#weightDelta').textContent=vals.length>1?((vals.at(-1)-vals[0]>=0?'+':'')+(vals.at(-1)-vals[0]).toFixed(1)+' кг'):'—'}
function renderInsights(list){const box=$('#insightsList');box.innerHTML='';if(list.length<5){box.innerHTML='<div class="insight"><span>🌱</span><div><b>Нужно немного данных</b><small>После 5–7 заполненных дней появятся персональные наблюдения.</small></div></div>';return}const candidates=[];const compare=(label,emoji,pred)=>{const yes=list.filter(pred).map(score),no=list.filter(x=>!pred(x)).map(score);if(yes.length>=2&&no.length>=2){const ay=yes.reduce((a,b)=>a+b,0)/yes.length,an=no.reduce((a,b)=>a+b,0)/no.length,d=ay-an;candidates.push({abs:Math.abs(d),emoji,label,text:`В отмеченные дни средний балл ${d>=0?'выше':'ниже'} на ${Math.abs(d).toFixed(1)}.`})}};compare('Когда была тренировка','🏋️',e=>e.workout);compare('Когда закрыт сон / режим','🌙',e=>e.sleep);compare('Когда закрыта вода','💧',e=>e.water);compare('Когда питание было в цель','🥗',e=>Number(e.nutrition)===2);candidates.sort((a,b)=>b.abs-a.abs);(candidates.slice(0,3).length?candidates.slice(0,3):[{emoji:'🧭',label:'Пока без яркой закономерности',text:'Это нормально: продолжаем собирать спокойную статистику.'}]).forEach(x=>{const d=document.createElement('div');d.className='insight';d.innerHTML=`<span>${x.emoji}</span><div><b>${x.label}</b><small>${x.text}</small></div>`;box.appendChild(d)})}
function renderSettings(){window.Fit74PlanSettings?.render();$('#habit1Input').value=prefs.habit_1_name||defaults.habit_1_name;$('#habit2Input').value=prefs.habit_2_name||defaults.habit_2_name;$('#habit3Input').value=prefs.habit_3_name||defaults.habit_3_name;$('#weeklyWorkoutGoal').value=prefs.weekly_workout_goal??2;$('#weeklyNutritionGoal').value=prefs.weekly_nutrition_goal??5;$('#weeklyWaterGoal').value=prefs.weekly_water_goal??6;$('#reminderEnabled').checked=!!prefs.reminder_enabled;$('#reminderTime').value=prefs.reminder_time||'21:30';window.Fit74Push?.render(prefs)}
async function registerSW(){try{await window.Fit74Push?.registerWorker()}catch(e){console.warn('SW',e)}}
function openNotificationCheckin(){selectedDate=clamp(todayISO());loadDraft();switchScreen('today');renderToday();if(todayISO()>=START&&todayISO()<=END)openQuick()}
async function pushRequest(body){await ensureSession();const send=()=>cloudJSON(API+'/functions/v1/fit74-push',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session?.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});try{return await send()}catch(error){if(error.status!==401||!await refresh())throw error;return await send()}}
function startPush(){window.Fit74Push?.start({userId:user.id,settings:prefs,request:pushRequest,publicConfig:()=>cloudJSON(API+'/functions/v1/fit74-push',{headers:{apikey:KEY}}),openCheckin:openNotificationCheckin})}
function scheduleReminder(){clearTimeout(reminderTimer);if(!prefs.reminder_enabled||todayISO()<START||todayISO()>END)return;const now=new Date(),date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(now),target=new Date(date+'T'+(prefs.reminder_time||'21:30')+':00+03:00');if(target<=now){checkSmartReminder();target.setTime(target.getTime()+86400000)}reminderTimer=setTimeout(()=>{checkSmartReminder();scheduleReminder()},Math.min(target-now,2147483647))}
function todayEntry(){const iso=clamp(todayISO());if(selectedDate===iso)return{...draft,entry_date:iso};return effectiveEntries().find(e=>e.entry_date===iso)||null}
async function checkSmartReminder(){if(!prefs.reminder_enabled||todayISO()<START||todayISO()>END)return;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));const [h,m]=(prefs.reminder_time||'21:30').split(':').map(Number);if(Number(parts.hour)*60+Number(parts.minute)<h*60+m)return;const e=todayEntry()||empty();if(stable(e)){show($('#smartNudge'),false);return}const s=score(e),need=Math.max(1,5-s);$('#smartNudgeText').textContent=s?`Сейчас ${s}/10. До обычного зачёта ${need} ${plural(need,'очко','очка','очков')}.`:'Сегодня ещё ничего не отмечено. Можно закрыть день быстрым чек-ином.';show($('#smartNudge'))}
$('#dismissNudge').onclick=()=>show($('#smartNudge'),false);
window.addEventListener('online',()=>{if(user)saveRemote()});window.addEventListener('offline',()=>sync('offline','● офлайн'));document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)checkSmartReminder()});window.addEventListener('focus',()=>{if(user)checkSmartReminder()});
boot().catch(failStartup);
