(()=>{
'use strict';

// Fit74 image-technique bootstrap. No observers, polling or progress storage.
window.Fit74Visuals={exercise:()=>'',simple:()=>'',version:'10-bootstrap'};

// v3.js renders the selected design header after account data loads.

function appendScript(src,onload){
  const s=document.createElement('script');s.src=src;s.onload=onload||null;document.head.appendChild(s);
}

if(document.readyState==='loading'){
  document.write('<script src="./technique-images.js?v=11.0"><\/script><script src="./workout-program-v7.js?v=13.0"><\/script>');
}else{
  appendScript('./technique-images.js?v=11.0',()=>appendScript('./workout-program-v7.js?v=13.0'));
}
})();
