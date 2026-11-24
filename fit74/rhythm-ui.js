/* Fit74 2.0: a cloud-synced companion. Optional features cannot block startup. */
(()=>{
'use strict';
const core=window.Fit74RhythmCore;if(!core)return;
const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
const text=(s,v)=>{const el=q(s);if(el)el.textContent=v};
const show=(s,on)=>q(s)?.classList.toggle('hidden',!on);
const dates=()=>ctx?.period()||{};
let ctx=null,rows=[],contexts=[],awards=new Map(),ready=false,busy=false,awardBusy=false,epoch=0,lastDay=null;
let info=null,expanded=false;
const isoLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const row=d=>rows.find(r=>r.entry_date===d)||{};
const calc=()=>ctx?core.state({rows,entries:ctx.entries(),...dates(),today:ctx.today(),shift:ctx.shift?.()||{}}):null;
const isPaused=d=>ready&&row(d).paused===true;
const pausedDates=()=>ready?rows.filter(r=>r.paused).map(r=>r.entry_date):[];
const disabled=()=>!ready||busy||!info?.inPlan||ctx.selected()!==ctx.today();
function merge(result){for(const r of result||[]){const i=rows.findIndex(x=>x.entry_date===r.entry_date);if(i<0)rows.push(r);else rows[i]=r}}
async function upsert(patches){
 const owner=ctx,day=ctx.today();
 const result=await owner.db('fit74_rhythm_days?on_conflict=user_id,entry_date',{
  method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation,missing=default'},
  body:JSON.stringify(patches.map(p=>({user_id:owner.userId,updated_at:new Date().toISOString(),...p})))
 });
 if(ctx!==owner)return;
 if(!Array.isArray(result)||result.length!==patches.length)throw Error('Сохранение не подтверждено');
 merge(result);
}
function syncOther(){try{ctx?.refresh?.()}catch(e){console.warn('Rhythm refresh',e)}}
async function act(job,message){
 if(disabled())return;busy=true;render();
 try{await job();ctx.toast(message);syncOther()}
 catch(e){console.warn('Rhythm action',e);ctx.toast('Не удалось сохранить. Повтори, когда будет связь.')}
 finally{busy=false;render();void unlock()}
}
async function load(){
 if(!ctx||busy)return;
 const owner=ctx,ticket=++epoch,p=dates(),today=owner.today(),uid=encodeURIComponent(owner.userId);
 const path=(table,cols)=>table+'?select='+cols+'&user_id=eq.'+uid;
 try{
  const range='&entry_date=gte.'+p.start+'&entry_date=lte.'+p.end;
  const [a,b,c]=await Promise.all([
   owner.readRange(path('fit74_rhythm_days','entry_date,energy,paused,visited,micro_checkin,restart_stage,dismissed')+'&order=entry_date.asc','entry_date',p),
   owner.db(path('fit74_rhythm_awards','code,earned_on')),
   owner.readRange(path('fit74_day_context','entry_date,reason')+'&order=entry_date.asc','entry_date',p).catch(()=>[])
  ]);
  if(ctx!==owner||ticket!==epoch||busy)return;
  rows=a||[];contexts=c||[];awards=new Map((b||[]).map(x=>[x.code,x.earned_on]));ready=true;lastDay=today;render();syncOther();
  if(today>=p.start&&today<=p.end&&!row(today).visited){
   busy=true;render();
   try{await upsert([{entry_date:today,visited:true}])}catch(e){console.warn('Rhythm visit',e)}
   finally{if(ctx===owner){busy=false;render()}}
  }
  void unlock();
 }catch(e){if(ctx!==owner||ticket!==epoch)return;console.warn('Optional rhythm state',e);show('#rhythmRetry',true);text('#rhythmStatus','Не удалось загрузить ритм. Основной трекер доступен.');render()}
}
async function unlock(){
 if(!ctx||!ready||busy||awardBusy)return;
 const owner=ctx,s=calc();
 const rec=window.Fit74RecoveryCore;
 const entries=owner.entries().filter(e=>e.entry_date<=owner.today());
 const result=rec?.calculate({entries,...dates(),today:owner.today(),pausedDates:pausedDates()});
 const codes=core.earn({state:s,entries,rows,contexts,stable:rec?.stable||(()=>false),returns:result?.returns||0}).filter(k=>!awards.has(k));
 if(!codes.length)return;awardBusy=true;
 try{
  await owner.db('fit74_rhythm_awards?on_conflict=user_id,code',{
   method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},
   body:JSON.stringify(codes.map(code=>({user_id:owner.userId,code,earned_on:owner.today()})))
  });
  if(owner!==ctx)return;
  const fresh=await owner.db('fit74_rhythm_awards?select=code,earned_on&user_id=eq.'+encodeURIComponent(owner.userId));
  if(owner!==ctx)return;
  const had=awards.size;awards=new Map((fresh||[]).map(x=>[x.code,x.earned_on]));drawAwards();
  if(awards.size>had)owner.toast('Новое достижение в коллекции ✨');
 }catch(e){console.warn('Rhythm awards',e)}finally{awardBusy=false}
}
function drawAwards(){
 const box=q('#rhythmAwards');if(!box)return;box.replaceChildren();
 for(const [code,icon,title,desc] of core.badges){
  const el=document.createElement('div');el.className='rhythm-award'+(awards.has(code)?' earned':'');
  const symbol=document.createElement('span');symbol.className='rhythm-award-icon';symbol.textContent=icon;
  const b=document.createElement('b');b.textContent=title;
  const sub=document.createElement('small');sub.textContent=awards.has(code)?'Получено · '+isoLabel(awards.get(code)):desc;
  el.append(symbol,b,sub);box.append(el);
 }
 text('#rhythmAwardCount',awards.size+' из '+core.badges.length);
}
function decorate(){
 for(const cell of qa('#calendarGrid [data-date]')){
  const pause=isPaused(cell.dataset.date);
  cell.classList.toggle('rhythm-paused',pause);
  if(pause){cell.title='Пауза · '+isoLabel(cell.dataset.date);cell.setAttribute('aria-label',cell.title)}
 }
}
function render(){
 if(!ctx)return;
 info=calc();
 const active=info.inPlan&&ctx.selected()===ctx.today(),on=active&&ready;
 show('#rhythmCard',active);
 show('#rhythmContent',on);
 if(ready){show('#rhythmRetry',false);text('#rhythmStatus','Синхронизировано с аккаунтом')}
 const screen=q('#todayScreen');
 screen?.classList.toggle('rhythm-soft',on&&info.gentle);
 screen?.classList.toggle('rhythm-quiet',on&&(info.paused||info.stage===1||info.energy==='low')&&!expanded);
 screen?.classList.toggle('rhythm-restarting',on&&(info.paused||info.stage>0));
 show('#rhythmPausePanel',on&&info.paused);
 show('#rhythmNormalPanel',on&&!info.paused);
 show('#rhythmOffer',on&&info.suggestion);
 show('#rhythmRestart',on&&!info.paused&&info.stage>0);
 show('#rhythmShowFull',on&&(info.paused||info.stage===1||info.energy==='low'));
 show('#rhythmPauseControls',on&&!info.paused);
 show('#rhythmResume',on&&info.paused);
 text('#rhythmPauseDate',info.paused?'До '+isoLabel(info.until)+' включительно. История и даты плана сохранены.':'');
 text('#rhythmPlanTitle',info.title);text('#rhythmCoachText',info.coach);
 text('#rhythmCheckin',info.checked?'✓ Сегодня ты на связи':'Отметиться за 10 секунд');
 text('#rhythmShowFull',expanded?'Свернуть полный чек-лист':'Показать полный чек-лист');
 const steps=q('#rhythmSteps');if(steps){steps.replaceChildren();for(const title of info.steps){const li=document.createElement('li');li.textContent=title;steps.append(li)}}
 for(const b of qa('[data-rhythm-energy]')){b.setAttribute('aria-pressed',String(b.dataset.rhythmEnergy===info.energy));b.disabled=disabled()}
 const sameDay=info.stageDate===ctx.today();
 text('#rhythmStage','Этап '+info.stage+' из 3');
 text('#rhythmStageName',['','Возвращаем режим','Добавляем движение','Возвращаемся к плану'][info.stage]||'');
 text('#rhythmStageHint',sameDay?'Продолжай в своём темпе. Следующий этап доступен завтра.':'Если готов, переходи дальше. Можно оставаться здесь сколько нужно.');
 text('#rhythmNext',info.stage===3?'Завершить перезапуск':'Готов к следующему этапу');
 for(const b of qa('#rhythmCard button:not([data-rhythm-energy])'))b.disabled=disabled();
 if(q('#rhythmRetry'))q('#rhythmRetry').disabled=busy;
 if(q('#rhythmNext'))q('#rhythmNext').disabled=disabled()||sameDay;
 if(q('#rhythmCheckin'))q('#rhythmCheckin').disabled=disabled()||info.checked;
 if(on&&info.paused)show('#smartNudge',false);
 decorate();drawAwards();
}
function bind(){
 for(const b of qa('[data-rhythm-energy]'))b.onclick=()=>act(()=>upsert([{entry_date:ctx.today(),energy:b.dataset.rhythmEnergy,visited:true}]),'План подстроен ✓');
 q('#rhythmCheckin').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),micro_checkin:true,visited:true}]),'Ты на связи. Баллы не изменились ✓');
 q('#rhythmStart').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),restart_stage:1,visited:true}]),'Начали мягкий перезапуск');
 q('#rhythmLater').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),dismissed:true}]),'Продолжай в своём темпе');
 q('#rhythmManualStart').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),restart_stage:1,visited:true}]),'Начали мягкий перезапуск');
 q('#rhythmNext').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),restart_stage:info.stage===3?0:info.stage+1}]),'Этап обновлён');
 q('#rhythmStop').onclick=()=>act(()=>upsert([{entry_date:ctx.today(),restart_stage:0}]),'Обычный план восстановлен');
 for(const b of qa('[data-rhythm-pause]'))b.onclick=()=>act(async()=>{
  const today=ctx.today(),end=core.min(dates().end,core.add(today,Number(b.dataset.rhythmPause)-1));
  const changes=[];for(let d=today;d<=end;d=core.add(d,1))changes.push({entry_date:d,paused:true});
  await upsert(changes);
 },'Пауза сохранена. Напоминания отключены на этот период.');
 q('#rhythmResume').onclick=()=>act(async()=>{
  const changes=rows.filter(r=>r.paused&&r.entry_date>=ctx.today()&&r.entry_date<=dates().end).map(r=>({entry_date:r.entry_date,paused:false}));
  if(changes.length)await upsert(changes);
 },'План снова активен. Продолжаем спокойно.');
 q('#rhythmShowFull').onclick=()=>{expanded=!expanded;render()};
 q('#rhythmRetry').onclick=()=>load();
 window.addEventListener('fit74:plan-change',()=>{ready=false;expanded=false;render();void load()});
 window.addEventListener('online',()=>load());
 window.addEventListener('fit74:reflection-saved',()=>load());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx){if(ctx.today()!==lastDay){expanded=false;void load()}else render()}});
}
function start(next){ctx=next;rows=[];contexts=[];awards=new Map();ready=false;expanded=false;bind();render();void load()}
function changed(){render();void unlock()}
window.Fit74Rhythm=Object.freeze({start,render:changed,isPaused,pausedDates,decorate});
})();