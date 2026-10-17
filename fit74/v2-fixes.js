function effectiveEntries(){
  const map=new Map(entries.map(e=>[e.entry_date,e]));
  let localDirty=false;
  try{localDirty=!!JSON.parse(localStorage.getItem('fit74:'+user.id+':'+selectedDate)||'null')?.dirty}catch{}
  const meaningful=score(draft)>0||draft.weight_kg||draft.mood||(draft.notes||'').trim()||localDirty;
  if(map.has(selectedDate)||meaningful){
    map.set(selectedDate,{...(map.get(selectedDate)||{}),...payload(),score:score(draft)});
  }
  return [...map.values()];
}

function streaks(){
  const now=todayISO();
  const past=effectiveEntries().filter(e=>e.entry_date<=now);
  const map=new Map(past.map(e=>[e.entry_date,Number(e.score??score(e))]));
  let best=0,run=0;
  for(let i=0;i<TOTAL;i++){
    const d=addDays(START,i);
    if(d>now)break;
    if((map.get(d)||0)>=5){run++;best=Math.max(best,run)}else run=0;
  }
  if(now<START)return{cur:0,best};
  let a=clamp(now);
  if(!map.has(a)&&a>START)a=addDays(a,-1);
  let cur=0;
  while(a>=START&&(map.get(a)||0)>=5){cur++;a=addDays(a,-1)}
  return{cur,best};
}

function renderSummary(){
  const now=todayISO(),list=effectiveEntries().filter(e=>e.entry_date<=now),{cur,best}=streaks();
  const good=list.filter(e=>Number(e.score??score(e))>=5).length;
  const strong=list.filter(e=>Number(e.score??score(e))>=8).length;
  $('#streakText').textContent='Серия: '+cur+' '+plural(cur,'день','дня','дней');
  $('#currentStreak').textContent=cur;$('#bestStreak').textContent=best;$('#strongDays').textContent=strong;$('#completedStat').textContent=good+'/'+TOTAL;
}

function weekEntries(iso){
  const[s,e]=weekBounds(iso),now=todayISO();
  return effectiveEntries().filter(x=>x.entry_date>=s&&x.entry_date<=e&&x.entry_date<=now);
}

function renderWeeklyGoals(){
  const focus=clamp(todayISO()),[s,e]=weekBounds(focus),list=weekEntries(focus);
  const workouts=list.filter(x=>x.workout).length,nutrition=list.filter(x=>Number(x.nutrition)===2).length,water=list.filter(x=>x.water).length;
  const gw=Number(prefs.weekly_workout_goal??2),gn=Number(prefs.weekly_nutrition_goal??5),gwater=Number(prefs.weekly_water_goal??6);
  $('#goalWorkoutCount').textContent=workouts+'/'+gw;$('#goalNutritionCount').textContent=nutrition+'/'+gn;$('#goalWaterCount').textContent=water+'/'+gwater;
  $('#goalWorkoutBar').style.width=pct(workouts,gw)+'%';$('#goalNutritionBar').style.width=pct(nutrition,gn)+'%';$('#goalWaterBar').style.width=pct(water,gwater)+'%';
  const now=todayISO(),daysSoFar=now<START?0:Math.min(7,diff(s,focus)+1),good=list.filter(x=>Number(x.score??score(x))>=5).length,stability=daysSoFar?Math.round(good/daysSoFar*100):0;
  $('#weekStability').textContent=stability+'% стабильности';
  let note='Неделя ещё впереди — без форсажа.';
  if(now>=START){const remaining=Math.max(0,diff(focus,e));note=remaining?('До конца недели '+remaining+' '+plural(remaining,'день','дня','дней')+'. Держим ровный темп.'):'Неделя закрывается сегодня. Никаких догонялок.'}
  $('#weekNote').textContent=note;
}
