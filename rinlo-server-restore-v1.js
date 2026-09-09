(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const APP_KEY = 'healthy-action-v07';

  function hasLocalProfile() {
    try { return Boolean(JSON.parse(localStorage.getItem(APP_KEY) || '{}').profile); }
    catch { return false; }
  }

  function reopenApp() {
    const win = frame.contentWindow;
    if (!win || !hasLocalProfile()) return false;
    try {
      win.eval('db = load()');
      win.render?.();
      win.show?.('today');
      return true;
    } catch (error) {
      console.warn('Rinlo restored profile UI activation deferred', error);
      return false;
    }
  }

  async function restoreIfNeeded() {
    if (!api.enabled || hasLocalProfile() || !window.RinloServerSync) return;
    try {
      await window.RinloServerSync.syncNow({ pullAfter: true });
      reopenApp();
    } catch (error) {
      api.lastSyncError = String(error?.message || error);
      console.warn('Rinlo bootstrap restore deferred', error);
    }
  }

  function mount() {
    if (hasLocalProfile()) return;
    setTimeout(restoreIfNeeded, 180);
    setTimeout(() => {
      if (hasLocalProfile()) reopenApp();
      else restoreIfNeeded();
    }, 900);
  }

  frame.addEventListener('load', mount);
  window.addEventListener('online', () => { if (!hasLocalProfile()) restoreIfNeeded(); });
  setTimeout(mount, 0);
})();