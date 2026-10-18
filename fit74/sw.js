// Fit74 emergency cache reset.
// Temporary service worker: clear all Fit74 caches, go network-only, then unregister.
self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('fit74-')).map(k=>caches.delete(k)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request,{cache:'no-store'}));
});
