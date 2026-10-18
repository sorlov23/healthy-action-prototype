(()=>{
'use strict';

// Fit74 image-technique bootstrap. No observers, polling or progress storage.
window.Fit74Visuals={exercise:()=>'',simple:()=>'',version:'10-bootstrap'};

function primeHeader(){
  const START='2026-10-19',END='2026-12-31',TOTAL=74;
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0)};
  const today=iso(new Date()),pre=today<START,focus=pre?START:(today>END?END:today);
  const day=Math.round((parse(focus)-parse(START))/86400000)+1;
  const title=document.querySelector('#heroTitle'),date=document.querySelector('#heroDate'),banner=document.querySelector('#prestartBanner'),days=document.querySelector('#daysLeft');
  if(title)title.textContent=pre?'Старт в понедельник':`День ${day} из ${TOTAL}`;
  if(date)date.textContent=parse(focus).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  if(banner)banner.classList.toggle('hidden',!pre);
  if(days)days.textContent=pre?TOTAL:Math.max(0,Math.round((parse(END)-parse(focus))/86400000));
}

primeHeader();

function appendScript(src,onload){
  const s=document.createElement('script');s.src=src;s.onload=onload||null;document.head.appendChild(s);
}

if(document.readyState==='loading'){
  document.write('<script src="./technique-images.js?v=10.0"><\/script><script src="./workout-program-v7.js?v=10.0"><\/script>');
}else{
  appendScript('./technique-images.js?v=10.0',()=>appendScript('./workout-program-v7.js?v=10.0'));
}
})();
