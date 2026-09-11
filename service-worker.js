const CACHE='rinlo-pwa-v43';
const ASSETS=[
  './pwa.html',
  './v07.html?rev=24',
  './runtime-config.js?rev=39',
  './rinlo-supabase-auth-v1.js?rev=38',
  './rinlo-supabase-transport-v1.js?rev=39',
  './rinlo-supabase-action-transport-v1.js?rev=43',
  './food-catalog.js?rev=24',
  './pwa-enhancements.js?rev=24',
  './pwa-api.js?rev=24',
  './pwa-sync.js?rev=24',
  './pwa-state-sync.js?rev=24',
  './pwa-profile-sync.js?rev=24',
  './pwa-account-sync.js?rev=24',
  './ui-polish.js?rev=36',
  './rinlo-polish-v03.js?rev=36',
  './rinlo-onboarding-v01.js?rev=24',
  './rinlo-plan-v01.js?rev=37',
  './rinlo-insights-v01.js?rev=24',
  './rinlo-profile-v01.js?rev=24',
  './rinlo-system-v01.js?rev=35',
  './rinlo-core-ui-v1.js?rev=25',
  './rinlo-scale-pass-v1.js?rev=29',
  './rinlo-functional-v1.js?rev=30',
  './rinlo-stability-v1.js?rev=35',
  './rinlo-server-sync-v1.js?rev=42',
  './rinlo-action-sync-v1.js?rev=42',
  './rinlo-server-restore-v1.js?rev=33',
  './rinlo-wordmark.js?rev=30',
  './rinlo-settings-bridge-v1.js?rev=34',
  './rinlo-logo.svg?rev=31',
  './manifest.webmanifest',
  './icon.svg?rev=31'
];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || url.pathname.includes('/api/')) return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match(event.request).then(r=>r||caches.match('./pwa.html')))
    );
    return;
  }

  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});