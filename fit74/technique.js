(()=>{
'use strict';
window.__fit74TechniqueDirect='v1';

const SCENES=[
  [/Приседания к стулу|Приседания без веса/,'squat'],
  [/Отжимания от пола или стула/,'pushup'],
  [/Тяга гантелей в наклоне/,'row'],
  [/Жим гантелей вверх/,'press'],
  [/^Планка$/,'plank'],
  [/Выпады назад с акцентом/,'gluteLunge'],
  [/Выпады назад/,'lunge'],
  [/Румынская тяга|Наклоны-таз назад/,'rdl'],
  [/Тяга гантели одной рукой/,'oneRow'],
  [/Скручивания|подъёмы корпуса/,'crunch'],
  [/Боковая планка/,'sidePlank'],
  [/Ягодичный мост/,'bridge'],
  [/Фрог-памп/,'frog'],
  [/Разгибание бедра на четвереньках/,'donkey'],
  [/Пожарный гидрант/,'hydrant'],
  [/Отведение ноги лёжа на боку/,'abduction'],
  [/Bird-dog/,'birdDog']
];

const HINTS={
  squat:'Таз назад к стулу · колени по линии носков · пятки на полу',
  pushup:'Корпус одной линией · грудь к опоре · локти назад',
  row:'Спина нейтральна · локти назад к рёбрам · без рывка',
  press:'Рёбра не выпячивать · жим вверх плавно · без прогиба',
  plank:'Голова–таз–пятки одной линией · живот подтянут',
  lunge:'Длинный шаг назад · передняя стопа полностью на полу',
  gluteLunge:'Длинный шаг · лёгкий наклон корпуса · толчок пяткой',
  rdl:'Таз назад · гантели вдоль ног · спина нейтральна',
  oneRow:'Опора на стул · плечи ровно · локоть к тазу',
  crunch:'Поднять лопатки · шея расслаблена · выдох наверху',
  sidePlank:'Локоть под плечом · таз не проваливать',
  bridge:'Подкрутить таз · подняться ягодицами · не поясницей',
  frog:'Стопы вместе · колени наружу · таз вверх ягодицами',
  donkey:'Колено согнуто · пятка вверх · таз не разворачивать',
  hydrant:'Колено идёт В СТОРОНУ · таз остаётся ровным',
  abduction:'Нога чуть назад · носок вперёд · таз не заваливать',
  birdDog:'Противоположные рука и нога · таз неподвижен'
};

function sceneFor(name){for(const [re,key] of SCENES)if(re.test(name||''))return key;return null}
const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#102033" stroke-width="5" stroke-linecap="round"/>`;
const head=(x,y)=>`<circle cx="${x}" cy="${y}" r="10" fill="#102033"/>`;
const arrow=(x1,y1,x2,y2)=>`<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#59cdb4"/></marker></defs><path d="M${x1} ${y1} Q${(x1+x2)/2} ${Math.min(y1,y2)-18} ${x2} ${y2}" fill="none" stroke="#59cdb4" stroke-width="4" stroke-linecap="round" marker-end="url(#a)"/>`;
const ground=y=>`<path d="M18 ${y} H342" stroke="#d9e4e1" stroke-width="3" stroke-linecap="round"/>`;
const label=(x,t)=>`<text x="${x}" y="25" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="800" fill="#7c8d8a" letter-spacing="1.2">${t}</text>`;

function svg(scene){
  let a='',b='';
  switch(scene){
    case 'squat':
      a=`${head(82,53)}${line(82,64,82,101)}${line(82,78,61,91)}${line(82,78,103,91)}${line(82,101,68,137)}${line(82,101,99,137)}<rect x="122" y="96" width="30" height="38" rx="5" fill="#edf3f1" stroke="#c8d7d3" stroke-width="2"/>`;
      b=`${head(248,61)}${line(244,72,232,100)}${line(232,100,216,116)}${line(216,116,215,145)}${line(232,100,262,116)}${line(262,116,279,145)}<rect x="304" y="107" width="30" height="29" rx="5" fill="#edf3f1" stroke="#c8d7d3" stroke-width="2"/>${arrow(294,69,278,106)}`;break;
    case 'pushup':
      a=`<rect x="28" y="105" width="38" height="37" rx="5" fill="#edf3f1" stroke="#c8d7d3" stroke-width="2"/>${head(92,76)}${line(84,84,115,95)}${line(115,95,148,111)}${line(84,85,65,109)}${line(65,109,61,141)}${line(115,95,144,141)}`;
      b=`<rect x="194" y="105" width="38" height="37" rx="5" fill="#edf3f1" stroke="#c8d7d3" stroke-width="2"/>${head(268,94)}${line(260,99,295,102)}${line(295,102,329,114)}${line(260,100,229,116)}${line(229,116,226,141)}${line(295,102,325,141)}${arrow(276,63,268,88)}`;break;
    case 'row':case 'oneRow':
      a=`${head(72,58)}${line(67,70,96,94)}${line(96,94,116,134)}${line(96,94,76,134)}${line(80,82,66,119)}${line(86,86,99,121)}<circle cx="65" cy="124" r="7" fill="#596675"/><circle cx="100" cy="126" r="7" fill="#596675"/>`;
      b=`${head(250,58)}${line(245,70,274,94)}${line(274,94,295,134)}${line(274,94,254,134)}${line(257,82,239,93)}${line(239,93,251,105)}${line(264,86,285,92)}${line(285,92,276,105)}<circle cx="251" cy="109" r="7" fill="#596675"/><circle cx="276" cy="109" r="7" fill="#596675"/>${arrow(305,123,286,95)}`;break;
    case 'press':
      a=`${head(84,51)}${line(84,62,84,105)}${line(84,76,64,83)}${line(64,83,64,62)}${line(84,76,104,83)}${line(104,83,104,62)}${line(84,105,72,145)}${line(84,105,97,145)}<circle cx="64" cy="57" r="7" fill="#596675"/><circle cx="104" cy="57" r="7" fill="#596675"/>`;
      b=`${head(260,58)}${line(260,69,260,108)}${line(260,80,240,54)}${line(240,54,240,34)}${line(260,80,280,54)}${line(280,54,280,34)}${line(260,108,248,145)}${line(260,108,273,145)}<circle cx="240" cy="30" r="7" fill="#596675"/><circle cx="280" cy="30" r="7" fill="#596675"/>${arrow(315,98,303,48)}`;break;
    case 'plank':
      a=`${head(49,90)}${line(59,94,104,105)}${line(104,105,150,121)}${line(64,96,57,128)}${line(104,105,140,145)}`;
      b=`${head(226,84)}${line(236,88,278,116)}${line(278,116,330,106)}${line(242,93,232,129)}${line(278,116,323,145)}${arrow(286,75,276,108)}`;break;
    case 'lunge':case 'gluteLunge':
      a=`${head(83,51)}${line(83,62,83,103)}${line(83,103,70,145)}${line(83,103,97,145)}`;
      b=`${head(254,56)}${line(251,68,${scene==='gluteLunge'?241:251},102)}${line(${scene==='gluteLunge'?241:251},102,222,120)}${line(222,120,218,145)}${line(${scene==='gluteLunge'?241:251},102,289,120)}${line(289,120,314,145)}${arrow(309,62,298,104)}`;break;
    case 'rdl':
      a=`${head(83,51)}${line(83,62,83,104)}${line(83,104,71,145)}${line(83,104,96,145)}${line(83,78,68,113)}${line(83,78,99,113)}<circle cx="67" cy="119" r="7" fill="#596675"/><circle cx="100" cy="119" r="7" fill="#596675"/>`;
      b=`${head(229,64)}${line(236,73,272,93)}${line(272,93,260,145)}${line(272,93,288,145)}${line(250,82,239,122)}${line(258,85,260,124)}<circle cx="239" cy="128" r="7" fill="#596675"/><circle cx="260" cy="130" r="7" fill="#596675"/>${arrow(310,64,288,91)}`;break;
    case 'crunch':
      a=`${head(50,120)}${line(60,123,104,130)}${line(104,130,128,111)}${line(128,111,147,141)}`;
      b=`${head(235,94)}${line(245,100,280,122)}${line(280,122,308,111)}${line(308,111,330,141)}${arrow(231,128,240,103)}`;break;
    case 'sidePlank':
      a=`${head(48,83)}${line(58,88,104,104)}${line(104,104,150,123)}${line(70,92,61,128)}${line(61,128,51,142)}`;
      b=`${head(226,90)}${line(236,95,278,120)}${line(278,120,329,128)}${line(246,100,239,132)}${line(239,132,229,142)}${arrow(288,82,280,112)}`;break;
    case 'bridge':case 'frog':
      a=`${head(43,120)}${line(53,123,90,131)}${line(90,131,122,113)}${line(122,113,147,141)}`;
      b=`${head(222,120)}${line(232,123,267,109)}${line(267,109,301,92)}${line(301,92,328,141)}${arrow(279,134,289,102)}`;break;
    case 'donkey':
      a=`${head(49,77)}${line(59,83,96,94)}${line(96,94,129,105)}${line(66,86,61,128)}${line(107,98,107,129)}${line(107,129,92,142)}${line(129,105,130,134)}${line(130,134,146,142)}`;
      b=`${head(227,77)}${line(237,83,274,94)}${line(274,94,299,105)}${line(245,86,240,128)}${line(285,98,284,128)}${line(284,128,270,142)}${line(299,105,318,89)}${line(318,89,326,70)}${arrow(316,126,325,83)}`;break;
    case 'hydrant':
      a=`<rect x="50" y="70" width="60" height="46" rx="18" fill="#e8f6f2" stroke="#102033" stroke-width="3"/>${head(80,53)}${line(57,80,34,62)}${line(103,80,126,62)}${line(57,108,42,137)}${line(103,108,119,137)}`;
      b=`<rect x="230" y="70" width="60" height="46" rx="18" fill="#e8f6f2" stroke="#102033" stroke-width="3"/>${head(260,53)}${line(237,80,214,62)}${line(283,80,306,62)}${line(237,108,222,137)}${line(283,108,319,108)}${line(319,108,334,133)}${arrow(288,142,329,112)}`;break;
    case 'abduction':
      a=`${head(43,119)}${line(53,122,99,127)}${line(99,127,145,138)}${line(99,127,142,126)}`;
      b=`${head(223,119)}${line(233,122,279,127)}${line(279,127,326,139)}${line(279,127,319,89)}${arrow(305,119,319,95)}`;break;
    case 'birdDog':
      a=`${head(48,79)}${line(58,84,95,94)}${line(95,94,125,105)}${line(67,87,61,128)}${line(106,98,106,129)}${line(106,129,91,142)}${line(125,105,126,135)}`;
      b=`${head(228,79)}${line(238,84,275,94)}${line(275,94,305,105)}${line(247,87,218,73)}${line(286,98,286,129)}${line(286,129,271,142)}${line(305,105,337,96)}${arrow(211,88,220,75)}${arrow(318,116,334,98)}`;break;
    default:a=`${head(85,60)}${line(85,72,85,108)}${line(85,108,72,145)}${line(85,108,98,145)}`;b=a.replaceAll('85','265').replaceAll('72','252').replaceAll('98','278');
  }
  return `<svg viewBox="0 0 360 174" width="100%" role="img" aria-label="Схема техники упражнения" style="display:block"><rect width="360" height="174" rx="22" fill="#f7faf9"/><rect x="8" y="10" width="166" height="154" rx="18" fill="#fff" stroke="#e0e9e6"/><rect x="186" y="10" width="166" height="154" rx="18" fill="#fff" stroke="#e0e9e6"/>${label(22,'СТАРТ')}${label(200,'ДВИЖЕНИЕ')}${ground(151)}${a}${b}</svg>`;
}

function style(el,css){Object.assign(el.style,css)}
let modal=null;
function openModal(scene,title){
  if(!modal){
    modal=document.createElement('div');modal.id='fit74TechniqueDirectModal';
    style(modal,{position:'fixed',inset:'0',zIndex:'99999',background:'rgba(10,20,33,.48)',display:'none',alignItems:'flex-end',justifyContent:'center'});
    modal.innerHTML='<div data-sheet style="width:100%;max-width:620px;background:#fff;border-radius:26px 26px 0 0;padding:18px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -16px 50px rgba(13,23,38,.18)"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px"><div><div style="font-size:12px;font-weight:900;letter-spacing:1.4px;color:#7c8d8a">ТЕХНИКА · СХЕМА</div><h2 data-title style="margin:4px 0 0;font-size:24px;color:#0d1726"></h2></div><button data-close style="width:44px;height:44px;border:0;border-radius:14px;background:#eef3f1;font-size:28px;line-height:1">×</button></div><div data-art></div><p data-hint style="margin:14px 2px 4px;color:#52666a;font-size:16px;line-height:1.45"></p><p style="margin:10px 2px 0;color:#8a999c;font-size:13px;line-height:1.4">Схема упрощённая. Ориентируйся также на пошаговые подсказки в карточке упражнения. Если движение вызывает острую боль — остановись.</p></div>';
    document.body.appendChild(modal);modal.querySelector('[data-close]').onclick=()=>{modal.style.display='none'};modal.onclick=e=>{if(e.target===modal)modal.style.display='none'};
  }
  modal.querySelector('[data-title]').textContent=title;modal.querySelector('[data-art]').innerHTML=svg(scene);modal.querySelector('[data-hint]').textContent=HINTS[scene]||'';modal.style.display='flex';
}

function render(){
  const body=document.querySelector('#playerBody');if(!body)return;
  const titleEl=body.querySelector('.exercise-hero h3')||body.querySelector('.simple-step h3');if(!titleEl)return;
  const title=titleEl.textContent.trim(),scene=sceneFor(title);if(!scene)return;
  const old=body.querySelector('[data-fit74-direct-technique]');
  if(old?.dataset.scene===scene)return;
  old?.remove();
  const tip=body.querySelector('.exercise-tip')||body.querySelector('.simple-target')||titleEl.parentElement;
  const box=document.createElement('section');box.dataset.fit74DirectTechnique='1';box.dataset.scene=scene;
  style(box,{margin:'18px 0',padding:'14px',background:'#fff',border:'1px solid #dfe8e5',borderRadius:'22px',boxShadow:'0 8px 24px rgba(13,23,38,.04)'});
  box.innerHTML=`<div style="margin-bottom:10px;font-size:13px;font-weight:900;letter-spacing:1.2px;color:#768783">ВИЗУАЛЬНАЯ ТЕХНИКА</div>${svg(scene)}<button data-open style="width:100%;margin-top:12px;border:0;border-radius:14px;padding:13px 16px;background:#e5f8f3;color:#12302a;font-size:16px;font-weight:900">🎯 Показать крупно</button>`;
  box.querySelector('[data-open]').onclick=()=>openModal(scene,title);
  tip.insertAdjacentElement('afterend',box);
}

function boot(){render();setInterval(render,220)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
