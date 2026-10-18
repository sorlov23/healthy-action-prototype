(()=>{
'use strict';
// Legacy visual renderer is intentionally disabled in v6.
// This file stays in index.html as a compatibility bootstrap so the first
// launch (before the new service worker controls the page) still loads v6.
window.Fit74VisualsV4={disabled:true,reason:'replaced-by-v6'};

const hasScript=part=>[...document.scripts].some(s=>(s.getAttribute('src')||'').includes(part));
const hasCss=part=>[...document.querySelectorAll('link[rel="stylesheet"]')].some(l=>(l.getAttribute('href')||'').includes(part));
function addCss(){
  if(hasCss('workout-program-v6.css'))return;
  const l=document.createElement('link');
  l.rel='stylesheet';l.href='./workout-program-v6.css?v=1';document.head.appendChild(l);
}
function loadScript(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve();
  if(hasScript(src))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='./'+src+'?v=1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}
async function bootV6(){
  try{
    addCss();
    await loadScript('v6-sprite.js','Fit74V6Sprite');
    await loadScript('workout-program-v6.js','Fit74ProgramV6');
  }catch(e){console.warn('Fit74 v6 bootstrap',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootV6,0));
else setTimeout(bootV6,0);
})();
