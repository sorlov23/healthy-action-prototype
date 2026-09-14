(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const APP_KEY = 'healthy-action-v07';
  let restoreWatch = null;

  function hasLocalProfile() {
    try { return Boolean(JSON.parse(localStorage.getItem(APP_KEY) || '{}').profile); }
    catch { return false; }
  }

  function stopRestoreWatch() {
    if (!restoreWatch) return;
    clearInterval(restoreWatch);
    restoreWatch = null;
  }

  function reopenApp() {
    const win = frame.contentWindow;
    if (!win || !hasLocalProfile()) return false;
    try {
      win.eval('db = load()');
      // Leave first-run UI before render hooks reconcile the restored product state.
      win.show?.('today');
      const nav = win.document?.getElementById('nav');
      if (nav) nav.style.display = 'grid';
      const fab = win.document?.getElementById('fab');
      if (fab) fab.style.display = 'block';
      win.render?.();
      stopRestoreWatch();
      return true;
    } catch (error) {
      console.warn('Rinlo restored profile UI activation deferred', error);
      return false;
    }
  }

  function watchForRestoredProfile() {
    if (restoreWatch || hasLocalProfile()) return;
    const startedAt = Date.now();
    restoreWatch = setInterval(() => {
      if (hasLocalProfile()) {
        reopenApp();
        return;
      }
      if (Date.now() - startedAt >= 12000) stopRestoreWatch();
    }, 120);
  }

  async function restoreIfNeeded() {
    if (!api.enabled || !window.RinloServerSync) return;
    if (hasLocalProfile()) {
      reopenApp();
      return;
    }
    watchForRestoredProfile();
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
    watchForRestoredProfile();
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