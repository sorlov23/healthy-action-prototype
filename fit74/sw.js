const CACHE='fit74-v20-rollback-visible';
const ASSETS=[
  './',
  './v3.css?v=3','./v3-hotfix.css?v=5','./v3.js?v=3',
  './workout.css?v=4','./workout.js?v=4',
  './shift-schedule.css?v=1','./shift-schedule.js?v=1',
  './visuals-v4.css?v=1','./visuals-v4.js?v=4','./visual-assets-v5.js?v=2',
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

  // Hard rollback: force the stable startup/visual files and remove every v6 layer.
  text=text.replace(/\.\/v3-hotfix\.css\?v=\d+/g,'./v3-hotfix.css?v=5');
  text=text.replace(/\.\/visuals-v4\.js\?v=\d+/g,'./visuals-v4.js?v=4');
  text=text.replace(/\s*<link rel="stylesheet" href="\.\/workout-program-v6\.css\?v=\d+">/g,'');
  text=text.replace(/\s*<script src="\.\/v6-sprite\.js\?v=\d+"><\/script>/g,'');
  text=text.replace(/\s*<script src="\.\/workout-program-v6\.js\?v=\d+"><\/script>/g,'');

  if(text.includes('visual-assets-v5.js?v=1')){
    text=text.replaceAll('visual-assets-v5.js?v=1','visual-assets-v5.js?v=2');
  }else if(!text.includes('visual-assets-v5.js')){
    text=text.replace(
      '<script src="./visuals-v4.js?v=4"></script>',
      '<script src="./visuals-v4.js?v=4"></script>\n<script src="./visual-assets-v5.js?v=2"></script>'
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
        .then(withFit74Html)
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
