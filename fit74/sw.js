const CACHE='fit74-v13-visuals-v4';
const ASSETS=['./','./v3.css?v=3','./v3-hotfix.css?v=1','./v3.js?v=3','./workout.css?v=4','./workout.js?v=4','./shift-schedule.css?v=1','./shift-schedule.js?v=1','./visuals-v4.css?v=1','./visuals-v4.js?v=1','./manifest.webmanifest','./icon.svg'];

const withHtmlTechniqueV3=async response=>{
  if(!response||!response.ok)return response;
  const text=(await response.clone().text())
    .replaceAll('./technique.css?v=2','./technique.css?v=3')
    .replaceAll('./technique.js?v=2','./technique.js?v=3');
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
  const url=new URL(e.request.url);

  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request,{cache:'no-store'})
        .then(withHtmlTechniqueV3)
        .then(r=>{if(r?.ok)caches.open(CACHE).then(c=>c.put('./',r.clone()));return r})
        .catch(()=>caches.match('./'))
    );
    return;
  }

  if(url.pathname.endsWith('/technique.js')){
    const fresh=new Request(new URL('./technique.js?v=3&build=direct11',self.location.href),{cache:'no-store'});
    e.respondWith(fetch(fresh).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put('./technique.js?v=3',r.clone()));return r}).catch(()=>caches.match('./technique.js?v=3')));
    return;
  }

  if(url.pathname.endsWith('/technique.css')){
    const fresh=new Request(new URL('./technique.css?v=3&build=direct11',self.location.href),{cache:'no-store'});
    e.respondWith(fetch(fresh).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put('./technique.css?v=3',r.clone()));return r}).catch(()=>caches.match('./technique.css?v=3')));
    return;
  }

  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./')))
  );
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs[0]?cs[0].focus():self.clients.openWindow('./')))
});