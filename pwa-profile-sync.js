(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const timeoutMs = Math.max(500, Number(config.apiTimeoutMs || 2500));
  const SESSION_KEY = 'ha_api_session_v1';

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
        await api.ensureSession();
        return authorizedJson(path, options, false);
      }
      if (!response.ok) throw new Error(data.error || `api_${response.status}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  api.getProfile = async () => {
    if (!api.enabled) return null;
    return authorizedJson('/api/v1/profile');
  };

  api.saveProfile = async (profile) => {
    if (!api.enabled) return null;
    return authorizedJson('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  };

  function num(value, fallback = 0) {
    const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function patchFrame(attempt = 0) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    if (win.__healthyProfileSyncPatched) return;
    if (typeof win.finishOnboarding !== 'function' || typeof win.targets !== 'function') {
      if (attempt < 30) setTimeout(() => patchFrame(attempt + 1), 50);
      return;
    }
    win.__healthyProfileSyncPatched = true;

    const originalFinishOnboarding = win.finishOnboarding.bind(win);
    win.finishOnboarding = function() {
      const draft = {
        startWeightKg: num(doc.getElementById('obWeight')?.value, 85),
        targetWeightKg: num(doc.getElementById('obGoal')?.value, 75),
        heightCm: num(doc.getElementById('obHeight')?.value, 176),
        ageYears: Math.round(num(doc.getElementById('obAge')?.value, 37)),
        activity: doc.getElementById('obActivity')?.value || 'low',
        focuses: [...doc.querySelectorAll('[data-h].sel')].map((node) => node.dataset.h).filter(Boolean).slice(0, 2),
      };

      const result = originalFinishOnboarding();

      if (api.enabled) {
        let targets = { cal: 1900, protein: 130, steps: 8000 };
        try { targets = win.targets(); } catch {}
        const payload = {
          ...draft,
          calorieTarget: Math.round(Number(targets.cal || 1900)),
          proteinTargetG: Math.round(Number(targets.protein || 130)),
          stepTarget: Math.round(Number(targets.steps || 8000)),
        };

        api.saveProfile(payload)
          .then(() => { api.lastSyncAt = Date.now(); api.lastSyncError = null; })
          .catch((error) => {
            api.lastSyncError = String(error?.message || error);
            console.warn('Healthy Action profile sync failed; local profile kept', error);
          });
      }

      return result;
    };
  }

  frame.addEventListener('load', () => patchFrame());
  try {
    if (frame.contentDocument?.readyState === 'complete') setTimeout(() => patchFrame(), 0);
  } catch {}
})();
