const CACHE='fit74-v16-program-v6';
const ASSETS=[
  './',
  './v3.css?v=3','./v3-hotfix.css?v=1','./v3.js?v=3',
  './workout.css?v=4','./workout.js?v=4',
  './shift-schedule.css?v=1','./shift-schedule.js?v=1',
  './visuals-v4.css?v=1','./visuals-v4.js?v=1',
  './workout-program-v6.css?v=1','./v6-sprite.js?v=1','./workout-program-v6.js?v=1',
  './assets/v6/sprite-1.b64?v=1','./assets/v6/sprite-2.b64?v=1','./assets/v6/sprite-3.b64?v=1',
  './assets/v6/sprite-4.b64?v=1','./assets/v6/sprite-5.b64?v=1','./assets/v6/sprite-6.b64?v=1',
  './manifest.webmanifest','./icon.svg'
];

const withV6Html=async response=>{
  if(!response||!response.ok)return response;
  let text=await response.clone().text();
  if(!text.includes('workout-program-v6.css')){
    text=text.replace(
      '<link rel="stylesheet" href="./shift-schedule.css?v=1">',
      '<link rel="stylesheet" href="./shift-schedule.css?v=1">\n<link rel="stylesheet" href="./workout-program-v6.css?v=1">'
    );
  }
  if(!text.includes('workout-program-v6.js')){
    text=text.replace(
      '<script src="./shift-schedule.js?v=1"></script>',
      '<script src="./shift-schedule.js?v=1"></script>\n<script src="./v6-sprite.js?v=1"></script>\n<script src="./workout-program-v6.js?v=1"></script>'
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
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request,{cache:'no-store'})
        .then(withV6Html)
        .then(r=>{if(r?.ok)caches.open(CACHE).then(c=>c.put('./',r.clone()));return r})
        .catch(()=>caches.match('./'))
    );
    return;
  }
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      if(r?.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs[0]?cs[0].focus():self.clients.openWindow('./')))
});
