const CACHE='fit74-v16-program-v6';
const ASSETS=[
  './',
  './v3.css?v=3','./v3-hotfix.css?v=1','./v3.js?v=3',
  './workout.css?v=4','./workout.js?v=4',
  './workout-program-v6.css?v=6','./workout-program-v6.js?v=6','./v6-local-visuals.js?v=1',
  './shift-schedule.css?v=1','./shift-schedule.js?v=1',
  './assets/technique/warmup-chair-squat.webp',
  './assets/technique/strength-b-incline-pushup-chair.webp',
  './assets/technique/strength-a-one-arm-row-chair.webp',
  './assets/technique/core-side-plank-knee.webp',
  './assets/technique/glute-bridge.webp',
  './assets/technique/core-bird-dog.webp',
  './assets/technique/warmup-shoulder-circles.webp',
  './assets/technique/warmup-hip-circles.webp',
  './assets/technique/warmup-cat-cow.webp',
  './manifest.webmanifest','./icon.svg'
];

const withFit74Html=async response=>{
  if(!response||!response.ok)return response;
  let text=await response.clone().text();
  text=text
    .replace(/\s*<script src="\.\/visuals-v4\.js\?v=1"><\/script>/g,'')
    .replace(/\s*<script src="\.\/visual-assets-v5\.js[^\"]*"><\/script>/g,'');
  if(!text.includes('workout-program-v6.css')){
    text=text.replace(
      '<link rel="stylesheet" href="./workout.css?v=4">',
      '<link rel="stylesheet" href="./workout.css?v=4">\n  <link rel="stylesheet" href="./workout-program-v6.css?v=6">'
    );
  }
  if(!text.includes('workout-program-v6.js')){
    text=text.replace(
      '<script src="./shift-schedule.js?v=1"></script>',
      '<script src="./shift-schedule.js?v=1"></script>\n<script src="./workout-program-v6.js?v=6"></script>\n<script src="./v6-local-visuals.js?v=1"></script>'
    );
  }
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
};

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request,{cache:'no-store'})
        .then(withFit74Html)
        .then(r=>{if(r?.ok)caches.open(CACHE).then(c=>c.put('./',r.clone()));return r})
        .catch(()=>caches.match('./'))
    );
    return;
  }
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./')))
  );
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs[0]?cs[0].focus():self.clients.openWindow('./')))
});
