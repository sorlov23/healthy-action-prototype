(()=>{
'use strict';
const BASE='./assets/technique/';
const MAP={
  'one-arm-row-chair':'strength-a-one-arm-row-chair.webp',
  'glute-bridge':'glute-bridge.webp',
  'bird-dog':'core-bird-dog.webp',
  'side-plank-knee':'core-side-plank-knee.webp',
  'incline-pushup-chair':'strength-b-incline-pushup-chair.webp',
  'shoulder-circles':'warmup-shoulder-circles.webp',
  'hip-circles':'warmup-hip-circles.webp',
  'cat-cow':'warmup-cat-cow.webp',
  'chair-squat-warmup':'warmup-chair-squat.webp'
};
function apply(root=document){
  root.querySelectorAll?.('.v6-visual img').forEach(img=>{
    if(img.dataset.v6Local==='1')return;
    const m=(img.getAttribute('src')||'').match(/\/([^/]+)\.webp(?:\?|$)/);
    const key=m?.[1];
    const file=key&&MAP[key];
    if(file){
      img.dataset.v6Local='1';
      img.src=BASE+file;
      img.onerror=()=>img.closest('.v6-visual')?.remove();
    }else{
      img.closest('.v6-visual')?.remove();
    }
  });
}
const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)apply(n)});
function start(){apply();mo.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
