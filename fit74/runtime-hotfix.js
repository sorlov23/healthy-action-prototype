(()=>{
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const WEEKDAYS=new Set(['Пн','Вт','Ср','Чт','Пт','Сб','Вс']);
  let observer=null, correcting=false;

  function loadTechnique(){
    if(!q('link[data-fit74-technique]')){
      const l=document.createElement('link');
      l.rel='stylesheet';l.href='./technique.css?v=2';l.dataset.fit74Technique='1';
      document.head.appendChild(l);
    }
    if(!q('script[data-fit74-technique]')){
      const s=document.createElement('script');
      s.src='./technique.js?v=2';s.defer=true;s.dataset.fit74Technique='1';
      document.body.appendChild(s);
    }
  }

  function looksLikeLegacyHub(){
    const strip=q('#weekPlanStrip');
    if(!strip)return false;
    const first=strip.querySelector('.week-plan-day span')?.textContent?.trim();
    const heroKick=q('#hubTodayCard .eyebrow')?.textContent?.trim()||'';
    const oldChip=(q('#workoutWeekStat')?.textContent||'').includes('силов');
    return WEEKDAYS.has(first)||heroKick==='СЕГОДНЯ'||oldChip;
  }

  function handBackToShiftRenderer(){
    const hub=q('#workoutHub'),strip=q('#weekPlanStrip');
    if(!hub?.classList.contains('open')||!strip||correcting||!looksLikeLegacyHub())return;
    correcting=true;
    strip.style.visibility='hidden';
    const hero=q('#hubTodayCard');if(hero)hero.style.visibility='hidden';
    queueMicrotask(()=>{
      try{document.dispatchEvent(new Event('visibilitychange'))}catch{}
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        strip.style.visibility='';if(hero)hero.style.visibility='';correcting=false;
      }));
    });
  }

  function attachHubObserver(){
    const strip=q('#weekPlanStrip');
    if(!strip||strip.dataset.fit74OwnerWatch)return;
    strip.dataset.fit74OwnerWatch='1';
    observer=new MutationObserver(()=>handBackToShiftRenderer());
    observer.observe(strip,{childList:true,subtree:true,characterData:true});
    handBackToShiftRenderer();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#openWorkoutLibrary'))queueMicrotask(()=>{attachHubObserver();handBackToShiftRenderer()});
  });

  function boot(){loadTechnique();attachHubObserver();setInterval(()=>{loadTechnique();attachHubObserver();handBackToShiftRenderer()},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
