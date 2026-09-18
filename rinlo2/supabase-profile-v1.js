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

  let syncing = null;

  async function request(path, options = {}) {
    if (!enabled) throw new Error('rinlo_profile_sync_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token || !session?.user?.id) throw new Error('rinlo_profile_no_session');

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
      const error = new Error(data?.message || data?.error || `rinlo_profile_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return { data, session };
  }

  function meaningful(profile = {}) {
    return Boolean(
      profile.goal
      || profile.currentWeight
      || profile.targetWeight
      || (Array.isArray(profile.priorities) && profile.priorities.length)
    );
  }

  function toRow(profile, userId) {
    return {
      user_id: userId,
      goal: profile.goal || null,
      current_weight_kg: profile.currentWeight || null,
      target_weight_kg: profile.targetWeight || null,
      priorities: Array.isArray(profile.priorities) ? profile.priorities : [],
      updated_at: new Date().toISOString(),
    };
  }

  function fromRow(row) {
    return {
      goal: row?.goal || null,
      currentWeight: row?.current_weight_kg == null ? null : Number(row.current_weight_kg),
      targetWeight: row?.target_weight_kg == null ? null : Number(row.target_weight_kg),
      priorities: Array.isArray(row?.priorities) ? row.priorities : [],
    };
  }

  async function fetchProfile() {
    if (!enabled) return null;
    const { data } = await request('/rest/v1/rinlo_decision_profiles?select=*&limit=1', { method: 'GET' });
    return Array.isArray(data) && data[0] ? fromRow(data[0]) : null;
  }

  async function upsertProfile(profile) {
    if (!enabled) return null;
    const session = await auth.ensureSession();
    const row = toRow(profile, session.user.id);
    const { data } = await request('/rest/v1/rinlo_decision_profiles?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
    return Array.isArray(data) ? fromRow(data[0]) : profile;
  }

  async function syncNow() {
    if (!enabled) return { status: 'local-only' };
    if (syncing) return syncing;
    syncing = (async () => {
      const local = window.Rinlo2Foundation?.getDecisionProfile?.() || {};
      const remote = await fetchProfile();

      if (remote) {
        window.Rinlo2Foundation?.applyDecisionProfile?.(remote, { silent: true });
        return { status: 'pulled', profile: remote };
      }
      if (meaningful(local)) {
        const saved = await upsertProfile(local);
        return { status: 'pushed', profile: saved };
      }
      return { status: 'empty' };
    })().catch((error) => {
      console.warn('Rinlo profile sync failed', error);
      return { status: 'offline', error };
    }).finally(() => {
      syncing = null;
    });
    return syncing;
  }

  window.addEventListener('rinlo2:profile-changed', (event) => {
    if (!enabled) return;
    const profile = event.detail?.profile;
    if (!profile) return;
    upsertProfile(profile).catch((error) => console.warn('Rinlo profile background sync failed', error));
  });

  window.addEventListener('online', syncNow);
  setTimeout(syncNow, 0);

  window.Rinlo2ProfileSync = {
    version: 'v1',
    enabled,
    localOnly,
    fetchProfile,
    upsertProfile,
    syncNow,
  };
})();