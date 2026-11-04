(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  let context = null, settings = {}, registration = null, workerTask = null;
  let subscription = null, config = null, connected = false, busy = false, message = '';
  let pendingCheckin = false;
  const appleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const needsInstall = () => appleMobile() && !standalone();
  const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));

  function render(next) {
    if (next) settings = next;
    const hint = q('#reminderHint'), connect = q('#connectPushBtn'), test = q('#testPushBtn');
    if (!hint || !connect || !test) return;
    let text;
    if (needsInstall()) text = 'На iPhone открой Fit74 с экрана «Домой». Если ярлыка ещё нет: Safari → Поделиться → На экран «Домой».';
    else if (!supported()) text = 'Этот браузер не поддерживает push-уведомления. На iPhone используй Fit74 с экрана «Домой».';
    else if (Notification.permission === 'denied') text = 'Уведомления запрещены. Разреши их в настройках уведомлений Fit74 на телефоне, затем открой приложение снова.';
    else if (message) text = message;
    else if (!config || !registration) text = 'Проверяем подключение уведомлений…';
    else if (connected && settings.reminder_enabled) text = 'Это устройство подключено. Напомним, даже когда Fit74 закрыт, если день ещё не зачтён.';
    else if (connected) text = 'Устройство подключено. Включи напоминания переключателем выше и сохрани настройки.';
    else text = 'На этом устройстве уведомления ещё не подключены. Нажми кнопку ниже и разреши их.';
    if (connected && config && !config.schedulerHealthy) text += ' Расписание временно недоступно — проверь подключение позже.';
    hint.textContent = text;
    connect.textContent = connected ? 'Переподключить уведомления' : 'Подключить уведомления';
    connect.disabled = busy || needsInstall() || !supported() || !config || !registration || Notification.permission === 'denied';
    test.hidden = !connected;
    test.disabled = busy || !connected;
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    if (workerTask) return workerTask;
    workerTask = (async () => {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      await reg.update();
      if (!reg.active) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Не удалось подготовить уведомления. Открой Fit74 ещё раз.')), 10000);
          const worker = reg.installing || reg.waiting;
          if (!worker) { clearTimeout(timer); reject(new Error('Сервис уведомлений не запустился.')); return; }
          const check = () => { if (worker.state === 'activated') { clearTimeout(timer); resolve(); } };
          worker.addEventListener('statechange', check); check();
        });
      }
      registration = reg;
      return reg;
    })().catch(error => { workerTask = null; throw error; });
    return workerTask;
  }

  async function refreshConnection() {
    if (!context || needsInstall() || !supported()) { render(); return; }
    const owner = context;
    message = ''; render();
    try {
      const [ready, server] = await Promise.all([registerWorker(), context.publicConfig()]);
      if (owner !== context) return;
      registration = ready; config = server;
      subscription = await registration.pushManager.getSubscription();
      if (subscription && Notification.permission === 'granted') {
        const status = await context.request({ action: 'status', endpoint: subscription.endpoint });
        if (owner !== context) return;
        connected = status.connected;
      } else connected = false;
    } catch (error) { if (owner === context) message = error.message || 'Не удалось проверить уведомления. Попробуй позже.'; }
    if (owner === context) render();
  }

  async function connect() {
    if (busy || !context || !config || !registration || !supported() || needsInstall()) return;
    busy = true; message = ''; render();
    try {
      if (subscription) {
        const previous = subscription;
        await previous.unsubscribe();
        subscription = null;
        context.request({ action: 'unsubscribe', endpoint: previous.endpoint }).catch(() => {});
      }
      // Subscribe directly inside the click handler, before any network request or await.
      // Reconnection already has permission; its old subscription is removed first.
      const pending = registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(config.publicKey) });
      subscription = await pending;
      await context.request({ action: 'subscribe', subscription: subscription.toJSON() });
      connected = true;
    } catch (error) {
      connected = false;
      message = Notification.permission === 'denied' ? '' :
        'Не удалось подключить уведомления. ' + (error.message || 'Попробуй ещё раз.');
    } finally { busy = false; render(); }
  }

  async function test() {
    if (busy || !connected || !subscription) return;
    busy = true; message = ''; render();
    try {
      await context.request({ action: 'test', endpoint: subscription.endpoint });
      message = 'Проверка отправлена. Если уведомления не видно, проверь настройки Fit74 и режим «Фокусирование» на телефоне.';
    } catch (error) { message = error.message; }
    finally { busy = false; render(); }
  }

  async function disconnect() {
    if (!supported()) return;
    const reg = registration || await navigator.serviceWorker.getRegistration('./');
    const sub = subscription || await reg?.pushManager.getSubscription();
    if (sub) {
      // Local unsubscribe prevents delivery even when the cloud is temporarily unreachable.
      await sub.unsubscribe();
      await context?.request({ action: 'unsubscribe', endpoint: sub.endpoint });
    }
    subscription = null; connected = false;
  }

  function start(next) {
    settings = next.settings;
    if (context?.userId === next.userId) { render(); return; }
    context = next; connected = false; subscription = null; config = null;
    q('#connectPushBtn')?.addEventListener('click', connect);
    q('#testPushBtn')?.addEventListener('click', test);
    refreshConnection();
    if (pendingCheckin) { pendingCheckin = false; context.openCheckin(); }
  }
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'fit74-open-checkin') {
      if (context) context.openCheckin(); else pendingCheckin = true;
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && context && !busy) refreshConnection();
  });
  window.Fit74Push = { start, render, registerWorker, disconnect };
})();
