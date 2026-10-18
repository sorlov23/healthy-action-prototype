(()=>{
'use strict';
const BASE='https://exercise-dataset.com/images/flat/';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const remote={
  chair_squat:['box-squat-start.webp','box-squat-peak.webp'],mix_squat:['box-squat-start.webp','box-squat-peak.webp'],
  pushup:['incline-push-ups-start.webp','incline-push-ups-peak.webp'],mix_push:['incline-push-ups-start.webp','incline-push-ups-peak.webp'],
  bent_row:['bent-over-db-row-start.webp','bent-over-db-row-peak.webp'],mix_row:['bent-over-db-row-start.webp','bent-over-db-row-peak.webp'],
  oh_press:['dumbbell-shoulder-press-start.webp','dumbbell-shoulder-press-peak.webp'],
  reverse_lunge:['reverse-lunge-start.webp','reverse-lunge-peak.webp'],reverse_lunge_glute:['reverse-lunge-start.webp','reverse-lunge-peak.webp'],
  rdl:['dumbbell-romanian-deadlift-start.webp','dumbbell-romanian-deadlift-peak.webp'],mix_rdl:['dumbbell-romanian-deadlift-start.webp','dumbbell-romanian-deadlift-peak.webp'],
  one_arm_row:['single-arm-db-row-start.webp','single-arm-db-row-peak.webp'],
  crunch:['crunches-start.webp','crunches-peak.webp'],
  side_plank:['side-plank-main.webp'],
  side_abduction:['side-lying-hip-abduction-start.webp','side-lying-hip-abduction-peak.webp'],
  plank:['high-plank-main.webp'],mix_plank:['high-plank-main.webp']
};
const simpleRemote=[
  [/^Наклоны-таз назад$/,['bodyweight-good-morning-start.webp','bodyweight-good-morning-peak.webp']],
  [/^Приседания без веса$/,['bodyweight-squat-start.webp','bodyweight-squat-peak.webp']],
  [/^Bird-dog$/,['bird-dog-hold-main.webp']],
  [/^Мягкая растяжка груди$/,['banded-chest-stretch-main.webp']],
  [/^Растяжка задней поверхности бедра$/,['bench-hamstring-stretch-main.webp']],
  [/^Растяжка сгибателей бедра$/,['bench-couch-stretch-main.webp']],
  [/^Растяжка ягодицы лёжа$/,['banded-figure-4-stretch-main.webp']],
  [/^Очень лёгкое вело$/,['air-bike-main.webp']]
];
const C={skin:'#efb28b',shirt:'#d9eef2',shorts:'#21384d',shoe:'#f7fafb',outline:'#163047',hair:'#26323e',mint:'#5bd0b5',floor:'#dce7e4'};
const line=(a,b,c,d,w=12,col=C.skin)=>`<path d="M${a} ${b} L${c} ${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const joint=(x,y,r=6,col=C.skin)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
const shoe=(x,y,rot=0)=>`<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-9" y="-4" width="19" height="9" rx="4" fill="${C.shoe}" stroke="#aab9bd" stroke-width="1.5"/><path d="M-6 2h12" stroke="#9aabb0" stroke-width="1"/></g>`;
function person(p){
  const h=p.head||[90,35],sh=p.shoulder||[90,61],hip=p.hip||[90,99],arms=p.arms||[],legs=p.legs||[];
  let o='';
  for(const leg of legs){const [k,f]=leg;o+=line(hip[0],hip[1],k[0],k[1],15,C.shorts)+line(k[0],k[1],f[0],f[1],12,C.skin)+joint(k[0],k[1],6,C.skin)+shoe(f[0],f[1],f[2]||0)}
  for(const arm of arms){const [e,hand]=arm;o+=line(sh[0],sh[1],e[0],e[1],10,C.skin)+line(e[0],e[1],hand[0],hand[1],9,C.skin)+joint(e[0],e[1],5,C.skin)}
  o+=line(sh[0],sh[1],hip[0],hip[1],27,C.shirt)+`<rect x="${hip[0]-14}" y="${hip[1]-7}" width="28" height="19" rx="7" fill="${C.shorts}"/>`;
  o+=`<circle cx="${h[0]}" cy="${h[1]}" r="13" fill="${C.skin}" stroke="#d69572" stroke-width="1"/><path d="M${h[0]-11} ${h[1]-5} Q${h[0]} ${h[1]-17} ${h[0]+11} ${h[1]-5} Q${h[0]+4} ${h[1]-11} ${h[0]-11} ${h[1]-5}" fill="${C.hair}"/>`;
  return o;
}
const arrow=(x1,y1,x2,y2)=>`<defs><marker id="fvArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="${C.mint}"/></marker></defs><path d="M${x1} ${y1} Q${(x1+x2)/2} ${Math.min(y1,y2)-18} ${x2} ${y2}" fill="none" stroke="${C.mint}" stroke-width="5" stroke-linecap="round" marker-end="url(#fvArr)"/>`;
function panel(body,label){return `<g><rect x="0" y="0" width="170" height="160" rx="22" fill="#fff" stroke="#dfebe7" stroke-width="2"/><text x="16" y="22" font-size="11" font-family="system-ui,-apple-system,sans-serif" font-weight="800" letter-spacing="1" fill="#748580">${label}</text>${body}<path d="M16 145H154" stroke="${C.floor}" stroke-width="3" stroke-linecap="round"/></g>`}
function pair(a,b,arr=''){return `<svg viewBox="0 0 360 170" role="img" aria-label="Схема техники" class="fv-svg"><g transform="translate(5 5)">${panel(a,'СТАРТ')}</g><g transform="translate(185 5)">${panel(b,'ДВИЖЕНИЕ')}</g>${arr}</svg>`}
function custom(scene){
  let a='',b='',ar='';
  if(scene==='march'){
    a=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[70,82],[63,105]],[[99,80],[108,101]]],legs:[[[72,120],[68,142]],[ [99,120],[105,142]]]});
    b=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[68,79],[60,98]],[[99,76],[110,90]]],legs:[[[67,118],[64,142]],[[107,106],[108,125]]]})+arrow(130,120,130,86);
  }else if(scene==='shoulders'){
    a=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[66,82],[61,108]],[[102,82],[108,108]]],legs:[[[73,120],[69,142]],[[96,120],[101,142]]]});
    b=a+`<path d="M50 78 C43 60 55 49 68 52" fill="none" stroke="${C.mint}" stroke-width="5" marker-end="url(#fvArr)"/><path d="M118 78 C126 60 113 49 101 52" fill="none" stroke="${C.mint}" stroke-width="5" marker-end="url(#fvArr)"/>`;
  }else if(scene==='catcow'){
    const q=(curve)=>`<circle cx="45" cy="67" r="12" fill="${C.skin}"/><path d="M55 75 Q95 ${curve} 126 90" fill="none" stroke="${C.shirt}" stroke-width="27" stroke-linecap="round"/>${line(63,83,60,128,10,C.skin)}${line(112,90,110,130,10,C.skin)}${line(60,128,45,142,9,C.skin)}${line(110,130,126,142,9,C.skin)}<rect x="89" y="81" width="28" height="18" rx="7" fill="${C.shorts}"/>`;
    a=q(58);b=q(111)+arrow(130,58,128,95);
  }else if(scene==='quad'){
    a=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[68,83],[66,110]],[[100,82],[105,108]]],legs:[[[74,120],[70,142]],[[98,120],[103,142]]]});
    b=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[69,82],[64,110]],[[101,82],[113,113]]],legs:[[[74,120],[70,142]],[[102,112],[119,100]]]})+line(113,113,119,100,8,C.skin)+arrow(132,127,119,103);
  }else if(scene==='hamstring'){
    a=person({head:[84,37],shoulder:[84,63],hip:[84,99],arms:[[[70,82],[66,108]],[[99,82],[104,108]]],legs:[[[73,120],[69,142]],[[97,120],[102,142]]]});
    b=person({head:[62,70],shoulder:[73,80],hip:[94,99],arms:[[[78,101],[73,132]],[[90,101],[97,132]]],legs:[[[82,120],[72,142]],[[106,120],[114,142]]]})+arrow(130,55,92,87);
  }else if(scene==='child'){
    const start=`<circle cx="66" cy="54" r="12" fill="${C.skin}"/>${line(73,65,92,90,24,C.shirt)}<rect x="84" y="85" width="28" height="18" rx="7" fill="${C.shorts}"/>${line(101,96,120,125,14,C.shorts)}${line(120,125,106,141,11,C.skin)}${line(79,78,59,118,9,C.skin)}`;
    const end=`<circle cx="55" cy="105" r="12" fill="${C.skin}"/>${line(66,104,102,111,24,C.shirt)}<rect x="93" y="102" width="30" height="18" rx="7" fill="${C.shorts}"/>${line(112,111,132,127,14,C.shorts)}${line(132,127,116,142,11,C.skin)}${line(76,108,39,137,9,C.skin)}${line(76,110,49,141,9,C.skin)}`;
    a=start;b=end+arrow(127,72,88,105);
  }else if(scene==='chest'){
    a=person({head:[72,37],shoulder:[72,63],hip:[72,99],arms:[[[92,72],[119,72]],[[59,84],[55,110]]],legs:[[[61,120],[58,142]],[[84,120],[88,142]]]})+`<rect x="132" y="30" width="5" height="112" rx="2" fill="#dbe5e2"/>`;
    b=person({head:[67,37],shoulder:[67,63],hip:[67,99],arms:[[[93,71],[126,71]],[[54,84],[50,110]]],legs:[[[56,120],[53,142]],[[79,120],[83,142]]]})+`<rect x="132" y="30" width="5" height="112" rx="2" fill="#dbe5e2"/>${arrow(87,107,69,90)}`;
  }else if(scene==='twist'){
    a=`<circle cx="38" cy="103" r="12" fill="${C.skin}"/>${line(49,106,93,112,24,C.shirt)}<rect x="86" y="103" width="28" height="18" rx="7" fill="${C.shorts}"/>${line(100,113,120,126,13,C.shorts)}${line(120,126,137,140,10,C.skin)}${line(66,109,35,130,8,C.skin)}${line(68,109,93,132,8,C.skin)}`;
    b=`<circle cx="38" cy="103" r="12" fill="${C.skin}"/>${line(49,106,92,112,24,C.shirt)}<rect x="84" y="103" width="28" height="18" rx="7" fill="${C.shorts}"/>${line(98,113,119,126,13,C.shorts)}${line(119,126,93,140,10,C.skin)}${line(65,109,33,128,8,C.skin)}${line(66,109,96,128,8,C.skin)}${arrow(132,101,105,132)}`;
  }else if(scene==='bridge'||scene==='frog'){
    a=`<circle cx="34" cy="111" r="12" fill="${C.skin}"/>${line(45,112,82,119,24,C.shirt)}<rect x="75" y="109" width="29" height="18" rx="7" fill="${C.shorts}"/>${line(92,117,116,105,15,C.shorts)}${line(116,105,137,137,11,C.skin)}${line(70,121,47,135,8,C.skin)}`;
    b=`<circle cx="34" cy="119" r="12" fill="${C.skin}"/>${line(45,117,83,103,24,C.shirt)}<rect x="76" y="93" width="30" height="18" rx="7" fill="${C.shorts}"/>${line(93,103,119,91,15,C.shorts)}${line(119,91,140,137,11,C.skin)}${line(70,111,48,135,8,C.skin)}${arrow(93,133,95,97)}`;
  }else if(scene==='donkey'){
    const q=`<circle cx="47" cy="62" r="12" fill="${C.skin}"/>${line(56,72,92,86,24,C.shirt)}<rect x="83" y="78" width="30" height="18" rx="7" fill="${C.shorts}"/>${line(62,78,58,124,9,C.skin)}${line(98,91,96,128,14,C.shorts)}${line(96,128,82,141,10,C.skin)}`;
    a=q+line(110,91,126,119,14,C.shorts)+line(126,119,139,139,10,C.skin);
    b=q+line(110,91,132,74,14,C.shorts)+line(132,74,143,55,10,C.skin)+arrow(137,119,142,65);
  }else if(scene==='hydrant'){
    const q=`<circle cx="47" cy="62" r="12" fill="${C.skin}"/>${line(56,72,92,86,24,C.shirt)}<rect x="83" y="78" width="30" height="18" rx="7" fill="${C.shorts}"/>${line(62,78,58,124,9,C.skin)}${line(98,91,96,128,14,C.shorts)}${line(96,128,82,141,10,C.skin)}`;
    a=q+line(110,91,126,119,14,C.shorts)+line(126,119,139,139,10,C.skin);
    b=q+line(110,91,141,97,14,C.shorts)+line(141,97,148,124,10,C.skin)+arrow(123,130,144,102);
  }else if(scene==='plank'){
    a=`<circle cx="38" cy="80" r="12" fill="${C.skin}"/>${line(49,84,95,98,24,C.shirt)}<rect x="88" y="91" width="28" height="18" rx="7" fill="${C.shorts}"/>${line(105,100,143,116,14,C.shorts)}${line(143,116,153,139,10,C.skin)}${line(58,89,52,125,9,C.skin)}${line(52,125,38,140,9,C.skin)}`;
    b=a+`<path d="M46 84 L151 126" stroke="${C.mint}" stroke-width="3" stroke-dasharray="5 5"/>`;
  }else return '';
  return pair(a,b,ar);
}
function remoteCard(files,title){
  const imgs=files.length===1?`<div class="fv-single"><img src="${BASE+files[0]}" alt="${esc(title)}"></div>`:`<div class="fv-grid"><figure><img src="${BASE+files[0]}" alt="${esc(title)} — старт"><figcaption>СТАРТ</figcaption></figure><figure><img src="${BASE+files[1]}" alt="${esc(title)} — движение"><figcaption>ДВИЖЕНИЕ</figcaption></figure></div>`;
  return `<section class="fv-card"><div class="fv-heading">ВИЗУАЛЬНАЯ ТЕХНИКА</div>${imgs}<div class="fv-credit">Иллюстрации RepDB · CC BY 4.0</div></section>`;
}
function customCard(scene,title){const art=custom(scene);if(!art)return'';return `<section class="fv-card"><div class="fv-heading">ВИЗУАЛЬНАЯ ТЕХНИКА</div>${art}</section>`}
function simpleVisual(step){const n=step?.name||'';for(const [re,f] of simpleRemote)if(re.test(n))return remoteCard(f,n);let scene='';if(/^Марш/.test(n)||n==='Спокойная ходьба')scene='march';else if(n==='Круги плечами')scene='shoulders';else if(n==='Кошка-корова'||n==='Круги тазом')scene='catcow';else if(n==='Растяжка передней поверхности бедра')scene='quad';else if(n==='Растяжка задней поверхности бедра'||n==='Растяжка ног')scene='hamstring';else if(n==='Поза ребёнка')scene='child';else if(n==='Мягкая растяжка груди')scene='chest';else if(n==='Повороты грудного отдела лёжа')scene='twist';else if(n==='Ягодичный мост без веса')scene='bridge';else if(n==='Выпады назад без веса')return remoteCard(['reverse-lunge-start.webp','reverse-lunge-peak.webp'],n);return scene?customCard(scene,n):''}
function exerciseVisual(ex){if(!ex)return'';const f=remote[ex.id];if(f)return remoteCard(f,ex.name);let scene='';if(ex.id==='glute_bridge')scene='bridge';else if(ex.id==='frog_pump')scene='frog';else if(ex.id==='donkey_kick')scene='donkey';else if(ex.id==='fire_hydrant')scene='hydrant';else if(ex.id==='plank'||ex.id==='mix_plank')scene='plank';return scene?customCard(scene,ex.name):''}
window.Fit74Visuals={exercise:exerciseVisual,simple:simpleVisual,version:'4.0'};
})();