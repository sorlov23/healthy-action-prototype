(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const timeoutMs = Math.max(500, Number(config.apiTimeoutMs || 2500));
  const SESSION_KEY = 'ha_api_session_v1';
  const rawCatalog = Array.isArray(window.HEALTHY_FOOD_CATALOG) ? window.HEALTHY_FOOD_CATALOG : [];

  function normalizeFood(record) {
    if (Array.isArray(record)) {
      return {
        id: String(record[0]), name: String(record[1]), kcal100: Number(record[3] || 0),
        protein100: Number(record[4] || 0), portion: Number(record[5] || 100), icon: String(record[6] || '🍽️'),
      };
    }
    return {
      ...record,
      id: String(record.id), name: String(record.name), kcal100: Number(record.kcal100 || 0),
      protein100: Number(record.protein100 || 0), portion: Number(record.portion || 100), icon: String(record.icon || '🍽️'),
    };
  }

  const catalog = new Map(rawCatalog.map(normalizeFood).map((food) => [food.id, food]));

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!session?.token || !session?.expiresAt) return null;
      if (new Date(session.expiresAt).getTime() <= Date.now() + 60_000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
    }));
  }

  async function fetchJson(path, options = {}) {
    if (!api.enabled || !api.base) throw new Error('api_disabled');
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
        },
      });
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

  async function createSession() {
    const session = await fetchJson('/api/v1/auth/guest', { method: 'POST' });
    saveSession(session);
    return readSession();
  }

  async function ensureSession() {
    if (!api.enabled) return null;
    return readSession() || createSession();
  }

  async function authorizedJson(path, options = {}, retry = true) {
    const session = await ensureSession();
    if (!session) throw new Error('no_session');
    try {
      return await fetchJson(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${session.token}`,
        },
      });
    } catch (error) {
      if (retry && error.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        await createSession();
        return authorizedJson(path, options, false);
      }
      throw error;
    }
  }

  api.ensureSession = ensureSession;
  api.getSession = readSession;
  api.saveFoodLog = async (payload) => {
    if (!api.enabled) return null;
    return authorizedJson('/api/v1/food/logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };
  api.getFoodLogs = async (day, timezoneOffsetMinutes = new Date().getTimezoneOffset()) => {
    if (!api.enabled) return null;
    return authorizedJson(`/api/v1/food/logs?day=${encodeURIComponent(day)}&timezoneOffsetMinutes=${encodeURIComponent(timezoneOffsetMinutes)}`);
  };

  function buildItems(win) {
    const selectedIds = Array.isArray(win.__selectedFoodIds) ? win.__selectedFoodIds : [];
    const photoById = new Map((win.__photoFood?.selected || []).map((item) => [item.id, Number(item.grams)]));
    return [...new Set(selectedIds)].map((id) => {
      const food = catalog.get(String(id));
      if (!food) return null;
      const grams = photoById.get(food.id) || food.portion;
      return {
        foodId: food.id,
        name: food.name,
        grams,
        kcal: Math.round(food.kcal100 * grams / 100),
        protein: Math.round(food.protein100 * grams / 100),
        confidence: 1,
      };
    }).filter(Boolean);
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    if (win.__healthySyncPatched) return;
    if (typeof win.saveFood !== 'function') {
      if (attempt < 30) setTimeout(() => patchFrame(attempt + 1), 50);
      return;
    }
    win.__healthySyncPatched = true;

    const originalSaveFood = win.saveFood.bind(win);
    win.saveFood = function() {
      const text = String(doc.getElementById('foodText')?.value || '').trim();
      const totalKcal = Number(doc.getElementById('foodCal')?.value || 0);
      const totalProtein = Number(doc.getElementById('foodProtein')?.value || 0);
      const source = text.startsWith('📷') ? 'photo' : 'text';
      const payload = {
        eatenAt: new Date().toISOString(),
        source,
        originalText: text,
        totalKcal: Number.isFinite(totalKcal) ? totalKcal : 0,
        totalProtein: Number.isFinite(totalProtein) ? totalProtein : 0,
        items: buildItems(win),
      };

      const result = originalSaveFood();
      if (api.enabled) {
        api.saveFoodLog(payload)
          .then(() => { api.lastSyncAt = Date.now(); api.lastSyncError = null; })
          .catch((error) => {
            api.lastSyncError = String(error?.message || error);
            console.warn('Healthy Action background sync failed; local data kept', error);
          });
      }
      return result;
    };

    if (api.enabled) {
      ensureSession().catch((error) => console.warn('Healthy Action session bootstrap deferred', error));
    }
  }

  frame.addEventListener('load', () => patchFrame());
  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0);
  } catch {}
})();
