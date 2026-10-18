(()=>{
'use strict';
const fallback=window.Fit74Visuals||{};
const BASE='./assets/technique/';
const EXERCISE={
  chair_squat:'warmup-chair-squat.webp',
  mix_squat:'warmup-chair-squat.webp',
  pushup:'strength-b-incline-pushup-chair.webp',
  mix_push:'strength-b-incline-pushup-chair.webp',
  one_arm_row:'strength-a-one-arm-row-chair.webp',
  side_plank:'core-side-plank-knee.webp',
  glute_bridge:'glute-bridge.webp'
};
const SIMPLE={
  'Круги плечами':'warmup-shoulder-circles.webp',
  'Круги тазом':'warmup-hip-circles.webp',
  'Кошка-корова':'warmup-cat-cow.webp',
  'Bird-dog':'core-bird-dog.webp',
  'Ягодичный мост без веса':'glute-bridge.webp',
  'Приседания без веса':'warmup-chair-squat.webp'
};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function card(file,title){
  return `<section class="fv-card fv-local-card"><div class="fv-heading">ВИЗУАЛЬНАЯ ТЕХНИКА</div><div class="fv-single fv-local-image"><img src="${BASE+file}" alt="${esc(title)}" loading="eager" decoding="async" style="display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:contain;background:#f6fbfc"></div></section>`;
}
function exercise(ex){
  const file=EXERCISE[ex?.id];
  return file?card(file,ex?.name):fallback.exercise?.(ex)||'';
}
function simple(step){
  const name=step?.name||'';
  const file=SIMPLE[name];
  return file?card(file,name):fallback.simple?.(step)||'';
}
window.Fit74TechniqueAssets={version:'5.1',base:BASE,exerciseMap:EXERCISE,simpleMap:SIMPLE};
window.Fit74Visuals={...fallback,exercise,simple,version:'5.1-local'};
})();