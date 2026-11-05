(() => {
  const STORAGE_KEY = 'rinlo2-feedback-v1';
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const params = new URLSearchParams(location.search);
  const localOnly = params.get('local') === '1';
  const enabled = !localOnly
    && config.supabaseDataEnabled === true
    && Boolean(auth?.enabled && base && publishableKey);
  const allowed = new Set(['helpful', 'not_helpful']);

  let feedback = loadLocal();
  let syncPromise = null;

  function normalize(input = {}) {
    const decisionId = String(input.decisionId || input.client_decision_id || '').trim().slice(0, 160);
    const value = String(input.feedback || '').trim();
    if (!decisionId || !allowed.has(value)) return null;
    const source = ['text','photo','voice'].includes(String(input.source || input.decision_source || ''))
      ? String(input.source || input.decision_source)
      : null;
    const stage = ['choosing','preparing','ready'].includes(String(input.stage || input.decision_stage || ''))
      ? String(input.stage || input.decision_stage)
      : null;
    const state = ['fits_well','fits_with_adjustment','better_alternative','needs_clarification']
      .includes(String(input.state || input.decision_state || ''))
      ? String(input.state || input.decision_state)
      : null;
    return {
      decisionId,
      feedback: value,
      source,
      stage,
      state,
      context: input.context && typeof input.context === 'object' && !Array.isArray(input.context)
        ? input.context
        : {},
      createdAt: input.createdAt || input.created_at || new Date().toISOString(),
      updatedAt: input.updatedAt || input.updated_at || new Date().toISOString(),
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map(normalize).filter(Boolean).slice(0, 200) : [];
    } catch {
      return [];
    }
  }

  function saveLocal() {
    feedback.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    feedback = feedback.slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
  }

  async function request(path, options = {}) {
    if (!enabled) throw new Error('rinlo2_feedback_sync_disabled');
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
      const error = new Error(data?.message || data?.error || data?.hint || `rinlo2_feedback_${response.status}`);
      error.status = response.status;
      error.code = data?.code || null;
      throw error;
    }
    return { data, session };
  }

  function toRow(item, userId) {
    return {
      user_id: userId,
      client_decision_id: item.decisionId,
      feedback: item.feedback,
      decision_source: item.source,
      decision_stage: item.stage,
      decision_state: item.state,
      context: item.context || {},
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  function fromRow(row) {
    return normalize({
      decisionId: row.client_decision_id,
      feedback: row.feedback,
      source: row.decision_source,
      stage: row.decision_stage,
      state: row.decision_state,
      context: row.context,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async function upsertRemote(item) {
    if (!enabled || !item?.decisionId) return null;
    const session = await auth.ensureSession();
    const { data } = await request('/rest/v1/rinlo_decision_feedback?on_conflict=user_id,client_decision_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(toRow(item, session.user.id)),
    });
    return Array.isArray(data) ? data[0] : data;
  }

  function setFeedback(decision, value) {
    if (!decision?.id || !allowed.has(value)) throw new Error('invalid_rinlo_feedback');
    const existing = feedback.find((item) => item.decisionId === decision.id);
    const now = new Date().toISOString();
    const item = normalize({
      decisionId: decision.id,
      feedback: value,
      source: decision.source || 'text',
      stage: decision.stage || null,
      state: decision.decisionState || null,
      context: {
        hadAlternative: Boolean(decision.alternative),
        selectedKind: decision.selected?.kind || null,
        memoryAppliedCount: Number(decision.memoryAppliedCount || 0),
        verdictTitle: String(decision.title || '').slice(0, 120),
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    const index = feedback.findIndex((entry) => entry.decisionId === item.decisionId);
    if (index >= 0) feedback[index] = item;
    else feedback.unshift(item);
    saveLocal();

    window.dispatchEvent(new CustomEvent('rinlo2:feedback-changed', {
      detail: { feedback: JSON.parse(JSON.stringify(item)) },
    }));
    if (enabled) {
      upsertRemote(item).catch((error) => console.warn('Rinlo feedback background sync failed', error));
    }
    return JSON.parse(JSON.stringify(item));
  }

  function getFeedback(decisionId) {
    const item = feedback.find((entry) => entry.decisionId === String(decisionId || ''));
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  function getRecentStats(days = 30) {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    const recent = feedback.filter((item) => {
      const time = new Date(item.updatedAt || item.createdAt || 0).getTime();
      return Number.isFinite(time) && time >= cutoff;
    });
    const helpful = recent.filter((item) => item.feedback === 'helpful').length;
    const notHelpful = recent.filter((item) => item.feedback === 'not_helpful').length;
    return { total: recent.length, helpful, notHelpful };
  }

  async function fetchRecent(days = 90) {
    if (!enabled) return [];
    const start = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString();
    const query = [
      'select=*',
      `updated_at=gte.${encodeURIComponent(start)}`,
      'order=updated_at.desc',
      'limit=200',
    ].join('&');
    const { data } = await request(`/rest/v1/rinlo_decision_feedback?${query}`, { method: 'GET' });
    return (Array.isArray(data) ? data : []).map(fromRow).filter(Boolean);
  }

  function mergeRemote(items = []) {
    const byDecision = new Map(feedback.map((item) => [item.decisionId, item]));
    items.forEach((incoming) => {
      const item = normalize(incoming);
      if (!item) return;
      const local = byDecision.get(item.decisionId);
      if (!local || new Date(item.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
        byDecision.set(item.decisionId, item);
      }
    });
    feedback = [...byDecision.values()];
    saveLocal();
  }

  async function syncLocal() {
    if (!enabled) return { pushed: 0, pulled: 0 };

    // Pull first so a newer rating from another client wins before we push.
    const remote = await fetchRecent(90);
    mergeRemote(remote);

    let pushed = 0;
    for (const item of feedback) {
      try {
        await upsertRemote(item);
        pushed += 1;
      } catch (error) {
        console.warn('Rinlo feedback sync push failed', error);
      }
    }

    window.dispatchEvent(new CustomEvent('rinlo2:feedback-sync', {
      detail: { status: 'synced', pushed, pulled: remote.length },
    }));
    return { pushed, pulled: remote.length };
  }

  function scheduleSync() {
    if (!enabled) return Promise.resolve({ pushed: 0, pulled: 0 });
    if (!syncPromise) {
      syncPromise = syncLocal()
        .catch((error) => {
          console.warn('Rinlo feedback sync failed', error);
          return { pushed: 0, pulled: 0, error };
        })
        .finally(() => { syncPromise = null; });
    }
    return syncPromise;
  }

  window.addEventListener('online', scheduleSync);
  setTimeout(scheduleSync, 0);

  window.Rinlo2Feedback = {
    version: 'v2-sync-safe',
    enabled,
    localOnly,
    setFeedback,
    getFeedback,
    getAll: () => feedback.map((item) => JSON.parse(JSON.stringify(item))),
    getRecentStats,
    fetchRecent,
    syncNow: scheduleSync,
  };
})();
