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
  l.href='./workout-program-v6.css?v=3';
  document.head.appendChild(l);
}

function loadScript(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  if(hasScript(src))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='./'+src+'?v=3';
    s.onload=resolve;
    s.onerror=reject;
    document.head.appendChild(s);
  });
}

async function loadProgramSafely(){
  if(window.Fit74ProgramV6||hasScript('workout-program-v6.js'))return;
  const NativeMutationObserver=window.MutationObserver;
  const NativeSetInterval=window.setInterval;

  // The current v6 installer creates both a broad body MutationObserver and a
  // 900 ms background DOM polling interval. Both are unnecessary for normal
  // workout operation and together can starve iOS Safari's main thread.
  class Fit74NoopObserver{
    constructor(){ }
    observe(){ }
    disconnect(){ }
    takeRecords(){ return []; }
  }
  const noopInterval=()=>0;

  try{
    window.MutationObserver=Fit74NoopObserver;
    window.setInterval=noopInterval;
    await loadScript('workout-program-v6.js','Fit74ProgramV6');
  }finally{
    window.MutationObserver=NativeMutationObserver;
    window.setInterval=NativeSetInterval;
  }
}

async function bootV6(){
  try{
    addCss();
    // Sprite replacement is finite: matching image -> one background frame.
    await loadScript('v6-sprite.js','Fit74V6Sprite');
    await loadProgramSafely();
  }catch(e){
    console.warn('Fit74 v6 bootstrap',e);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootV6,0),{once:true});
else setTimeout(bootV6,0);
})();