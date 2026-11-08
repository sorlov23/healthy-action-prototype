export const APP_ORIGIN = 'https://fit74.tatnet.app';
export const LEGACY_ORIGIN = 'https://fit74-tracker.onrender.com';
// Explicit allowlist: keep the old installed PWA usable during migration.
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, LEGACY_ORIGIN]);
export const TIME_ZONE = 'Europe/Moscow';

export function validSubscription(input) {
  try {
    const url = new URL(input?.endpoint);
    const allowed = url.hostname.endsWith('.push.apple.com') ||
      url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname.endsWith('.notify.windows.com');
    return allowed && url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && input.endpoint.length <= 4096 &&
      /^[A-Za-z0-9_-]{87}=?$/.test(input.keys?.p256dh || '') &&
      /^[A-Za-z0-9_-]{22}={0,2}$/.test(input.keys?.auth || '');
  } catch { return false; }
}

export function notificationPayload(day, test = false, tone = 'regular') {
  const title = test ? 'Fit74 · уведомления работают' :
    tone === 'shift' ? 'Fit74 · бережный ритм' :
    tone === 'return' ? 'Fit74 · ты всё ещё в игре' : 'Fit74 · день ещё открыт';
  const body = test ? 'Это проверка. Напомним в выбранное время, если день ещё не закрыт.' :
    tone === 'shift' ? 'После смены сон и восстановление важнее отчётности. Отметь день, когда будет удобно.' :
    tone === 'return' ? 'После перерыва достаточно одного небольшого шага. Ничего не нужно наверстывать.' :
    'Быстрый чек-ин займёт около 10 секунд. Загляни без догонялок.';
  const navigate = `${APP_ORIGIN}/index.html?fit74v=19&checkin=1`;
  // A visible declarative fallback also works in recent Safari if its worker is unavailable.
  return { web_push: 8030, notification: { title, body, navigate,
    icon: `${APP_ORIGIN}/apple-touch-icon.png?v=17.0` },
    title, body, url: navigate, tag: test ? 'fit74-push-test' : `fit74-daily-${day}` };
}

export function createHandler({ store, authenticate, push, now = () => new Date() }) {
  const baseHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-fit74-scheduler',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' };

  async function ensureKeys(config) {
    if (config.vapid_public && config.vapid_private) return config;
    // The conditional write keeps the first key pair if invocations overlap.
    const keys = push.generateVAPIDKeys();
    await store.initializeKeys(keys);
    return await store.config();
  }

  async function send(row, config, test = false) {
    const date = row.local_date || now().toISOString().slice(0, 10);
    try {
      let tone = 'regular';
      if (!test && typeof store.reminderContext === 'function') {
        try { tone = await store.reminderContext(row.endpoint, date); }
        catch { /* Context is optional; push must still be delivered. */ }
      }
      await push.sendNotification({ endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(notificationPayload(date, test, tone)), {
        vapidDetails: { subject: APP_ORIGIN, publicKey: config.vapid_public, privateKey: config.vapid_private },
        TTL: 1800, urgency: 'high', timeout: 10000,
      });
      if (!test) await store.sent(row.endpoint, date);
      return true;
    } catch (error) {
      const status = Number(error.statusCode) || 0;
      await store.failed(row.endpoint, status, status === 404 || status === 410);
      return false;
    }
  }

  return async function handler(req) {
    const requestOrigin = req.headers.get('origin');
    const headers = { ...baseHeaders,
      ...(ALLOWED_ORIGINS.has(requestOrigin) ? { 'Access-Control-Allow-Origin': requestOrigin } : {}) };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(req.method)) return reply(405, { error: 'Method not allowed' });
    try {
      const config = await store.config();
      if (!config) return reply(503, { error: 'Напоминания ещё настраиваются. Попробуй позже.' });
      if (req.method === 'GET') {
        if (!config.vapid_public) return reply(503, { error: 'Напоминания ещё настраиваются. Попробуй позже.' });
        return reply(200, { publicKey: config.vapid_public, timeZone: TIME_ZONE,
          schedulerHealthy: !!config.last_run_at && now() - new Date(config.last_run_at) < 5 * 60000 });
      }
      if (Number(req.headers.get('content-length')) > 16000) return reply(413, { error: 'Request too large' });
      const raw = await req.text();
      if (raw.length > 16000) return reply(413, { error: 'Request too large' });
      let body; try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid JSON' }); }
      if (body.action === 'dispatch') {
        const secret = req.headers.get('x-fit74-scheduler');
        if (!secret || secret !== config.scheduler_secret) return reply(401, { error: 'Unauthorized' });
        const ready = await ensureKeys(config);
        const rows = await store.claimDue();
        let sent = 0;
        for (const row of rows) if (await send(row, ready)) sent++;
        await store.heartbeat({ claimed: rows.length, sent });
        return reply(200, { claimed: rows.length, sent });
      }
      const user = await authenticate(req.headers.get('authorization'));
      if (!user) return reply(401, { error: 'Сессия завершена. Войди в Fit74 снова.' });
      if (body.action === 'subscribe') {
        if (!validSubscription(body.subscription)) return reply(400, { error: 'Некорректная push-подписка.' });
        await store.subscribe(user.id, body.subscription, TIME_ZONE);
        return reply(200, { connected: true });
      }
      if (typeof body.endpoint !== 'string' || body.endpoint.length > 4096) return reply(400, { error: 'Missing endpoint' });
      if (body.action === 'status') {
        const row = await store.owned(user.id, body.endpoint);
        return reply(200, { connected: !!row?.enabled, lastStatus: row?.last_status || null });
      }
      if (body.action === 'unsubscribe') {
        await store.disable(user.id, body.endpoint);
        return reply(200, { connected: false });
      }
      if (body.action === 'test') {
        const row = await store.claimTest(user.id, body.endpoint);
        if (!row) return reply(429, { error: 'Подключи уведомления. Повторная проверка доступна через минуту.' });
        const ok = await send(row, config, true);
        return ok ? reply(200, { sent: true }) : reply(502, { error: 'Не удалось доставить проверку. Переподключи уведомления.' });
      }
      return reply(400, { error: 'Unknown action' });
    } catch {
      // Never return subscription endpoints, VAPID secrets or upstream error bodies.
      console.error('Fit74 push: operation failed');
      return reply(503, { error: 'Сервис напоминаний временно недоступен. Попробуй ещё раз.' });
    }
  };
}
