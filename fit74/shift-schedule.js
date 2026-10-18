(()=>{
  'use strict';

  const DEFAULT_ANCHOR='2026-10-19'; // 2-й выходной после ночных, перед первой дневной сменой
  const START='2026-10-19', END='2026-12-31';
  const q=(s,r=document)=>r.querySelector(s);
  let anchor=localStorage.getItem('fit74_shift_anchor')||DEFAULT_ANCHOR;
  let sessions=[];
  let prefsLoaded=false;

  const W={
    A:{title:'Тренировка A',meta:'🏋️ Всё тело · 35–45 мин'},
    B:{title:'Тренировка B',meta:'🏋️ Ноги · спина · корпус · 35–45 мин'},
    GLUTES:{title:'Ягодицы',meta:'🍑 Отдельная тренировка · 30–35 мин'},
    LIGHT:{title:'Восстановление',meta:'🌿 Мягкое движение · 20–30 мин'},
    REST:{title:'Без обязательной тренировки',meta:'😌 Смена / восстановление'}
  };

  function utc(iso){const [y,m,d]=iso.split('-').map(Number);return Date.UTC(y,m-1,d)}
  function diffDays(a,b){return Math.round((utc(a)-utc(b))/86400000)}
  function addDays(iso,n){const d=new Date(utc(iso)+n*86400000);return d.toISOString().slice(0,10)}
  function fmt(iso){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(utc(iso)))}
  function currentDate(){try{if(typeof selectedDate!=='undefined'&&selectedDate)return selectedDate}catch{}return START}
  function cycleParity(n){return ((n%2)+2)%2}

  function slotFor(iso){
    const delta=diffDays(iso,anchor), idx=((delta%8)+8)%8, cycle=Math.floor(delta/8);
    const even=cycleParity(cycle)===0, main1=even?'A':'B', main2=even?'B':'A';
    const slots=[
      {short:'Вых 2',title:'2-й выходной',detail:'после ночных · перед дневной',icon:'☀️',code:main1,kind:'main',status:'основная'},
      {short:'Д1',title:'Дневная 1',detail:'09:00–21:00',icon:'☀️',code:'REST',kind:'work',status:'смена'},
      {short:'Д2',title:'Дневная 2',detail:'09:00–21:00',icon:'☀️',code:'REST',kind:'work',status:'смена'},
      {short:'Вых 1',title:'1-й выходной',detail:'после дневных',icon:'🏠',code:main2,kind:'main',status:'основная'},
      {short:'Вых 2',title:'2-й выходной',detail:'перед ночной',icon:'🏠',code:'GLUTES',kind:'optional',status:'по желанию'},
      {short:'Н1',title:'Ночная 1',detail:'21:00–09:00',icon:'🌙',code:'REST',kind:'night',status:'смена'},
      {short:'Н2',title:'Ночная 2',detail:'21:00–09:00',icon:'🌙',code:'REST',kind:'night',status:'смена'},
      {short:'Вых 1',title:'1-й выходной',detail:'после ночных · восстановление',icon:'🌿',code:'LIGHT',kind:'recovery',status:'восстановление'}
    ];
    return {...slots[idx],idx,cycle};
  }

  function isDone(date,code){return sessions.some(s=>s.session_date===date&&s.workout_code===code&&s.completed_at)}
  function cardClass(kind){return kind==='main'?'shift-main':kind==='work'?'shift-work':kind==='night'?'shift-night':kind==='optional'?'shift-optional':'shift-recovery'}
  function dayClass(kind){return kind==='work'?'shift-workday':kind==='night'?'shift-nightday':kind==='optional'?'shift-optional':'shift-offday'}

  function renderToday(){
    const card=q('#todayWorkoutCard'); if(!card)return;
    const date=currentDate(), s=slotFor(date), info=W[s.code]||W.REST, done=isDone(date,s.code);
    card.classList.remove('shift-main','shift-work','shift-night','shift-optional','shift-recovery');
    card.classList.add(cardClass(s.kind));
    const title=q('#todayWorkoutTitle'), meta=q('#todayWorkoutMeta'), st=q('#todayWorkoutStatus');
    if(title)title.textContent=info.title;
    if(meta)meta.textContent=`${s.icon} ${s.title} · ${s.detail}  →  ${info.meta}`;
    if(st){st.textContent=done?'✓ выполнено':s.status;st.classList.toggle('done',done)}
    let badge=q('#shiftTodayBadge',card);
    if(!badge){badge=document.createElement('div');badge.id='shiftTodayBadge';badge.className='shift-badge';meta?.insertAdjacentElement('afterend',badge)}
    badge.textContent=`Цикл смен · день ${s.idx+1} из 8`;
    const start=q('#startTodayWorkout'), short=q('#shortTodayWorkout');
    if(!start||!short)return;
    if(s.code==='REST'){
      start.textContent=s.kind==='night'?'Ночная смена · бережём ресурс':'Открыть программу';
      short.classList.add('hidden');
    }else{
      start.textContent=done?'Посмотреть тренировку':s.code==='GLUTES'?'Начать ягодицы':s.code==='LIGHT'?'Мягко размяться':'Начать тренировку';
      const canShort=['A','B','GLUTES'].includes(s.code);short.classList.toggle('hidden',!canShort);if(canShort)short.textContent=s.code==='GLUTES'?'Короткие ягодицы':'15–20 мин';
    }
  }

  function renderHub(){
    const hub=q('#workoutHub'); if(!hub?.classList.contains('open'))return;
    const date=currentDate(), s=slotFor(date), info=W[s.code]||W.REST, done=isDone(date,s.code), hero=q('#hubTodayCard');
    if(hero){hero.innerHTML=`<div><p class="eyebrow">СЕГОДНЯ · ${s.icon} ${s.title.toUpperCase()}</p><h2>${info.title}</h2><p>${s.detail} · цикл ${s.idx+1}/8</p>${s.kind==='optional'?'<div class="shift-plan-note">Ягодичная — бонус, а не долг. Если не восстановился, спокойно пропускай.</div>':''}</div>${s.code==='REST'?'<span class="workout-big-emoji">'+s.icon+'</span>':`<button class="workout-primary" data-shift-hub-start="${s.code}">${done?'Открыть':'Начать'}</button>`}`}
    const chip=q('#workoutWeekStat');if(chip)chip.textContent='8 дней';
    const strip=q('#weekPlanStrip'); if(!strip)return;
    const sec=strip.closest('.workout-section'), h=sec?.querySelector('.workout-section-title h3'), sub=sec?.querySelector('.workout-section-title span');
    if(h)h.textContent='Цикл смен'; if(sub)sub.textContent='2 дня → 2 выходных → 2 ночи → 2 выходных';
    strip.classList.add('shift-cycle-strip');
    const cycleStart=addDays(date,-s.idx);
    strip.innerHTML=Array.from({length:8},(_,i)=>{
      const d=addDays(cycleStart,i), x=slotFor(d), wi=W[x.code]||W.REST, ok=isDone(d,x.code), active=d===date;
      const wlabel=x.code==='A'?'A':x.code==='B'?'B':x.code==='GLUTES'?'ягодицы':x.code==='LIGHT'?'восст.':'—';
      return `<button class="week-plan-day ${dayClass(x.kind)} ${active?'active':''} ${ok?'done':''}" data-shift-date="${d}" data-shift-code="${x.code}" title="${x.title}: ${wi.title}"><span>${x.short}</span><b>${x.icon}</b><small>${wlabel}</small></button>`
    }).join('');
  }

  function ensureSettings(){
    if(q('#shiftSettingsCard'))return;
    const reminder=q('#settingsScreen .reminder-card'); if(!reminder)return;
    reminder.insertAdjacentHTML('beforebegin',`<section id="shiftSettingsCard" class="card shift-settings-card"><p class="eyebrow">ГРАФИК РАБОТЫ</p><h2>8-дневный цикл</h2><p class="muted compact">Fit74 подстраивает тренировку под смену, а не под день недели.</p><div class="shift-sequence"><span>☀️ Д1</span><span>☀️ Д2</span><span>🏠 В1</span><span>🏠 В2</span><span>🌙 Н1</span><span>🌙 Н2</span><span>🏠 В1</span><span>🏠 В2</span></div><div class="shift-anchor"><b id="shiftAnchorTitle">—</b><small id="shiftAnchorText">—</small></div><div class="shift-adjust"><button data-shift-adjust="-1">← цикл на день</button><button data-shift-adjust="1">цикл на день →</button></div><p class="shift-note">Если обменяешься сменами или график съедет, сдвинь якорь на день. Тренировки пересчитаются автоматически.</p></section>`);
  }

  function renderSettings(){
    ensureSettings();
    const a=q('#shiftAnchorTitle'),t=q('#shiftAnchorText'); if(!a||!t)return;
    a.textContent=`${fmt(anchor)} — 2-й выходной`;
    t.textContent='После ночных, перед первой дневной 09:00–21:00. От этой точки повторяется весь цикл.';
  }

  function launch(code,short=false){
    if(code==='REST'){q('#openWorkoutLibrary')?.click();return}
    q('#openWorkoutLibrary')?.click();
    const go=(tries=0)=>{renderHub();const sel=short?`[data-library-short="${code}"]`:`[data-library-start="${code}"]`,btn=q(sel);if(btn){btn.click();return}if(tries<8)setTimeout(()=>go(tries+1),80)};
    setTimeout(()=>go(),60);
  }

  async function refreshSessions(){
    try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;sessions=await db(`fit74_workout_sessions?select=session_date,workout_code,completed_at&session_date=gte.${START}&session_date=lte.${END}`)||[];renderToday();renderHub()}catch(e){console.warn('shift sessions',e)}
  }

  async function loadPrefs(){
    if(prefsLoaded)return;
    try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;const rows=await db('fit74_preferences?select=shift_cycle_enabled,shift_anchor_date&limit=1');if(rows?.[0]?.shift_anchor_date){anchor=rows[0].shift_anchor_date;localStorage.setItem('fit74_shift_anchor',anchor)}prefsLoaded=true;renderSettings();renderToday();renderHub()}catch(e){console.warn('shift prefs',e)}
  }

  async function saveAnchor(){
    localStorage.setItem('fit74_shift_anchor',anchor);
    try{if(typeof user!=='undefined'&&user?.id&&typeof db==='function')await db('fit74_preferences?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:user.id,shift_cycle_enabled:true,shift_anchor_date:anchor})})}catch(e){console.warn('save shift anchor',e)}
    renderSettings();renderToday();renderHub();
  }

  document.addEventListener('click',e=>{
    const start=e.target.closest?.('#startTodayWorkout');
    if(start){e.preventDefault();e.stopImmediatePropagation();const s=slotFor(currentDate());launch(s.code,false);return}
    const short=e.target.closest?.('#shortTodayWorkout');
    if(short){e.preventDefault();e.stopImmediatePropagation();const s=slotFor(currentDate());if(['A','B','GLUTES'].includes(s.code))launch(s.code,true);return}
    const hs=e.target.closest?.('[data-shift-hub-start]');
    if(hs){e.preventDefault();e.stopImmediatePropagation();launch(hs.dataset.shiftHubStart,false);return}
    const day=e.target.closest?.('[data-shift-date]');
    if(day){e.preventDefault();e.stopImmediatePropagation();const code=day.dataset.shiftCode;if(code&&code!=='REST')launch(code,false);return}
    const adj=e.target.closest?.('[data-shift-adjust]');
    if(adj){e.preventDefault();anchor=addDays(anchor,Number(adj.dataset.shiftAdjust)||0);saveAnchor();return}
  },true);

  function tick(){loadPrefs();ensureSettings();renderSettings();renderToday();renderHub()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setInterval(tick,1200);
  setInterval(refreshSessions,10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){loadPrefs();refreshSessions();tick()}});
  setTimeout(refreshSessions,1200);
})();
