// Calendar dates, not timestamps. Independent of the 8-day shift anchor.
(()=>{
  'use strict';
  const DAY=86400000,DEFAULT_START='2026-10-19',DEFAULT_END='2026-12-31';
  function validDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1000)return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  const dayNumber=iso=>Date.parse(iso+'T12:00:00Z')/DAY;
  const addDays=(iso,n)=>new Date((dayNumber(iso)+n)*DAY).toISOString().slice(0,10);
  function create(start,end){
    if(!validDate(start)||!validDate(end))throw new Error('Укажи существующие даты в формате ДД.ММ.ГГГГ.');
    if(end<start)throw new Error('Дата окончания не может быть раньше даты начала.');
    return Object.freeze({start,end,total:dayNumber(end)-dayNumber(start)+1});
  }
  const display=iso=>validDate(iso)?iso.split('-').reverse().join('.'):'';
  const fromDisplay=value=>{const parts=String(value).trim().split('.');return parts.length===3?parts.reverse().join('-'):''};
  let current=create(DEFAULT_START,DEFAULT_END),resolveReady,loaded=false;
  const ready=new Promise(resolve=>{resolveReady=resolve});
  function update(start,end){current=create(start,end);return current}
  function publish(){loaded=true;resolveReady();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('fit74:plan-change',{detail:current}))}
  // Supabase's default page size must not truncate a longer plan's history.
  async function readRange(fetchRows,path,field,period=current){
    const rows=[],size=1000;
    for(let offset=0;;offset+=size){
      const page=await fetchRows(`${path}&${field}=gte.${period.start}&${field}=lte.${period.end}&limit=${size}&offset=${offset}`)||[];
      rows.push(...page);if(page.length<size)return rows;
    }
  }
  const api=Object.freeze({DEFAULT_START,DEFAULT_END,validDate,dayNumber,addDays,create,display,fromDisplay,update,publish,readRange,whenReady:()=>ready,get current(){return current},get loaded(){return loaded}});
  if(typeof window!=='undefined')window.Fit74PlanPeriod=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
