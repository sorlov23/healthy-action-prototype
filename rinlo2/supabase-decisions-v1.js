(() => {
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const params = new URLSearchParams(location.search);
  const localOnly = params.get('local') === '1';
  const enabled = !localOnly
    && config.supabaseDataEnabled === true
    && Boolean(auth?.enabled && base && publishableKey);

  let syncPromise = null;

  function calorieRange(value) {
    const numbers = String(value || '').match(/\d+/g)?.map(Number) || [];
    if (!numbers.length) return { min: null, max: null };
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    return { min: numbers[0], max: numbers[1] };
  }

  function decisionState(decision) {
    if (['fits_well','fits_with_adjustment','better_alternative','needs_clarification'].includes(decision?.decisionState)) {
      return decision.decisionState;
    }
    if (/нужно уточнить/i.test(decision?.title || '')) return 'needs_clarification';
    if (decision?.tone === 'good') return 'fits_well';
    if (decision?.alternative) return 'fits_with_adjustment';
    return 'fits_well';
  }

  async function request(path, options = {}) {
    if (!enabled) throw new Error('rinlo2_supabase_disabled');
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
      const error = new Error(data?.message || data?.error || data?.hint || `rinlo2_supabase_${response.status}`);
      error.status = response.status;
      error.code = data?.code || null;
      throw error;
    }
    return { data, session };
  }

  function toRow(decision, userId) {
    const selected = decision?.selected || decision?.original || {};
    const range = calorieRange(selected.calories || decision?.calories);
    return {
      user_id: userId,
      client_decision_id: decision.id,
      source: decision.source || 'text',
      question: decision.question || '',
      decision_state: decisionState(decision),
      verdict_title: decision.title || 'Решение',
      explanation: decision.explanation || '',
      context_label: decision.context || null,
      fit_text: decision.fit || null,
      original_option: decision.original || {},
      alternative_option: decision.alternative || null,
      selected_option: selected,
      selected_kind: selected.kind === 'alternative' ? 'alternative' : 'original',
      calorie_min: range.min,
      calorie_max: range.max,
      source_metadata: {
        client: 'rinlo2-web-prototype',
        decision_version: 'v2.5',
        stage: decision.stage || null,
        actions_now: Array.isArray(decision.actionsNow) ? decision.actionsNow.slice(0, 3) : [],
        future_tip: decision.futureTip || '',
        vision: decision.vision || null,
        memory_applied_count: Number(decision.memoryAppliedCount || 0),
        memory_sources: Array.isArray(decision.memorySources)
          ? decision.memorySources.slice(0, 4)
          : [],
      },
      created_at: decision.createdAt || new Date().toISOString(),
      updated_at: decision.updatedAt || decision.createdAt || new Date().toISOString(),
    };
  }

  function fromRow(row) {
    const selected = row.selected_option || {};
    return {
      id: row.client_decision_id,
      source: row.source || 'text',
      question: row.question || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      title: row.verdict_title || 'Решение',
      icon: '✓',
      tone: row.decision_state === 'fits_well' ? 'good' : 'caution',
      explanation: row.explanation || '',
      calories: selected.calories
        || (row.calorie_min != null && row.calorie_max != null
          ? (row.calorie_min === row.calorie_max
            ? `~ ${row.calorie_min} ккал`
            : `~ ${row.calorie_min}–${row.calorie_max} ккал`)
          : ''),
      context: row.context_label || '',
      fit: row.fit_text || '',
      original: row.original_option || {},
      alternative: row.alternative_option || null,
      selected: {
        ...selected,
        kind: row.selected_kind === 'alternative' ? 'alternative' : 'original',
      },
      vision: row.source_metadata?.vision || null,
      stage: row.source_metadata?.stage || row.source_metadata?.vision?.stage || null,
      actionsNow: Array.isArray(row.source_metadata?.actions_now)
        ? row.source_metadata.actions_now.slice(0, 3)
        : (row.source_metadata?.vision?.actionsNow || []),
      futureTip: row.source_metadata?.future_tip || row.source_metadata?.vision?.futureTip || '',
      memoryAppliedCount: Number(row.source_metadata?.memory_applied_count || 0),
      memorySources: Array.isArray(row.source_metadata?.memory_sources)
        ? row.source_metadata.memory_sources.slice(0, 4)
        : [],
      decisionState: row.decision_state || null,
    };
  }

  async function upsertDecision(decision) {
    if (!enabled || !decision?.id) return null;
    const session = await auth.ensureSession();
    const row = toRow(decision, session.user.id);
    const { data } = await request('/rest/v1/rinlo_decisions?on_conflict=user_id,client_decision_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
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
    const { data } = await request(`/rest/v1/rinlo_decisions?${query}`, { method: 'GET' });
    return (Array.isArray(data) ? data : []).map(fromRow);
  }

  async function fetchToday() {
    return fetchRecent(1);
  }

  async function syncLocal() {
    if (!enabled) return { pushed: 0, pulled: 0 };
    const local = window.Rinlo2Decisions?.getDecisions?.() || [];
    let pushed = 0;
    for (const decision of local) {
      try {
        await upsertDecision(decision);
        pushed += 1;
      } catch (error) {
        console.warn('Rinlo decision sync push failed', error);
      }
    }

    const remote = await fetchRecent(90);
    const pulled = window.Rinlo2Decisions?.importDecisions?.(remote) || 0;
    window.dispatchEvent(new CustomEvent('rinlo2:sync', {
      detail: { status: 'synced', pushed, pulled }
    }));
    return { pushed, pulled };
  }

  function scheduleSync() {
    if (!enabled) return Promise.resolve({ pushed: 0, pulled: 0 });
    if (!syncPromise) {
      syncPromise = syncLocal()
        .catch((error) => {
          console.warn('Rinlo decision sync failed', error);
          window.dispatchEvent(new CustomEvent('rinlo2:sync', {
            detail: { status: 'offline', error: String(error?.message || error) }
          }));
          return { pushed: 0, pulled: 0, error };
        })
        .finally(() => { syncPromise = null; });
    }
    return syncPromise;
  }

  window.addEventListener('rinlo2:decision-saved', (event) => {
    if (!enabled) return;
    const decision = event.detail?.decision;
    upsertDecision(decision).catch((error) => {
      console.warn('Rinlo decision background sync failed', error);
    });
  });

  window.addEventListener('online', scheduleSync);
  setTimeout(scheduleSync, 0);

  window.Rinlo2Supabase = {
    version: 'v1.4-full-state-sync',
    enabled,
    localOnly,
    upsertDecision,
    fetchToday,
    fetchRecent,
    syncNow: scheduleSync,
  };
})();