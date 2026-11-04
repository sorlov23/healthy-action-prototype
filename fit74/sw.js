// Push worker only: application requests continue through the normal network.
// Old Fit74 offline caches are removed; local drafts and authentication are untouched.
self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('fit74-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  const notification = data.notification || data;
  event.waitUntil(self.registration.showNotification(notification.title || 'Fit74', {
    body: notification.body || 'Загляни в Fit74 на короткий чек-ин.',
    icon: './apple-touch-icon.png?v=17.0',
    tag: data.tag || 'fit74-daily',
    data: { url: './index.html?fit74v=19&checkin=1' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'fit74-open-checkin' });
    } else await self.clients.openWindow(new URL('./index.html?fit74v=19&checkin=1', self.location.href).href);
  })());
});
