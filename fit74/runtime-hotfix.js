(()=>{
  'use strict';
  // Compatibility shim for clients still controlled by the previous service worker.
  // v9 no longer uses this file for UI rendering; it only makes sure technique assets exist.
  const q=s=>document.querySelector(s);
  function ensureTechnique(){
    if(!q('link[data-fit74-technique]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./technique.css?v=2';l.dataset.fit74Technique='1';document.head.appendChild(l)}
    if(!q('script[data-fit74-technique]')){const s=document.createElement('script');s.src='./technique.js?v=2';s.defer=true;s.dataset.fit74Technique='1';document.head.appendChild(s)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureTechnique);else ensureTechnique();
})();
