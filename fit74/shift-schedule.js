(()=>{
  'use strict';

  const DEFAULT_ANCHOR='2026-10-19';
  const START='2026-10-19', END='2026-12-31';
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  let anchor=localStorage.getItem('fit74_shift_anchor')||DEFAULT_ANCHOR;
  let sessions=[], overrides=new Map();
  let prefsLoaded=false, overridesLoaded=false;
  let planSnapshot=null, planObserver=null, planRestoring=false, hubObserver=null;

  const W={
    A:{title:'Тренировка A',meta:'Всё тело · 40–50 мин'},
    B:{title:'Тренировка B',meta:'🏋️ Ноги · спина · корпус · 35–45 мин'},
    GLUTES:{title:'Ягодицы',meta:'🍑 Отдельная тренировка · 35–45 мин'},
    LIGHT:{title:'Восстановление',meta:'🌿 Мягкое движение · 20–30 мин'},
    REST:{title:'Без обязательной тренировки',meta:'😌 Восстановление / свободный выбор'}
  };

  function utc(iso){const [y,m,d]=iso.split('-').map(Number);return Date.UTC(y,m-1,d)}
  function diffDays(a,b){return Math.round((utc(a)-utc(b))/86400000)}
  function addDays(iso,n){return new Date(utc(iso)+n*86400000).toISOString().slice(0,10)}
  function fmt(iso){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date(utc(iso)))}
  function fmtShort(iso){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit'}).format(new Date(utc(iso)))}
  function currentDate(){try{if(typeof selectedDate!=='undefined'&&selectedDate)return selectedDate}catch{}return START}
  function cycleParity(n){return ((n%2)+2)%2}
  function clampDate(iso){return iso<START?START:iso>END?END:iso}

  function ensureTechniqueAssets(){
    if(window.Fit74TechniqueImages)return;
    if(!q('link[data-fit74-technique]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='./technique.css?v=2';l.dataset.fit74Technique='1';document.head.appendChild(l);
    }
    if(!q('script[data-fit74-technique]')){
      const s=document.createElement('script');s.src='./technique.js?v=2';s.defer=true;s.dataset.fit74Technique='1';document.head.appendChild(s);
    }
  }

  function revealUI(force=false){
    const app=q('#appView');if(!app)return;
    if(force||(prefsLoaded&&overridesLoaded))requestAnimationFrame(()=>app.classList.add('fit74-ui-ready'));
  }

  function baseSlotFor(iso){
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

  function slotFor(iso){
    const base=baseSlotFor(iso), ov=overrides.get(iso);
    if(!ov)return base;
    if(ov.override_type==='vacation')return {...base,short:'Отп.',title:'Отпуск',detail:`без обязательств · по циклу: ${base.title.toLowerCase()}`,icon:'🏖️',code:'REST',kind:'vacation',status:'отпуск',overrideType:'vacation',base};
    return {...base,short:'Day off',title:'Day off',detail:`дополнительный выходной · по циклу: ${base.title.toLowerCase()}`,icon:'☕️',code:base.code==='REST'?'REST':base.code,kind:'dayoff',status:'day off',overrideType:'day_off',base};
  }

  function isDone(date,code){return sessions.some(s=>s.session_date===date&&s.workout_code===code&&s.completed_at)}
  function cardClass(kind){return kind==='main'?'shift-main':kind==='work'?'shift-work':kind==='night'?'shift-night':kind==='optional'?'shift-optional':kind==='vacation'?'shift-vacation':kind==='dayoff'?'shift-dayoff':'shift-recovery'}
  function dayClass(kind){return kind==='work'?'shift-workday':kind==='night'?'shift-nightday':kind==='optional'?'shift-optional':kind==='vacation'?'shift-vacation':kind==='dayoff'?'shift-dayoff':'shift-offday'}

  function renderToday(){
    const card=q('#todayWorkoutCard'); if(!card)return;
    const date=currentDate(), s=slotFor(date), info=W[s.code]||W.REST, done=s.code!=='REST'&&isDone(date,s.code);
    card.classList.remove('shift-main','shift-work','shift-night','shift-optional','shift-recovery','shift-vacation','shift-dayoff');
    card.classList.add(cardClass(s.kind));
    const title=q('#todayWorkoutTitle'), meta=q('#todayWorkoutMeta'), st=q('#todayWorkoutStatus');
    if(title)title.textContent=s.overrideType==='vacation'?'Отпуск':s.overrideType==='day_off'&&s.code==='REST'?'Свободный день':info.title;
    if(meta)meta.textContent=`${s.icon} ${s.title} · ${s.detail}  →  ${info.meta}`;
    if(st){st.textContent=done?'✓ выполнено':s.status;st.classList.toggle('done',done)}
    let badge=q('#shiftTodayBadge',card);
    if(!badge){badge=document.createElement('div');badge.id='shiftTodayBadge';badge.className='shift-badge';meta?.insertAdjacentElement('afterend',badge)}
    badge.textContent=s.overrideType?(s.overrideType==='vacation'?'Исключение · отпуск':'Исключение · Day off'):`Цикл смен · день ${s.idx+1} из 8`;
    const start=q('#startTodayWorkout'), short=q('#shortTodayWorkout');
    if(!start||!short)return;
    if(s.overrideType==='vacation'){start.textContent='Открыть тренировки по желанию';short.classList.add('hidden');}
    if(s.overrideType==='day_off'&&s.code==='REST'){start.textContent='Выбрать тренировку';short.classList.add('hidden');}
    if(s.code==='REST'){
      start.textContent=s.kind==='night'?'Ночная смена · бережём ресурс':'Открыть программу';short.classList.add('hidden');
    }else{
      start.textContent=done?'Посмотреть тренировку':s.code==='GLUTES'?'Начать ягодицы':s.code==='LIGHT'?'Мягко размяться':'Начать тренировку';
      const canShort=['A','B','GLUTES'].includes(s.code);short.classList.toggle('hidden',!canShort);if(canShort)short.textContent=s.code==='GLUTES'?'Короткие ягодицы':'15–20 мин';
    }
    const ui=window.Fit74UI;
    card.dataset.workoutCode=s.code;
    const letter=q('#todayWorkoutLetter'),description=q('#todayWorkoutDescription'),art=q('#todayWorkoutArt'),eyebrow=q('#todayWorkoutEyebrow');
    if(letter){const text=['A','B'].includes(s.code)?s.code:s.code==='GLUTES'?'Сила':s.code==='LIGHT'?'Легко':'Отдых';if(letter.textContent!==text)letter.textContent=text;letter.classList.toggle('long',!['A','B'].includes(s.code));}
    if(description&&ui){const html=ui.escape(ui.meta[s.code]||ui.meta.REST)+(ui.duration[s.code]?'<br>'+ui.duration[s.code]:'');if(description.innerHTML!==html)description.innerHTML=html;}
    if(art){const src='./assets/impulse/'+(s.code==='A'?'hero-v2':(['B','GLUTES','LIGHT'].includes(s.code)?s.code:'LIGHT').toLowerCase())+'.webp';if(art.getAttribute('src')!==src)art.src=src;}
    if(eyebrow){const pre=new Date().toISOString().slice(0,10)<START;eyebrow.textContent=pre?'СЛЕДУЮЩАЯ ТРЕНИРОВКА':s.code==='REST'?'ТВОЙ ПЛАН НА СЕГОДНЯ':'ТРЕНИРОВКА НА СЕГОДНЯ';}
    if(s.code!=='REST'&&!done)start.innerHTML='Открыть тренировку '+(ui?.icon('arrow-right')||'→');
    capturePlanSnapshot();
  }

  function renderHub(){
    const hub=q('#workoutHub'); if(!hub?.classList.contains('open'))return;
    const date=currentDate(), s=slotFor(date), info=W[s.code]||W.REST, done=s.code!=='REST'&&isDone(date,s.code), hero=q('#hubTodayCard');
    const note=s.overrideType==='vacation'?'<div class="shift-plan-note">Отпуск — это не новый KPI. Тренировка только если самому хочется.</div>':s.overrideType==='day_off'?'<div class="shift-plan-note">Day off даёт свободный слот, но не создаёт обязанность тренироваться.</div>':s.kind==='optional'?'<div class="shift-plan-note">Ягодичная — бонус, а не долг. Если не восстановился, спокойно пропускай.</div>':'';
    if(hero){
      const ui=window.Fit74UI,pre=new Date().toISOString().slice(0,10)<START;
      hero.innerHTML=`<p class="eyebrow">${pre?'СЛЕДУЮЩАЯ':'ПО ПЛАНУ'} · ${fmt(date).toUpperCase()}</p><div class="hub-recommend-copy"><span class="plan-letter ${['A','B'].includes(s.code)?'':'long'}">${['A','B'].includes(s.code)?s.code:s.code==='GLUTES'?'Сила':s.code==='LIGHT'?'Легко':'Отдых'}</span><h2>${info.title}</h2><p>${ui?.meta[s.code]||s.detail}<br>${ui?.duration[s.code]||'Свободный выбор'}</p></div>${ui?.art(s.code)||''}${note}${s.code==='REST'?'<p class="shift-plan-note">'+s.title+' · '+s.detail+'</p>':`<button class="workout-primary" data-shift-hub-start="${s.code}">Открыть тренировку ${ui?.icon('arrow-right')||'→'}</button>`}`;
    }
    const chip=q('#workoutWeekStat');if(chip)chip.textContent='8 дней';
    const strip=q('#weekPlanStrip');if(!strip)return;
    const sec=strip.closest('.workout-section'), h=sec?.querySelector('.workout-section-title h3'), sub=sec?.querySelector('.workout-section-title span');
    if(h)h.textContent='Цикл смен';if(sub)sub.textContent='2 дня → 2 выходных → 2 ночи → 2 выходных';
    strip.classList.add('shift-cycle-strip');
    const base=baseSlotFor(date), cycleStart=addDays(date,-base.idx);
    strip.innerHTML=Array.from({length:8},(_,i)=>{
      const d=addDays(cycleStart,i), x=slotFor(d), wi=W[x.code]||W.REST, ok=x.code!=='REST'&&isDone(d,x.code), active=d===date;
      const wlabel=x.overrideType==='vacation'?'отпуск':x.overrideType==='day_off'?'day off':x.code==='A'?'A':x.code==='B'?'B':x.code==='GLUTES'?'ягодицы':x.code==='LIGHT'?'восст.':'—';
      return `<button class="week-plan-day ${dayClass(x.kind)} ${active?'active':''} ${ok?'done':''}" data-shift-date="${d}" data-shift-code="${x.code}" data-shift-override="${x.overrideType||''}" title="${fmt(d)} · ${x.title}: ${wi.title}"><span>${new Date(utc(d)).toLocaleDateString('ru-RU',{weekday:'short'})}</span><b>${Number(d.slice(-2))}</b><small>${x.short}</small></button>`;
    }).join('');
  }

  function ensureSettings(){
    if(q('#shiftSettingsCard'))return;
    const reminder=q('#settingsScreen .reminder-card');if(!reminder)return;
    reminder.insertAdjacentHTML('beforebegin',`<section id="shiftSettingsCard" class="card shift-settings-card"><p class="eyebrow">ГРАФИК РАБОТЫ</p><h2>8-дневный цикл</h2><p class="muted compact">Fit74 подстраивает тренировку под смену, а не под день недели. Отпуск и Day off накладываются поверх цикла и сами его не сдвигают.</p><div class="shift-sequence"><span>☀️ Д1</span><span>☀️ Д2</span><span>🏠 В1</span><span>🏠 В2</span><span>🌙 Н1</span><span>🌙 Н2</span><span>🏠 В1</span><span>🏠 В2</span></div><div class="shift-anchor"><b id="shiftAnchorTitle">—</b><small id="shiftAnchorText">—</small></div><div class="shift-adjust"><button data-shift-adjust="-1">← цикл на день</button><button data-shift-adjust="1">цикл на день →</button></div><p class="shift-note">Сдвигай якорь только если изменился сам повторяющийся график. Для отдельных дат используй исключения ниже.</p><div class="shift-exceptions"><div class="shift-exception-head"><div><b>Исключения</b><small>отпуск и дополнительные выходные</small></div></div><div class="shift-exception-actions"><button data-exception-mode="day_off">＋ Day off</button><button data-exception-mode="vacation">＋ Отпуск</button></div><div id="shiftExceptionForm" class="shift-exception-form hidden"><div class="shift-exception-title" id="shiftExceptionTitle">Day off</div><div class="shift-date-grid"><label>Дата начала<input id="shiftExceptionStart" type="date" min="${START}" max="${END}"></label><label id="shiftExceptionEndLabel" class="range-only hidden">Дата окончания<input id="shiftExceptionEnd" type="date" min="${START}" max="${END}"></label></div><div class="shift-exception-form-actions"><button data-exception-save>Сохранить</button><button data-exception-cancel>Отмена</button></div></div><div id="shiftExceptionList" class="shift-exception-list"><div class="shift-exception-empty">Пока исключений нет.</div></div></div></section>`);
  }

  function overrideGroups(){
    const rows=[...overrides.values()].sort((a,b)=>a.work_date.localeCompare(b.work_date)),out=[];
    for(let i=0;i<rows.length;i++){
      const r=rows[i];if(r.override_type!=='vacation'){out.push({type:r.override_type,start:r.work_date,end:r.work_date});continue}
      let end=r.work_date;while(i+1<rows.length&&rows[i+1].override_type==='vacation'&&diffDays(rows[i+1].work_date,end)===1){i++;end=rows[i].work_date}out.push({type:'vacation',start:r.work_date,end});
    }
    return out;
  }
  function renderExceptionList(){
    const box=q('#shiftExceptionList');if(!box)return;const groups=overrideGroups();
    if(!groups.length){box.innerHTML='<div class="shift-exception-empty">Пока исключений нет.</div>';return}
    box.innerHTML=groups.map(g=>{const isVac=g.type==='vacation',label=isVac?'🏖️ Отпуск':'☕️ Day off',date=isVac&&g.start!==g.end?`${fmtShort(g.start)}–${fmtShort(g.end)}`:fmtShort(g.start);return `<div class="shift-exception-item"><div><b>${label}</b><small>${date}</small></div><button data-exception-delete data-type="${g.type}" data-start="${g.start}" data-end="${g.end}" aria-label="Удалить">×</button></div>`}).join('');
  }
  function renderSettings(){ensureSettings();const a=q('#shiftAnchorTitle'),t=q('#shiftAnchorText');if(a&&t){a.textContent=`${fmt(anchor)} — 2-й выходной`;t.textContent='После ночных, перед первой дневной 09:00–21:00. От этой точки повторяется весь цикл.'}renderExceptionList()}
  function openExceptionForm(mode){ensureSettings();const form=q('#shiftExceptionForm'),start=q('#shiftExceptionStart'),end=q('#shiftExceptionEnd'),endLabel=q('#shiftExceptionEndLabel'),title=q('#shiftExceptionTitle');if(!form||!start||!end)return;form.dataset.mode=mode;form.classList.remove('hidden');const d=clampDate(currentDate());start.value=d;end.value=d;const vac=mode==='vacation';endLabel?.classList.toggle('hidden',!vac);if(title)title.textContent=vac?'Отпуск':'Day off';setTimeout(()=>start.focus(),50)}
  function closeExceptionForm(){q('#shiftExceptionForm')?.classList.add('hidden')}
  async function saveException(){const form=q('#shiftExceptionForm'),start=q('#shiftExceptionStart'),end=q('#shiftExceptionEnd');if(!form||!start?.value)return;const mode=form.dataset.mode==='vacation'?'vacation':'day_off';let a=clampDate(start.value),b=mode==='vacation'?clampDate(end?.value||a):a;if(b<a)[a,b]=[b,a];const dates=[];for(let d=a;d<=b;d=addDays(d,1))dates.push(d);if(!dates.length)return;try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;const rows=dates.map(work_date=>({user_id:user.id,work_date,override_type:mode,updated_at:new Date().toISOString()}));await db('fit74_shift_overrides?on_conflict=user_id,work_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});closeExceptionForm();overridesLoaded=false;await loadOverrides(true)}catch(e){console.warn('save shift override',e)}}
  async function deleteException(type,start,end){try{if(typeof db!=='function')return;await db(`fit74_shift_overrides?override_type=eq.${encodeURIComponent(type)}&work_date=gte.${start}&work_date=lte.${end}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});overridesLoaded=false;await loadOverrides(true)}catch(e){console.warn('delete shift override',e)}}

  function launch(code,short=false){if(code==='REST'){q('#openWorkoutLibrary')?.click();return}q('#openWorkoutLibrary')?.click();const go=(tries=0)=>{renderHub();const sel=short?`[data-library-short="${code}"]`:`[data-library-start="${code}"]`,btn=q(sel);if(btn){btn.click();return}if(tries<8)setTimeout(()=>go(tries+1),80)};setTimeout(()=>go(),60)}

  async function refreshSessions(){try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;sessions=await db(`fit74_workout_sessions?select=session_date,workout_code,completed_at&session_date=gte.${START}&session_date=lte.${END}`)||[];renderToday();renderHub()}catch(e){console.warn('shift sessions',e)}}
  async function loadPrefs(){if(prefsLoaded)return;try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;const rows=await db('fit74_preferences?select=shift_cycle_enabled,shift_anchor_date&limit=1');if(rows?.[0]?.shift_anchor_date){anchor=rows[0].shift_anchor_date;localStorage.setItem('fit74_shift_anchor',anchor)}prefsLoaded=true;renderSettings();renderToday();renderHub();revealUI()}catch(e){console.warn('shift prefs',e);prefsLoaded=true;revealUI()}}
  async function loadOverrides(force=false){if(overridesLoaded&&!force)return;try{if(typeof user==='undefined'||!user?.id||typeof db!=='function')return;const rows=await db(`fit74_shift_overrides?select=work_date,override_type,note&work_date=gte.${START}&work_date=lte.${END}&order=work_date.asc`)||[];overrides=new Map(rows.map(r=>[r.work_date,r]));overridesLoaded=true;renderSettings();renderToday();renderHub();revealUI()}catch(e){console.warn('shift overrides',e);overridesLoaded=true;revealUI()}}
  async function saveAnchor(){localStorage.setItem('fit74_shift_anchor',anchor);try{if(typeof user!=='undefined'&&user?.id&&typeof db==='function')await db('fit74_preferences?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:user.id,shift_cycle_enabled:true,shift_anchor_date:anchor})})}catch(e){console.warn('save shift anchor',e)}renderSettings();renderToday();renderHub()}

  function capturePlanSnapshot(){
    const card=q('#todayWorkoutCard'),title=q('#todayWorkoutTitle'),meta=q('#todayWorkoutMeta'),status=q('#todayWorkoutStatus'),badge=q('#shiftTodayBadge'),start=q('#startTodayWorkout'),short=q('#shortTodayWorkout');
    if(!card||!title||!meta||!status||!badge||!meta.textContent.includes('→'))return false;
    planSnapshot={cardClass:card.className,title:title.textContent,meta:meta.textContent,status:status.textContent,statusClass:status.className,badge:badge.textContent,start:start?.textContent||'',startClass:start?.className||'',short:short?.textContent||'',shortClass:short?.className||''};return true;
  }
  function restorePlanSnapshot(){
    if(!planSnapshot)return;const card=q('#todayWorkoutCard'),title=q('#todayWorkoutTitle'),meta=q('#todayWorkoutMeta'),status=q('#todayWorkoutStatus'),badge=q('#shiftTodayBadge'),start=q('#startTodayWorkout'),short=q('#shortTodayWorkout');if(!card||!title||!meta||!status||!badge)return;
    planRestoring=true;if(card.className!==planSnapshot.cardClass)card.className=planSnapshot.cardClass;if(title.textContent!==planSnapshot.title)title.textContent=planSnapshot.title;if(meta.textContent!==planSnapshot.meta)meta.textContent=planSnapshot.meta;if(status.textContent!==planSnapshot.status)status.textContent=planSnapshot.status;if(status.className!==planSnapshot.statusClass)status.className=planSnapshot.statusClass;if(badge.textContent!==planSnapshot.badge)badge.textContent=planSnapshot.badge;if(start){if(start.textContent!==planSnapshot.start)start.textContent=planSnapshot.start;if(start.className!==planSnapshot.startClass)start.className=planSnapshot.startClass}if(short){if(short.textContent!==planSnapshot.short)short.textContent=planSnapshot.short;if(short.className!==planSnapshot.shortClass)short.className=planSnapshot.shortClass}planRestoring=false;
  }
  function installPlanStabilizer(){const card=q('#todayWorkoutCard');if(!card||planObserver)return;capturePlanSnapshot();planObserver=new MutationObserver(()=>{if(planRestoring)return;queueMicrotask(()=>{if(planRestoring)return;const meta=q('#todayWorkoutMeta'),badge=q('#shiftTodayBadge');if(meta?.textContent.includes('→')&&badge){capturePlanSnapshot();return}restorePlanSnapshot()})});planObserver.observe(card,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']})}
  function installHubStabilizer(){const hub=q('#workoutHub');if(!hub||hubObserver)return;hubObserver=new MutationObserver(()=>{if(!hub.classList.contains('open'))return;const strip=q('#weekPlanStrip');if(strip?.querySelector('[data-day-workout]'))queueMicrotask(renderHub)});hubObserver.observe(hub,{subtree:true,childList:true,characterData:true})}

  document.addEventListener('click',e=>{
    const open=e.target.closest?.('#openWorkoutLibrary');if(open){queueMicrotask(()=>{renderHub();installHubStabilizer()});return}
    const start=e.target.closest?.('#startTodayWorkout');if(start){e.preventDefault();e.stopImmediatePropagation();const s=slotFor(currentDate());launch(s.code,false);return}
    const short=e.target.closest?.('#shortTodayWorkout');if(short){e.preventDefault();e.stopImmediatePropagation();const s=slotFor(currentDate());if(['A','B','GLUTES'].includes(s.code))launch(s.code,true);return}
    const hs=e.target.closest?.('[data-shift-hub-start]');if(hs){e.preventDefault();e.stopImmediatePropagation();launch(hs.dataset.shiftHubStart,false);return}
    const day=e.target.closest?.('[data-shift-date]');if(day){e.preventDefault();e.stopImmediatePropagation();const code=day.dataset.shiftCode,ov=day.dataset.shiftOverride;if(ov&&code==='REST'){launch('REST',false);return}if(code&&code!=='REST')launch(code,false);return}
    const adj=e.target.closest?.('[data-shift-adjust]');if(adj){e.preventDefault();anchor=addDays(anchor,Number(adj.dataset.shiftAdjust)||0);saveAnchor();return}
    const mode=e.target.closest?.('[data-exception-mode]');if(mode){e.preventDefault();openExceptionForm(mode.dataset.exceptionMode);return}
    if(e.target.closest?.('[data-exception-cancel]')){e.preventDefault();closeExceptionForm();return}
    if(e.target.closest?.('[data-exception-save]')){e.preventDefault();saveException();return}
    const del=e.target.closest?.('[data-exception-delete]');if(del){e.preventDefault();deleteException(del.dataset.type,del.dataset.start,del.dataset.end);return}
  },true);

  window.Fit74ShiftSchedule=Object.freeze({renderToday,renderHub});
  function tick(){ensureTechniqueAssets();loadPrefs();loadOverrides();ensureSettings();renderSettings();renderToday();renderHub();installPlanStabilizer();installHubStabilizer();revealUI()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setInterval(tick,1200);
  setInterval(refreshSessions,10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){loadPrefs();loadOverrides(true);refreshSessions();tick()}});
  setTimeout(()=>{refreshSessions();loadOverrides(true)},1200);
  setTimeout(()=>revealUI(true),3500);
})();
