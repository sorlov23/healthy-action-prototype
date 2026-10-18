const CACHE='fit74-v17-safe-v6-bootstrap';
const ASSETS=[
  './',
  './v3.css?v=3','./v3-hotfix.css?v=2','./v3.js?v=3',
  './workout.css?v=4','./workout.js?v=4',
  './shift-schedule.css?v=1','./shift-schedule.js?v=1',
  './visuals-v4.css?v=1','./visuals-v4.js?v=2',
  './workout-program-v6.css?v=2','./v6-sprite.js?v=2','./workout-program-v6.js?v=2',
  './assets/v6/sprite-1.b64?v=1','./assets/v6/sprite-2.b64?v=1','./assets/v6/sprite-3.b64?v=1',
  './assets/v6/sprite-4.b64?v=1','./assets/v6/sprite-5.b64?v=1','./assets/v6/sprite-6.b64?v=1',
  './manifest.webmanifest','./icon.svg'
];

const withSafeHtml=async response=>{
  if(!response||!response.ok)return response;
  let text=await response.clone().text();

  // Force the fixed startup/click CSS and safe v6 bootstrap.
  text=text.replace('./v3-hotfix.css?v=1','./v3-hotfix.css?v=2');
  text=text.replace('./visuals-v4.js?v=1','./visuals-v4.js?v=2');

  // Older service-worker versions injected v6 directly into HTML. Remove those
  // tags if they ever appear in a cached/upstream copy: v6 must load only via
  // visuals-v4.js, which suppresses the problematic program MutationObserver.
  text=text.replace(/\s*<link rel="stylesheet" href="\.\/workout-program-v6\.css\?v=\d+">/g,'');
  text=text.replace(/\s*<script src="\.\/v6-sprite\.js\?v=\d+"><\/script>/g,'');
  text=text.replace(/\s*<script src="\.\/workout-program-v6\.js\?v=\d+"><\/script>/g,'');

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
        .then(withSafeHtml)
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
