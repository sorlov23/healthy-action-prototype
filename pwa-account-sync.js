(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const timeoutMs = Math.max(500, Number(config.apiTimeoutMs || 2500));
  const SESSION_KEY = 'ha_api_session_v1';
  const APP_KEY = 'healthy-action-v07';

  function localDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function requestWithSession(path, options = {}) {
    if (!api.enabled || !api.base) return null;
    const session = typeof api.getSession === 'function' ? api.getSession() : null;
    if (!session?.token) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${api.base}${path}`, {
        ...options,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (response.status === 204) return { ok: true };
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `api_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  api.bootstrap = async (day = localDayKey(), timezoneOffsetMinutes = new Date().getTimezoneOffset()) => {
    if (!api.enabled || typeof api.ensureSession !== 'function') return null;
    await api.ensureSession();
    return requestWithSession(`/api/v1/bootstrap?day=${encodeURIComponent(day)}&timezoneOffsetMinutes=${encodeURIComponent(timezoneOffsetMinutes)}`);
  };

  api.deleteAccount = async () => {
    if (!api.enabled) return null;
    const session = typeof api.getSession === 'function' ? api.getSession() : null;
    if (!session) return { ok: true, localOnly: true };
    const result = await requestWithSession('/api/v1/account', { method: 'DELETE' });
    localStorage.removeItem(SESSION_KEY);
    return result;
  };

  function clearLocalHealthyActionData() {
    localStorage.removeItem(APP_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('ha_food_usage');
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    if (!win) return;
    if (win.__healthyAccountSyncPatched) return;
    if (typeof win.resetAll !== 'function') {
      if (attempt < 30) setTimeout(() => patchFrame(attempt + 1), 50);
      return;
    }
    win.__healthyAccountSyncPatched = true;

    win.resetAll = async function() {
      if (!win.confirm('Удалить все данные Healthy Action? Это действие нельзя отменить.')) return;

      if (api.enabled && typeof api.getSession === 'function' && api.getSession()) {
        try {
          await api.deleteAccount();
        } catch (error) {
          console.warn('Healthy Action account deletion failed', error);
          const localOnly = win.confirm('Не удалось подтвердить удаление данных с сервера. Удалить только данные на этом устройстве?');
          if (!localOnly) return;
        }
      }

      clearLocalHealthyActionData();
      win.location.reload();
    };
  }

  frame.addEventListener('load', () => patchFrame());
  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0);
  } catch {}
})();
