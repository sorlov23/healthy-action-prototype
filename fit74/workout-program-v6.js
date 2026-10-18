(()=>{
'use strict';
const VERSION='6.0';
const START='2026-10-19',END='2026-12-31';
const ASSET='./assets/v6/';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtShort=iso=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit'}).format(new Date(iso+'T12:00:00'))}catch{return iso}};
const clock=sec=>`${String(Math.floor(Math.max(0,sec)/60)).padStart(2,'0')}:${String(Math.max(0,sec)%60).padStart(2,'0')}`;

const GENERAL_WARMUP=[
  ['Лёгкое вело','3–4 мин','Спокойный темп, без спринтов.','warmup-bike'],
  ['Круги плечами','10 раз','Большие мягкие круги назад, затем вперёд.','shoulder-circles'],
  ['Круги тазом','10 раз','Небольшая контролируемая амплитуда.','hip-circles'],
  ['Кошка-корова','6 повторов','Плавно прогни и округли спину, без резких движений.','cat-cow'],
  ['Ягодичный мост без веса','10 повторов','Сожми ягодицы наверху, не прогибай поясницу.','glute-bridge'],
  ['Присед к стулу без веса','10 повторов','Стул — ориентир глубины. Колени по линии носков.','chair-squat-warmup']
];
const GENERAL_COOLDOWN=[
  ['Спокойное дыхание','1–2 мин','Дыши медленно, без задержек.','breathing'],
  ['Лёгкая ходьба или вело','2–3 мин','Постепенно снизь пульс.','easy-bike-walk'],
  ['Растяжка ягодиц','20–30 сек / сторона','Без боли и пружинящих движений.','stretch-glute'],
  ['Растяжка сгибателей бедра','20–30 сек / сторона','Таз слегка подкручен, поясница спокойна.','stretch-hip-flexor'],
  ['Мягкая растяжка груди у стены','20–30 сек / сторона','Ладонь на стене, разворот корпуса без боли. Резинка не нужна.','chest-wall-stretch']
];

const P={
  A:{code:'A',title:'Тренировка A',subtitle:'Основная силовая · по утверждённой программе',duration:'40–50 мин',kind:'strength',emoji:'🏋️',warmup:GENERAL_WARMUP,exercises:[
    {id:'a_squat',name:'Присед к стулу с гантелью у груди',sets:3,reps:'10–12',rest:75,asset:'chair-goblet-squat',tip:'Садись контролируемо; стул — ориентир глубины.',cues:['Стопы примерно на ширине плеч.','Гантель держи у груди.','Таз уходит назад к стулу.','Колени идут по линии носков.']},
    {id:'a_floor_press',name:'Жим гантелей лёжа на полу',sets:3,reps:'10–12',rest:75,asset:'floor-dumbbell-press',tip:'Локти примерно под 45°, поясницу не выгибай.',cues:['Лопатки спокойно лежат на полу.','Локти не разводи строго в стороны.','Жми гантели вверх без рывка.','Опускай под контролем.']},
    {id:'a_row',name:'Тяга гантели в наклоне с опорой на стул',sets:3,reps:'10–12 / сторона',rest:60,asset:'one-arm-row-chair',tip:'Тяни локоть назад, шею не зажимай.',cues:['Опора устойчива.','Спина нейтральная.','Локоть движется к тазу.','Не разворачивай корпус.']},
    {id:'a_bridge',name:'Ягодичный мост',sets:3,reps:'12–15',rest:60,asset:'glute-bridge',tip:'Поднимай таз ягодицами, не прогибом в пояснице.',cues:['Стопы полностью на полу.','Подкрути таз.','Сожми ягодицы наверху на 1 секунду.','Опускайся медленно.']},
    {id:'a_bird_dog',name:'Птица-собака (bird-dog)',sets:3,reps:'8 / сторона',rest:45,asset:'bird-dog',tip:'В карточке — 2–3 подхода. Третий делай только с чистой техникой.',cues:['Ладони под плечами, колени под тазом.','Не разворачивай таз.','Тянись рукой и противоположной ногой.','Поясница остаётся нейтральной.']},
    {id:'a_side_plank',name:'Боковая планка с колен',sets:2,reps:'20–30 сек / сторона',rest:45,asset:'side-plank-knee',tip:'Корпус одной линией, без провисания.',cues:['Локоть под плечом.','Нижнее колено на полу.','Подними таз и держи ровно.','Дыши спокойно.']}
  ],cooldown:GENERAL_COOLDOWN},
  B:{code:'B',title:'Тренировка B',subtitle:'Умеренная силовая · по утверждённой программе',duration:'35–45 мин',kind:'strength',emoji:'🏋️',warmup:GENERAL_WARMUP,exercises:[
    {id:'b_split',name:'Сплит-присед с задней ногой на стуле',sets:3,reps:'8–10 / нога',rest:75,asset:'split-squat-chair',tip:'Держись за опору при необходимости.',cues:['Передняя стопа полностью на полу.','Опускайся вниз, а не вперёд.','Колено передней ноги по линии носка.','Работай без боли и потери баланса.']},
    {id:'b_push',name:'Отжимания от стула / высокой опоры',sets:3,reps:'8–12',rest:75,asset:'incline-pushup-chair',tip:'Чем выше опора, тем легче.',cues:['Корпус одной линией.','Локти идут назад под комфортным углом.','Грудь тянется к опоре.','Не проваливай поясницу.']},
    {id:'b_row',name:'Тяга гантели к поясу с опорой на стул',sets:3,reps:'10–12 / сторона',rest:60,asset:'one-arm-row-chair',tip:'Не округляй спину, локоть веди к тазу.',cues:['Опирайся свободной рукой на стул.','Спина нейтральная.','Не поднимай плечо к уху.','Опускай гантель под контролем.']},
    {id:'b_bridge',name:'Ягодичный мост с паузой 2 сек',sets:3,reps:'12–15',rest:60,asset:'glute-bridge',tip:'Задержись в верхней точке на 2 секунды.',cues:['Подкрути таз.','Сожми ягодицы наверху.','Рёбра не выпячивай.','Не переразгибай поясницу.']},
    {id:'b_dead_bug',name:'Мёртвый жук (dead bug)',sets:3,reps:'8 / сторона',rest:45,asset:'dead-bug',tip:'В карточке — 2–3 подхода. Поясница прижата, движения медленные.',cues:['Поясница остаётся прижатой.','Двигай противоположные руку и ногу.','Не спеши.','Уменьши амплитуду, если поясница отрывается.']},
    {id:'b_calf',name:'Подъёмы на носки стоя',sets:3,reps:'15–20',rest:45,asset:'calf-raise',tip:'В карточке — 2–3 подхода. Поднимайся плавно, не раскачивайся.',cues:['Стой ровно.','Можно держаться за стул.','Поднимись на носки плавно.','Опускай пятки под контролем.']}
  ],cooldown:GENERAL_COOLDOWN},
  CARDIO:{code:'CARDIO',title:'Кардио + корпус + растяжка',subtitle:'День 4 из карточки программы',duration:'30–40 мин',kind:'cardio',emoji:'🚴',warmup:[],exercises:[
    {id:'c_bird',name:'Птица-собака',sets:2,reps:'8 / сторона',rest:30,asset:'bird-dog',tip:'Первое упражнение круга корпуса.',cues:['Таз ровный.','Движение медленное.']},
    {id:'c_side',name:'Боковая планка с колен',sets:2,reps:'20 сек / сторона',rest:30,asset:'side-plank-knee',tip:'Второе упражнение круга корпуса.',cues:['Локоть под плечом.','Таз не проваливай.']},
    {id:'c_bridge',name:'Ягодичный мост',sets:2,reps:'12',rest:30,asset:'glute-bridge',tip:'Третье упражнение круга корпуса.',cues:['Сожми ягодицы наверху.','Поясница спокойна.']}
  ],preTimer:{id:'cardio_main',name:'Велотренажёр',target:'25–35 мин',seconds:1500,asset:'cardio-bike',tip:'Комфортный разговорный темп. Если устал — сократи до 20–25 минут.'},cooldown:[
    ['Растяжка ягодиц','20–30 сек / сторона','Без боли.','stretch-glute'],
    ['Растяжка сгибателей бедра','20–30 сек / сторона','Плавно, без рывков.','stretch-hip-flexor'],
    ['Открытие грудного отдела','20–30 сек / сторона','Двигайся мягко.','stretch-thoracic']
  ]},
  LIGHT:{code:'LIGHT',title:'Восстановление',subtitle:'После ночных · без тяжёлой нагрузки',duration:'20–30 мин',kind:'light',emoji:'🌿',warmup:[],exercises:[],preTimer:{id:'recovery',name:'Очень лёгкое вело или прогулка',target:'15–20 мин',seconds:900,asset:'warmup-bike',tip:'Темп максимально лёгкий. Цель — восстановиться, а не тренироваться.'},cooldown:[
    ['Кошка-корова','6 повторов','Плавно прогни и округли спину.','cat-cow'],
    ['Растяжка сгибателей бедра','20–30 сек / сторона','Без боли.','stretch-hip-flexor'],
    ['Мягкая растяжка груди у стены','20–30 сек / сторона','Резинка не нужна.','chest-wall-stretch']
  ]},
  GLUTES:{code:'GLUTES',title:'Ягодицы',subtitle:'Отдельная домашняя тренировка · без резинок',duration:'30–35 мин',kind:'strength',emoji:'🍑',warmup:[
    ['Лёгкое вело','3 мин','Спокойно разогрейся.','warmup-bike'],
    ['Кошка-корова','6 повторов','Плавно, без резких движений.','cat-cow'],
    ['Круги тазом','10 раз','Контролируемая амплитуда.','hip-circles'],
    ['Присед к стулу без веса','10 повторов','Мягко разогрей колени и таз.','chair-squat-warmup']
  ],exercises:[
    {id:'g_bridge',name:'Ягодичный мост',sets:3,reps:'15–20',rest:45,asset:'glute-bridge',tip:'Главная цель — сжатие ягодиц наверху.',cues:['Стопы на полу.','Подкрути таз.','Сожми ягодицы на секунду.','Опускайся медленно.']},
    {id:'g_frog',name:'Фрог-памп',sets:3,reps:'20–25',rest:45,asset:'frog-pump',tip:'Подошвы вместе, колени раскрыты наружу.',cues:['Ляг на спину.','Соедини подошвы.','Подтяни пятки ближе к тазу.','Поднимай таз ягодицами, не поясницей.']},
    {id:'g_lunge',name:'Выпады назад с акцентом на ягодицы',sets:3,reps:'10–12 / нога',rest:60,asset:'reverse-lunge-glute',tip:'Небольшой наклон корпуса вперёд допустим.',cues:['Длинный шаг назад.','Передняя стопа полностью на полу.','Колено по линии носка.','Вставай через переднюю ногу.']},
    {id:'g_donkey',name:'Мах назад на четвереньках',sets:3,reps:'12–15 / нога',rest:45,asset:'donkey-kick',tip:'Не раскручивай таз и не прогибай поясницу.',cues:['Ладони под плечами.','Колено согнуто.','Толкай пятку вверх.','Таз остаётся ровным.']},
    {id:'g_hydrant',name:'Пожарный гидрант',sets:3,reps:'12–15 / нога',rest:45,asset:'fire-hydrant',tip:'Колено уходит в сторону, корпус остаётся стабильным.',cues:['Ладони под плечами.','Подними колено в сторону.','Не разворачивай таз.','Двигайся медленно.']},
    {id:'g_abduction',name:'Отведение ноги лёжа на боку',sets:3,reps:'15–20 / сторона',rest:45,asset:'side-abduction',tip:'Носок смотрит вперёд, таз не заваливается назад.',cues:['Ляг на бок.','Нижнюю ногу можно согнуть.','Верхнюю поднимай без разворота таза.','Опускай медленно.']}
  ],cooldown:[
    ['Растяжка ягодиц','20–30 сек / сторона','Мягко, без боли.','stretch-glute'],
    ['Растяжка сгибателей бедра','20–30 сек / сторона','Без пружинящих движений.','stretch-hip-flexor']
  ]}
};

let active=null,ticker=null,syncTimer=null,sessions=[];
function currentDate(){try{if(typeof selectedDate!=='undefined'&&selectedDate)return selectedDate}catch{}return START}
function programForTitle(){const t=q('#todayWorkoutTitle')?.textContent||'';if(/Тренировка A/.test(t))return'A';if(/Тренировка B/.test(t))return'B';if(/Ягодиц/.test(t))return'GLUTES';if(/Восстанов/.test(t))return'LIGHT';return null}
async function loadSessions(){try{sessions=await db(`fit74_workout_sessions?select=*&session_date=gte.${START}&session_date=lte.${END}&order=session_date.desc,created_at.desc`)||[]}catch(e){console.warn('Fit74 v6 sessions',e);sessions=[]}}
function sessionFor(date,code){return sessions.find(s=>s.session_date===date&&s.workout_code===code)}
function freshProgress(short=false){return{program_version:VERSION,step:0,sets:{},doneSimple:{},timerRemaining:{},short}}
function visual(asset,title){if(!asset)return'';return `<section class="v6-visual"><div class="v6-visual-label">ВИЗУАЛЬНАЯ ТЕХНИКА</div><img src="${ASSET}${asset}.webp" alt="${esc(title)}" loading="eager" decoding="async"></section>`}
function buildSteps(w,short){const out=[];const warm=short?w.warmup.slice(0,Math.min(3,w.warmup.length)):w.warmup;warm.forEach((x,i)=>out.push({type:'simple',section:'Разминка',id:'warm_'+i,name:x[0],target:x[1],tip:x[2],asset:x[3]}));if(w.preTimer){out.push({type:'timer',section:w.kind==='cardio'?'Кардио':'Восстановление',...w.preTimer,seconds:short?Math.min(600,w.preTimer.seconds):w.preTimer.seconds,target:short?'10 мин':w.preTimer.target})}w.exercises.forEach(ex=>out.push({type:'exercise',section:'Основная часть',exercise:{...ex,sets:short?Math.min(2,ex.sets):ex.sets}}));const cool=short?w.cooldown.slice(0,Math.min(2,w.cooldown.length)):w.cooldown;cool.forEach((x,i)=>out.push({type:'simple',section:'Заминка',id:'cool_'+i,name:x[0],target:x[1],tip:x[2],asset:x[3]}));return out}

async function start(code,short=false,date=currentDate()){
  const w=P[code];if(!w)return;
  await loadSessions();const existing=sessionFor(date,code);let progress=existing?.progress&&existing.progress.program_version===VERSION?structuredClone(existing.progress):freshProgress(short);progress.short=short||!!progress.short;progress.step=Number(progress.step)||0;progress.sets=progress.sets||{};progress.doneSimple=progress.doneSimple||{};progress.timerRemaining=progress.timerRemaining||{};
  active={code,date,w,short:progress.short,progress,existing,startedAt:existing?.started_at?new Date(existing.started_at).getTime():Date.now()};
  q('#workoutHub')?.classList.remove('open');q('#workoutHub')?.setAttribute('aria-hidden','true');q('#workoutPlayer')?.classList.add('open');q('#workoutPlayer')?.setAttribute('aria-hidden','false');document.body.classList.add('workout-lock');
  ensureResetButton();render();
}
function ensureResetButton(){const head=q('#workoutPlayer .player-header');if(!head||q('#v6ResetWorkout'))return;const b=document.createElement('button');b.id='v6ResetWorkout';b.className='v6-reset-chip';b.textContent='Сбросить';b.onclick=()=>resetActive();head.appendChild(b)}
function close(){stopTimer();q('#workoutPlayer')?.classList.remove('open');q('#workoutPlayer')?.setAttribute('aria-hidden','true');document.body.classList.remove('workout-lock');active=null}
function render(){if(!active)return;const steps=buildSteps(active.w,active.short);if(!steps.length)return;active.progress.step=Math.max(0,Math.min(active.progress.step,steps.length-1));const idx=active.progress.step,step=steps[idx];q('#playerKicker').textContent=`${step.section} · ${idx+1}/${steps.length}`;q('#playerWorkoutTitle').textContent=active.w.title+(active.short?' · сокращённая':'');q('#playerProgress').style.width=Math.round((idx/Math.max(1,steps.length-1))*100)+'%';const shortBtn=q('#toggleShortMode');if(shortBtn){shortBtn.textContent=active.short?'полная':'15–20 мин';shortBtn.classList.toggle('hidden',!['strength'].includes(active.w.kind))}const body=q('#playerBody');if(step.type==='exercise')body.innerHTML=exerciseHTML(step.exercise);else if(step.type==='timer')body.innerHTML=timerHTML(step);else body.innerHTML=simpleHTML(step);q('#playerPrev').disabled=idx===0;q('#playerNext').textContent=idx===steps.length-1?'Завершить ✓':'Дальше →';bind(step);scheduleSave()}
function exerciseHTML(ex){const done=active.progress.sets[ex.id]||[];return `<div class="player-section-label">${active.w.emoji} ${esc(active.w.subtitle)}</div><div class="exercise-hero"><div class="exercise-number">${done.length}/${ex.sets}</div><div><h3>${esc(ex.name)}</h3><p class="exercise-target">${ex.sets} подхода · ${esc(ex.reps)}</p></div></div><p class="exercise-tip">${esc(ex.tip)}</p>${visual(ex.asset,ex.name)}<div class="set-buttons">${Array.from({length:ex.sets},(_,i)=>`<button data-v6-set="${i+1}" class="${done.includes(i+1)?'done':''}"><span>${done.includes(i+1)?'✓':i+1}</span><small>подход</small></button>`).join('')}</div><details class="technique"><summary>Как делать · техника</summary><ol>${(ex.cues||[]).map(c=>`<li>${esc(c)}</li>`).join('')}</ol></details>${ex.rest?`<p class="rest-note">Отдых между подходами: ${ex.rest} сек</p>`:''}`}
function simpleHTML(s){const done=!!active.progress.doneSimple[s.id];return `<div class="simple-step"><div class="simple-icon">${s.section==='Разминка'?'🔥':'🧘'}</div><p class="eyebrow">${esc(s.section)}</p><h3>${esc(s.name)}</h3><div class="simple-target">${esc(s.target)}</div><p class="exercise-tip">${esc(s.tip||'')}</p>${visual(s.asset,s.name)}<button id="v6SimpleDone" class="workout-primary ${done?'done':''}">${done?'✓ Выполнено — отменить':'Отметить выполненным'}</button></div>`}
function timerHTML(s){const saved=Number(active.progress.timerRemaining[s.id]),remain=Number.isFinite(saved)&&saved>0?saved:s.seconds;return `<div class="simple-step timer-step"><div class="simple-icon">⏱</div><p class="eyebrow">${esc(s.section)}</p><h3>${esc(s.name)}</h3><div id="v6TimerValue" class="phase-timer-value" data-seconds="${remain}">${clock(remain)}</div><p class="simple-target">${esc(s.target)}</p><p class="exercise-tip">${esc(s.tip||'')}</p>${visual(s.asset,s.name)}<button id="v6TimerBtn" class="workout-primary">Старт таймера</button><button id="v6TimerDone" class="workout-secondary">Готово без таймера</button></div>`}
function bind(step){qa('[data-v6-set]',q('#playerBody')).forEach(b=>b.onclick=()=>{const n=Number(b.dataset.v6Set),id=step.exercise.id,arr=active.progress.sets[id]||[],ix=arr.indexOf(n);if(ix>=0)arr.splice(ix,1);else{arr.push(n);arr.sort((a,b)=>a-b)}active.progress.sets[id]=arr;scheduleSave();render()});q('#v6SimpleDone')?.addEventListener('click',()=>{active.progress.doneSimple[step.id]=!active.progress.doneSimple[step.id];scheduleSave();render()});q('#v6TimerBtn')?.addEventListener('click',()=>startTimer(step));q('#v6TimerDone')?.addEventListener('click',()=>{active.progress.doneSimple[step.id]=true;scheduleSave();next()})}
function stopTimer(){if(ticker)clearInterval(ticker);ticker=null}
function startTimer(step){stopTimer();const val=q('#v6TimerValue'),btn=q('#v6TimerBtn');let n=Number(val?.dataset.seconds)||step.seconds;btn.textContent='Пауза';ticker=setInterval(()=>{n--;if(val){val.textContent=clock(n);val.dataset.seconds=n}active.progress.timerRemaining[step.id]=n;if(n%10===0)scheduleSave();if(n<=0){stopTimer();active.progress.doneSimple[step.id]=true;scheduleSave();btn.textContent='Готово ✓'}},1000);btn.onclick=()=>{stopTimer();btn.textContent='Продолжить';btn.onclick=()=>startTimer(step)}}
function prev(){if(!active||active.progress.step<=0)return;stopTimer();active.progress.step--;render()}
function next(){if(!active)return;const steps=buildSteps(active.w,active.short);if(active.progress.step>=steps.length-1){finish();return}stopTimer();active.progress.step++;render()}
function toggleShort(){if(!active||active.w.kind!=='strength')return;active.short=!active.short;active.progress.short=active.short;active.progress.step=0;scheduleSave();render()}
async function save(completed=false){if(!active)return;try{if(typeof user==='undefined'||!user?.id)return;const body={user_id:user.id,session_date:active.date,workout_code:active.code,started_at:new Date(active.startedAt).toISOString(),progress:active.progress,updated_at:new Date().toISOString()};if(completed){body.completed_at=new Date().toISOString();body.duration_seconds=Math.max(60,Math.round((Date.now()-active.startedAt)/1000))}await db('fit74_workout_sessions?on_conflict=user_id,session_date,workout_code',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});await loadSessions()}catch(e){console.warn('Fit74 v6 save',e)}}
function scheduleSave(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>save(false),350)}
async function finish(){stopTimer();await save(true);try{if(typeof selectedDate!=='undefined'&&active.date===selectedDate&&typeof draft!=='undefined'){draft.workout=true;typeof dirty==='function'&&dirty();typeof saveRemote==='function'&&await saveRemote();typeof renderAll==='function'&&renderAll()}}catch(e){console.warn('Fit74 v6 daily mark',e)}const title=active.w.title;q('#playerBody').innerHTML=`<div class="workout-finish"><div class="finish-check">✓</div><p class="eyebrow">ТРЕНИРОВКА ЗАВЕРШЕНА</p><h2>${esc(title)}</h2><p>Прогресс сохранён. Если это была случайная отметка — сверху есть «Сбросить».</p><button id="v6FinishClose" class="workout-primary">Готово</button></div>`;q('#playerProgress').style.width='100%';q('#playerPrev').disabled=true;q('#playerNext').disabled=true;q('#v6FinishClose').onclick=()=>location.reload()}
async function resetActive(){if(!active)return;const ok=window.confirm(`Сбросить прогресс «${active.w.title}» за ${fmtShort(active.date)}?\n\nУдалятся отмеченные подходы и статус «выполнено».`);if(!ok)return;await resetSession(active.date,active.code)}
async function resetSession(date,code){try{if(typeof user==='undefined'||!user?.id)return;await db(`fit74_workout_sessions?user_id=eq.${encodeURIComponent(user.id)}&session_date=eq.${date}&workout_code=eq.${code}`,{method:'DELETE'});await loadSessions();if(!sessions.some(s=>s.session_date===date&&s.completed_at)){try{if(typeof selectedDate!=='undefined'&&date===selectedDate&&typeof draft!=='undefined'){draft.workout=false;typeof dirty==='function'&&dirty();typeof saveRemote==='function'&&await saveRemote()}}catch(e){console.warn('Fit74 v6 reset daily mark',e)}}location.reload()}catch(e){console.error(e);alert('Не удалось сбросить прогресс. Попробуй ещё раз.') }}

