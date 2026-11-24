/* Fit74 2.0: small, voluntary actions; no scoring or workout escalation. */
(()=>{
'use strict';
const day=n=>Date.parse(n+'T12:00:00Z')/86400000;
const add=(d,n)=>new Date((day(d)+n)*86400000).toISOString().slice(0,10);
const min=(a,b)=>a<b?a:b;
const badges=Object.freeze([
 ['first','🌱','Первый шаг','Первый честный чек-ин'],
 ['return','↗','Снова в строю','Возвращение к действиям после перерыва'],
 ['balance','🛡️','Баланс','Осознанно выбрал бережный режим и сделал чек-ин'],
 ['night','🌙','Ночной ритм','Чек-ин в день ночной смены или восстановления'],
 ['honest','🧭','Честность','Отметил обстоятельства сложного дня'],
 ['distance','🏔️','Дистанция','30 действительно зачтённых дней']
]);
function state({rows=[],entries=[],start,end,today,shift={}}){
 const map=new Map(rows.map(r=>[r.entry_date,r])), current=map.get(today)||{};
 const inPlan=today>=start&&today<=end;
 const prior=rows.filter(r=>r.visited&&r.entry_date<today&&r.entry_date>=start).map(r=>r.entry_date)
  .concat(entries.filter(e=>e.entry_date<today&&e.entry_date>=start).map(e=>e.entry_date)).sort().pop();
 const pauses=new Set(rows.filter(r=>r.paused&&r.entry_date>=start&&r.entry_date<=end).map(r=>r.entry_date));
 const paused=inPlan&&pauses.has(today);
 let gap=0;
 if(prior)for(let d=add(prior,1);d<today;d=add(d,1))if(d>=start&&!pauses.has(d))gap++;
 const last=rows.filter(r=>r.restart_stage!=null&&r.entry_date>=start&&r.entry_date<=today).sort((a,b)=>b.entry_date.localeCompare(a.entry_date))[0];
 const stage=inPlan?Number(last?.restart_stage||0):0;
 const suggestion=inPlan&&!paused&&!stage&&!current.dismissed&&current.restart_stage!==0&&(gap>=3);
 const energy=current.energy||null;
 const shiftKind=shift.kind||'';
 const restShift=['work','night','recovery','vacation'].includes(shiftKind)||shift.code==='REST';
 const gentle=paused||energy==='low'||stage===1||stage===2||restShift;
 const mode=paused?'pause':energy==='low'||stage===1||['night','recovery'].includes(shiftKind)?'rest':stage===2?'light':'regular';
 const steps=paused?['Отдохни в своём темпе','Плановые напоминания на паузе']:
 mode==='rest'?['Регулярное питание без компенсаций','Сон и отдых по самочувствию','Короткий чек-ин, если удобно']:
 mode==='light'?['Обычный режим питания','Посильное движение, если комфортно','Короткий чек-ин']:
 ['Обычное регулярное питание',restShift?'Отдых или лёгкая активность по графику':'Запланированная тренировка — только если самочувствие позволяет','Чек-ин в удобное время'];
 const title=paused?'Пауза без потери истории':mode==='rest'?'День восстановления':mode==='light'?'Мягкое движение':energy==='high'&&!restShift?'Есть силы — держим план':'Комфортный ритм';
 const coach=paused?'Сегодня ничего не нужно закрывать. Возобновить план можно в любой момент.':
 ['night','recovery'].includes(shiftKind)?'После ночной смены важнее восстановление. Даже если есть силы, не добавляем тяжёлую тренировку.':
 stage===1?'Начни с регулярных приёмов пищи, отдыха и одного небольшого действия. Не нужно наверстывать пропущенное.':
 stage===2?'Если тебе комфортно, верни немного движения. Можно остаться на этом этапе столько, сколько нужно.':
 stage===3?'Возвращайся к привычному плану постепенно. Пропущенные тренировки не нужно компенсировать.':
 energy==='low'?'Сегодня можно выбрать отдых. Следующий обычный приём пищи и короткая отметка уже могут быть хорошим началом.':
 suggestion?'Ты снова здесь. Предлагаю мягкий перезапуск вместо попытки закрыть все пропущенные дни.':
 current.micro_checkin?'Сегодня ты уже на связи. Продолжай в своём темпе, без обязательного идеального результата.':
 'Выбери посильный шаг. План зависит от самочувствия и твоего рабочего графика.';
 let until=today;
 if(paused)while(until<end&&pauses.has(add(until,1)))until=add(until,1);
 return {inPlan,paused,until,pauses,stage,stageDate:last?.entry_date||null,energy,gap,suggestion,gentle,mode,title,steps,coach,checked:!!current.micro_checkin,night:['night','recovery'].includes(shiftKind)};
}
function earn({state:s,entries=[],rows=[],contexts=[],stable,returns=0}){
 const result=[];
 if(rows.some(r=>r.micro_checkin)||entries.some(e=>stable(e)))result.push('first');
 if(returns>0||(s.gap>=3&&s.checked))result.push('return');
 if(rows.some(r=>r.energy==='low'&&r.micro_checkin))result.push('balance');
 if(s.night&&s.checked)result.push('night');
 if(contexts.some(r=>!!r.reason))result.push('honest');
 if(entries.filter(e=>stable(e)&&!s.pauses.has(e.entry_date)).length>=30)result.push('distance');
 return result;
}
window.Fit74RhythmCore=Object.freeze({state,earn,add,day,min,badges});
})();