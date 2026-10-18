(()=>{
'use strict';
const PARTS=6;
const COLS=6, ROWS=5;
const CELLS={
  'bird-dog':[0,0], 'breathing':[1,0], 'calf-raise':[2,0], 'cardio-bike':[3,0], 'cat-cow':[4,0], 'chair-goblet-squat':[5,0],
  'chair-squat-warmup':[0,1], 'chest-wall-stretch':[1,1], 'dead-bug':[2,1], 'donkey-kick':[3,1], 'easy-bike-walk':[4,1], 'fire-hydrant':[5,1],
  'floor-dumbbell-press':[0,2], 'frog-pump':[1,2], 'glute-bridge':[2,2], 'hip-circles':[3,2], 'incline-pushup-chair':[4,2], 'one-arm-row-chair':[5,2],
  'reverse-lunge-glute':[0,3], 'shoulder-circles':[1,3], 'side-abduction':[2,3], 'side-plank-knee':[3,3], 'split-squat-chair':[4,3], 'stretch-glute':[5,3],
  'stretch-hip-flexor':[0,4], 'stretch-thoracic':[1,4], 'warmup-bike':[2,4]
};
let spriteUrl=null, loading=null;
function injectStyle(){
  if(document.getElementById('fit74V6SpriteStyle'))return;
  const s=document.createElement('style'); s.id='fit74V6SpriteStyle';
  s.textContent=`.v6-sprite-frame{display:block;width:100%;aspect-ratio:3/2;background-repeat:no-repeat;background-color:#f6fbfc;border:1px solid #e1ebe8;border-radius:18px;background-size:${COLS*100}% ${ROWS*100}%;overflow:hidden}.v6-visual-loading{display:grid;place-items:center;width:100%;aspect-ratio:3/2;background:#f6fbfc;border:1px solid #e1ebe8;border-radius:18px;color:#7a8b87;font-weight:700;font-size:13px}`;
  document.head.appendChild(s);
}
function loadSprite(){
  if(spriteUrl)return Promise.resolve(spriteUrl);
  if(loading)return loading;
  loading=Promise.all(Array.from({length:PARTS},(_,i)=>fetch(`./assets/v6/sprite-${i+1}.b64?v=1`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`sprite part ${i+1}: ${r.status}`);return r.text()})))
    .then(parts=>{
      const bin=atob(parts.join('').replace(/\s+/g,''));
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      spriteUrl=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
      return spriteUrl;
    }).catch(e=>{console.warn('Fit74 v6 sprite',e); return null});
  return loading;
}
function slugFrom(img){
  const raw=img.getAttribute('src')||'';
  const m=raw.match(/\/assets\/v6\/([^/?]+)\.webp/i);
  return m?.[1]||null;
}
async function replaceOne(img){
  if(!img||img.dataset.v6SpriteProcessed)return;
  const slug=slugFrom(img); if(!slug||!CELLS[slug])return;
  img.dataset.v6SpriteProcessed='1';
  const placeholder=document.createElement('div');
  placeholder.className='v6-visual-loading'; placeholder.textContent='Загружаю технику…';
  img.replaceWith(placeholder);
  const url=await loadSprite();
  if(!placeholder.isConnected)return;
  if(!url){placeholder.textContent='Иллюстрация временно недоступна';return;}
  const [x,y]=CELLS[slug];
  const el=document.createElement('div');
  el.className='v6-sprite-frame'; el.setAttribute('role','img');
  el.setAttribute('aria-label',img.alt||'Техника упражнения');
  el.style.backgroundImage=`url("${url}")`;
  el.style.backgroundPosition=`${x/(COLS-1)*100}% ${y/(ROWS-1)*100}%`;
  placeholder.replaceWith(el);
}
function scan(root=document){root.querySelectorAll?.('.v6-visual img[src*="/assets/v6/"]').forEach(replaceOne)}
injectStyle(); loadSprite();
const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===1){if(n.matches?.('.v6-visual img[src*="/assets/v6/"]'))replaceOne(n);scan(n)}}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();mo.observe(document.body,{childList:true,subtree:true})});
else{scan();mo.observe(document.body,{childList:true,subtree:true})}
window.Fit74V6Sprite={version:'1.0',load:loadSprite,cells:CELLS};
})();