function resolveClick(target){const el=target.closest?.('button');if(!el)return null;let code=null,date=currentDate(),short=false;if(el.id==='startTodayWorkout'){code=programForTitle()}else if(el.id==='shortTodayWorkout'){code=programForTitle();short=true}else if(el.dataset.libraryStart){code=el.dataset.libraryStart}else if(el.dataset.libraryShort){code=el.dataset.libraryShort;short=true}else if(el.dataset.shiftHubStart){code=el.dataset.shiftHubStart}else if(el.dataset.hubStart){code=el.dataset.hubStart}else if(el.dataset.shiftCode){code=el.dataset.shiftCode;date=el.dataset.shiftDate||date}else if(el.dataset.dayWorkout){code=el.dataset.dayWorkout;date=el.dataset.dayDate||date}return code&&P[code]?{code,date,short}:null}
document.addEventListener('click',e=>{if(q('#workoutPlayer')?.classList.contains('open')&&active){const b=e.target.closest?.('button');if(!b)return;if(b.id==='playerPrev'){e.preventDefault();e.stopImmediatePropagation();prev()}else if(b.id==='playerNext'){e.preventDefault();e.stopImmediatePropagation();next()}else if(b.id==='toggleShortMode'){e.preventDefault();e.stopImmediatePropagation();toggleShort()}else if(b.id==='closeWorkoutPlayer'){e.preventDefault();e.stopImmediatePropagation();if(window.confirm('Выйти из тренировки? Прогресс сохранится.'))close()}return}const r=resolveClick(e.target);if(r){e.preventDefault();e.stopImmediatePropagation();start(r.code,r.short,r.date)}},true);

