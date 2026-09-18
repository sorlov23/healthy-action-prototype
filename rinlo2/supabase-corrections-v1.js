(() => {
  const STORAGE_KEY = 'rinlo2-corrections-v1';
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const params = new URLSearchParams(location.search);
  const localOnly = params.get('local') === '1';
  const enabled = !localOnly
    && config.supabaseDataEnabled === true
    && Boolean(auth?.enabled && base && publishableKey);
  const allowedTypes = new Set(['dish', 'portion', 'ingredients', 'choice']);

  let corrections = loadLocal();
  let syncPromise = null;

  function makeId() {
    if (globalThis.crypto?.randomUUID) return `c-${crypto.randomUUID()}`;
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalize(input = {}) {
    const type = allowedTypes.has(String(input.type || input.correction_type || ''))
      ? String(input.type || input.correction_type)
      : null;
    const value = String(input.value || input.correction_value || '').trim().slice(0, 240);
    const decisionId = String(input.decisionId || input.client_decision_id || '').trim().slice(0, 160);
    if (!type || !value || !decisionId) return null;

    return {
      id: String(input.id || input.client_correction_id || makeId()),
      decisionId,
      type,
      value,
      dishName: String(input.dishName || input.dish_name || '').trim().slice(0, 160),
      payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
        ? input.payload
        : {},
      createdAt: input.createdAt || input.created_at || new Date().toISOString(),
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalize).filter(Boolean).slice(0, 100);
    } catch {
      return [];
    }
  }

  function saveLocal() {
    corrections.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    corrections = corrections.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections));
  }

  async function request(path, options = {}) {
    if (!enabled) throw new Error('rinlo2_corrections_sync_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token || !session?.user?.id) throw new Error('rinlo2_no_session');

    const response = await fetch(`${base}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.message || data?.error || data?.hint || `rinlo2_corrections_${response.status}`);
      error.status = response.status;
      error.code = data?.code || null;
      throw error;
    }
    return { data, session };
  }

  function toRow(correction, userId) {
    return {
      user_id: userId,
      client_correction_id: correction.id,
      client_decision_id: correction.decisionId,
      correction_type: correction.type,
      correction_value: correction.value,
      dish_name: correction.dishName || null,
      payload: correction.payload || {},
      created_at: correction.createdAt || new Date().toISOString(),
    };
  }

  function fromRow(row) {
    return normalize({
      id: row.client_correction_id,
      decisionId: row.client_decision_id,
      type: row.correction_type,
      value: row.correction_value,
      dishName: row.dish_name,
      payload: row.payload,
      createdAt: row.created_at,
    });
  }

  async function upsertCorrection(correction) {
    if (!enabled || !correction?.id) return null;
    const session = await auth.ensureSession();
    const row = toRow(correction, session.user.id);
    const { data } = await request('/rest/v1/rinlo_decision_corrections?on_conflict=user_id,client_correction_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
    return Array.isArray(data) ? data[0] : data;
  }

  function recentStartIso(days = 90) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function fetchRecent(days = 90) {
    if (!enabled) return [];
    const query = [
      'select=*',
      `created_at=gte.${encodeURIComponent(recentStartIso(days))}`,
      'order=created_at.desc',
      'limit=100',
    ].join('&');
    const { data } = await request(`/rest/v1/rinlo_decision_corrections?${query}`, { method: 'GET' });
    return (Array.isArray(data) ? data : []).map(fromRow).filter(Boolean);
  }

  function mergeCorrections(incoming = []) {
    const byId = new Map(corrections.map((item) => [item.id, item]));
    let added = 0;
    incoming.forEach((item) => {
      const normalized = normalize(item);
      if (!normalized || byId.has(normalized.id)) return;
      byId.set(normalized.id, normalized);
      added += 1;
    });
    corrections = [...byId.values()];
    saveLocal();
    return added;
  }

  function record(input = {}) {
    const correction = normalize({ ...input, id: input.id || makeId(), createdAt: input.createdAt || new Date().toISOString() });
    if (!correction) throw new Error('invalid_rinlo_correction');

    if (!corrections.some((item) => item.id === correction.id)) {
      corrections.unshift(correction);
      saveLocal();
    }

    window.dispatchEvent(new CustomEvent('rinlo2:correction-recorded', {
      detail: { correction: JSON.parse(JSON.stringify(correction)) },
    }));

    if (enabled) {
      upsertCorrection(correction).catch((error) => {
        console.warn('Rinlo correction background sync failed', error);
      });
    }
    return JSON.parse(JSON.stringify(correction));
  }

  function getRecentContext(days = 30, limit = 6) {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    return corrections
      .filter((item) => {
        const time = new Date(item.createdAt || 0).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, Math.max(1, Math.min(10, limit)))
      .map((item) => ({
        type: item.type,
        value: String(item.value || '').slice(0, 160),
        dishName: String(item.dishName || '').slice(0, 120),
      }));
  }

  async function syncLocal() {
    if (!enabled) return { pushed: 0, pulled: 0 };
    let pushed = 0;
    for (const correction of corrections) {
      try {
        await upsertCorrection(correction);
        pushed += 1;
      } catch (error) {
        console.warn('Rinlo correction sync push failed', error);
      }
    }

    const remote = await fetchRecent(90);
    const pulled = mergeCorrections(remote);
    window.dispatchEvent(new CustomEvent('rinlo2:corrections-sync', {
      detail: { status: 'synced', pushed, pulled },
    }));
    return { pushed, pulled };
  }

  function scheduleSync() {
    if (!enabled) return Promise.resolve({ pushed: 0, pulled: 0 });
    if (!syncPromise) {
      syncPromise = syncLocal()
        .catch((error) => {
          console.warn('Rinlo correction sync failed', error);
          window.dispatchEvent(new CustomEvent('rinlo2:corrections-sync', {
            detail: { status: 'offline', error: String(error?.message || error) },
          }));
          return { pushed: 0, pulled: 0, error };
        })
        .finally(() => { syncPromise = null; });
    }
    return syncPromise;
  }

  window.addEventListener('online', scheduleSync);
  setTimeout(scheduleSync, 0);

  window.Rinlo2Corrections = {
    version: 'v1',
    enabled,
    localOnly,
    record,
    getCorrections: () => corrections.map((item) => JSON.parse(JSON.stringify(item))),
    getRecentContext,
    fetchRecent,
    syncNow: scheduleSync,
  };
})();
