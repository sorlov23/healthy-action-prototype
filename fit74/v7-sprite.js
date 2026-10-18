(()=>{
'use strict';
const PARTS=6,COLS=6,ROWS=5;
const CELLS={
'bird-dog':[0,0],'breathing':[1,0],'calf-raise':[2,0],'cardio-bike':[3,0],'cat-cow':[4,0],'chair-goblet-squat':[5,0],
'chair-squat-warmup':[0,1],'chest-wall-stretch':[1,1],'dead-bug':[2,1],'donkey-kick':[3,1],'easy-bike-walk':[4,1],'fire-hydrant':[5,1],
'floor-dumbbell-press':[0,2],'frog-pump':[1,2],'glute-bridge':[2,2],'hip-circles':[3,2],'incline-pushup-chair':[4,2],'one-arm-row-chair':[5,2],
'reverse-lunge-glute':[0,3],'shoulder-circles':[1,3],'side-abduction':[2,3],'side-plank-knee':[3,3],'split-squat-chair':[4,3],'stretch-glute':[5,3],
'stretch-hip-flexor':[0,4],'stretch-thoracic':[1,4],'warmup-bike':[2,4]
};
let spriteUrl=null,loading=null;
function css(){if(document.getElementById('fit74V7SpriteStyle'))return;const s=document.createElement('style');s.id='fit74V7SpriteStyle';s.textContent=`.v7-visual{margin:16px 0;padding:14px;background:#fff;border:1px solid #dfe8e5;border-radius:22px}.v7-visual-label{font-size:12px;font-weight:900;letter-spacing:1.2px;color:#758681;margin-bottom:10px}.v7-sprite-frame{display:block;width:100%;aspect-ratio:3/2;background-repeat:no-repeat;background-color:#f6fbfc;border:1px solid #e1ebe8;border-radius:18px;background-size:${COLS*100}% ${ROWS*100}%;overflow:hidden}.v7-visual-loading{display:grid;place-items:center;width:100%;aspect-ratio:3/2;background:#f6fbfc;border:1px solid #e1ebe8;border-radius:18px;color:#7a8b87;font-weight:700;font-size:13px}`;document.head.appendChild(s)}
function load(){if(spriteUrl)return Promise.resolve(spriteUrl);if(loading)return loading;loading=Promise.all(Array.from({length:PARTS},(_,i)=>fetch(`./assets/v6/sprite-${i+1}.b64?v=2`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('sprite '+(i+1));return r.text()}))).then(parts=>{const bin=atob(parts.join('').replace(/\s+/g,'')),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);spriteUrl=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));return spriteUrl}).catch(e=>{console.warn('Fit74 v7 sprite',e);return null});return loading}
function html(slug,title='Техника упражнения'){if(!slug||!CELLS[slug])return'';return `<section class="v7-visual"><div class="v7-visual-label">ВИЗУАЛЬНАЯ ТЕХНИКА</div><div class="v7-visual-loading" data-v7-asset="${slug}" data-v7-alt="${String(title).replace(/"/g,'&quot;')}">Загружаю технику…</div></section>`}
async function render(root=document){const nodes=[...root.querySelectorAll?.('[data-v7-asset]')||[]];if(!nodes.length)return;const url=await load();for(const n of nodes){if(!n.isConnected||n.dataset.v7Done)return;n.dataset.v7Done='1';const cell=CELLS[n.dataset.v7Asset];if(!url||!cell){n.textContent='Иллюстрация временно недоступна';continue}const [x,y]=cell;n.className='v7-sprite-frame';n.textContent='';n.setAttribute('role','img');n.setAttribute('aria-label',n.dataset.v7Alt||'Техника упражнения');n.style.backgroundImage=`url("${url}")`;n.style.backgroundPosition=`${x/(COLS-1)*100}% ${y/(ROWS-1)*100}%`}}
css();load();window.Fit74V7Sprite={version:'1.0',html,render,cells:CELLS};
})();