function syncLibrary(){const lib=q('#strengthLibrary');if(lib){qa('.workout-library-card',lib).forEach(card=>{const t=card.querySelector('h4')?.textContent||'';if(/Смешанный день|Длинное кардио/.test(t))card.remove()});const title=lib.closest('.workout-section')?.querySelector('.workout-section-title h3');if(title)title.textContent='Программа'}enhanceHistory()}
async function enhanceHistory(){const box=q('#workoutHistory');if(!box)return;if(!sessions.length)await loadSessions();const done=sessions.filter(s=>s.completed_at).slice(0,8);qa('.workout-history-item',box).forEach((row,i)=>{if(row.querySelector('.v6-history-reset')||!done[i])return;const b=document.createElement('button');b.className='v6-history-reset';b.textContent='↺';b.title='Сбросить прогресс';b.onclick=e=>{e.stopPropagation();const s=done[i];if(window.confirm(`Сбросить ${s.workout_code} за ${fmtShort(s.session_date)}?`))resetSession(s.session_date,s.workout_code)};row.appendChild(b)})}
function install(){loadSessions();syncLibrary();setInterval(syncLibrary,900);const mo=new MutationObserver(()=>syncLibrary());mo.observe(document.body,{subtree:true,childList:true});window.Fit74ProgramV6={version:VERSION,programs:P,start,resetSession}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();