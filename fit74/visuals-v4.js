(()=>{
'use strict';
// Legacy visual renderer is intentionally disabled in v6.
// This compatibility bootstrap loads the v6 visual/program layers safely.
window.Fit74VisualsV4={disabled:true,reason:'replaced-by-v6'};

const hasScript=part=>[...document.scripts].some(s=>(s.getAttribute('src')||'').includes(part));
const hasCss=part=>[...document.querySelectorAll('link[rel="stylesheet"]')].some(l=>(l.getAttribute('href')||'').includes(part));

function addCss(){
  if(hasCss('workout-program-v6.css'))return;
  const l=document.createElement('link');
  l.rel='stylesheet';
  l.href='./workout-program-v6.css?v=2';
  document.head.appendChild(l);
}

function loadScript(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  if(hasScript(src))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='./'+src+'?v=2';
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

async function loadProgramWithoutObserverLoop(){
  if(window.Fit74ProgramV6||hasScript('workout-program-v6.js'))return;
  const NativeMutationObserver=window.MutationObserver;
  // workout-program-v6 currently contains a broad body observer whose own DOM
  // writes can retrigger it forever on iOS Safari. The program also has a safe
  // interval refresh, so its observer is not required for functionality.
  class Fit74NoopObserver{
    constructor(){ }
    observe(){ }
    disconnect(){ }
    takeRecords(){ return []; }
  }
  try{
    window.MutationObserver=Fit74NoopObserver;
    await loadScript('workout-program-v6.js','Fit74ProgramV6');
  }finally{
    window.MutationObserver=NativeMutationObserver;
  }
}

async function bootV6(){
  try{
    addCss();
    // The sprite keeps the native MutationObserver so technique visuals can
    // appear as workout steps are rendered.
    await loadScript('v6-sprite.js','Fit74V6Sprite');
    await loadProgramWithoutObserverLoop();
  }catch(e){
    console.warn('Fit74 v6 bootstrap',e);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootV6,0));
else setTimeout(bootV6,0);
})();