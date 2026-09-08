const CACHE='rinlo-pwa-v25';
const ASSETS=[
  './pwa.html',
  './v07.html?rev=25',
  './runtime-config.js?rev=25',
  './food-catalog.js?rev=25',
  './pwa-enhancements.js?rev=25',
  './pwa-api.js?rev=25',
  './pwa-sync.js?rev=25',
  './pwa-state-sync.js?rev=25',
  './pwa-profile-sync.js?rev=25',
  './pwa-account-sync.js?rev=25',
  './ui-polish.js?rev=25',
  './rinlo-wordmark.js?rev=25',
  './rinlo-polish-v03.js?rev=25',
  './rinlo-onboarding-v01.js?rev=25',
  './rinlo-plan-v01.js?rev=25',
  './rinlo-insights-v01.js?rev=25',
  './rinlo-profile-v01.js?rev=25',
  './rinlo-system-v01.js?rev=25',
  './rinlo-system-v02.js?rev=25',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response && response.ok) cache.put(request,response.clone());
    return response;
  }catch(error){
    const cached=await cache.match(request);
    if(cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.includes('/api/')) return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request).catch(()=>caches.match('./pwa.html')));
    return;
  }

  event.respondWith(networkFirst(request));
});