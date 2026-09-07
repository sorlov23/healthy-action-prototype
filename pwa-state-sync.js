(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const timeoutMs = Math.max(500, Number(config.apiTimeoutMs || 2500));
  const SESSION_KEY = 'ha_api_session_v1';

  function localDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function authorizedJson(path, options = {}, retry = true) {
    if (!api.enabled || !api.base || typeof api.ensureSession !== 'function') return null;
    const session = await api.ensureSession();
    if (!session) return null;
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
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && retry) {
        localStorage.removeItem(SESSION_KEY);
        return authorizedJson(path, options, false);
      }
      if (!response.ok) throw new Error(data.error || `api_${response.status}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  api.saveWeight = (weightKg, measuredAt = new Date().toISOString()) => authorizedJson('/api/v1/weight/logs', {
    method: 'POST',
    body: JSON.stringify({ weightKg, measuredAt }),
  });

  api.addDailyMetrics = (day, payload) => authorizedJson('/api/v1/daily/metrics', {
    method: 'POST',
    body: JSON.stringify({ day, ...payload }),
  });

  api.setDailyHabit = (day, habit, done) => authorizedJson(`/api/v1/daily/habits/${encodeURIComponent(habit)}`, {
    method: 'PUT',
    body: JSON.stringify({ day, done }),
  });

  api.getDayOverview = (day, timezoneOffsetMinutes = new Date().getTimezoneOffset()) => authorizedJson(
    `/api/v1/day?day=${encodeURIComponent(day)}&timezoneOffsetMinutes=${encodeURIComponent(timezoneOffsetMinutes)}`
  );

  function background(promise, label) {
    if (!promise) return;
    Promise.resolve(promise)
      .then(() => { api.lastSyncAt = Date.now(); api.lastSyncError = null; })
      .catch((error) => {
        api.lastSyncError = String(error?.message || error);
        console.warn(`Healthy Action ${label} sync failed; local data kept`, error);
      });
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    if (win.__healthyStateSyncPatched) return;
    if (typeof win.addWater !== 'function' || typeof win.addSteps !== 'function' || typeof win.saveWeight !== 'function') {
      if (attempt < 30) setTimeout(() => patchFrame(attempt + 1), 50);
      return;
    }
    win.__healthyStateSyncPatched = true;

    let viewDate = new Date();
    viewDate.setHours(12, 0, 0, 0);
    win.__haViewDay = localDayKey(viewDate);

    if (typeof win.shiftDay === 'function') {
      const originalShiftDay = win.shiftDay.bind(win);
      win.shiftDay = function(delta) {
        viewDate.setDate(viewDate.getDate() + Number(delta || 0));
        win.__haViewDay = localDayKey(viewDate);
        return originalShiftDay(delta);
      };
    }

    const originalSaveWeight = win.saveWeight.bind(win);
    win.saveWeight = function() {
      const weightKg = Number(String(doc.getElementById('weightInput')?.value || '').replace(',', '.'));
      const result = originalSaveWeight();
      if (api.enabled && Number.isFinite(weightKg) && weightKg >= 30 && weightKg <= 300) {
        background(api.saveWeight(weightKg), 'weight');
      }
      return result;
    };

    const originalAddWater = win.addWater.bind(win);
    win.addWater = function(value) {
      const delta = Number(value || 0);
      const result = originalAddWater(value);
      if (api.enabled && Number.isFinite(delta) && delta !== 0) {
        background(api.addDailyMetrics(win.__haViewDay || localDayKey(), { waterMlDelta: Math.round(delta), stepsDelta: 0 }), 'water');
      }
      return result;
    };

    const originalAddSteps = win.addSteps.bind(win);
    win.addSteps = function(value) {
      const delta = Number(value || 0);
      const result = originalAddSteps(value);
      if (api.enabled && Number.isFinite(delta) && delta !== 0) {
        background(api.addDailyMetrics(win.__haViewDay || localDayKey(), { waterMlDelta: 0, stepsDelta: Math.round(delta) }), 'steps');
      }
      return result;
    };

    if (typeof win.toggleHabit === 'function') {
      const originalToggleHabit = win.toggleHabit.bind(win);
      win.toggleHabit = function(habit) {
        const result = originalToggleHabit(habit);
        let done = null;
        try { done = Boolean(win.day?.().habits?.[habit]); } catch {}
        if (api.enabled && done !== null && ['vape', 'fastfood', 'water'].includes(habit)) {
          background(api.setDailyHabit(win.__haViewDay || localDayKey(), habit, done), 'habit');
        }
        return result;
      };
    }
  }

  frame.addEventListener('load', () => patchFrame());
  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0);
  } catch {}
})();
