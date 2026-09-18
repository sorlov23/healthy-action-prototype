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
      updated_at: profile.updatedAt || new Date().toISOString(),
    };
  }

  function fromRow(row) {
    return {
      goal: row?.goal || null,
      currentWeight: row?.current_weight_kg == null ? null : Number(row.current_weight_kg),
      targetWeight: row?.target_weight_kg == null ? null : Number(row.target_weight_kg),
      priorities: Array.isArray(row?.priorities) ? row.priorities : [],
      updatedAt: row?.updated_at || null,
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

  function timeOf(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function emitSync(detail) {
    window.dispatchEvent(new CustomEvent('rinlo2:profile-sync', { detail }));
  }

  async function syncNow() {
    if (!enabled) {
      const result = { status: 'local-only' };
      emitSync(result);
      return result;
    }
    if (syncing) return syncing;
    syncing = (async () => {
      const local = window.Rinlo2Foundation?.getDecisionProfile?.() || {};
      const remote = await fetchProfile();

      if (remote && meaningful(local)) {
        const localTime = timeOf(local.updatedAt);
        const remoteTime = timeOf(remote.updatedAt);

        if (localTime > remoteTime) {
          const saved = await upsertProfile(local);
          const result = { status: 'pushed', profile: saved, reason: 'local-newer' };
          emitSync(result);
          return result;
        }

        window.Rinlo2Foundation?.applyDecisionProfile?.(remote, {
          silent: true,
          updatedAt: remote.updatedAt || null,
        });
        const result = { status: remoteTime > localTime ? 'pulled' : 'synced', profile: remote, reason: 'remote-newer-or-equal' };
        emitSync(result);
        return result;
      }

      if (remote) {
        window.Rinlo2Foundation?.applyDecisionProfile?.(remote, {
          silent: true,
          updatedAt: remote.updatedAt || null,
        });
        const result = { status: 'pulled', profile: remote, reason: 'remote-only' };
        emitSync(result);
        return result;
      }

      if (meaningful(local)) {
        const saved = await upsertProfile(local);
        const result = { status: 'pushed', profile: saved, reason: 'local-only' };
        emitSync(result);
        return result;
      }

      const result = { status: 'empty' };
      emitSync(result);
      return result;
    })().catch((error) => {
      console.warn('Rinlo profile sync failed', error);
      const result = { status: 'offline', error };
      emitSync({ status: 'offline', error: String(error?.message || error) });
      return result;
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
    version: 'v2-conflict-aware',
    enabled,
    localOnly,
    fetchProfile,
    upsertProfile,
    syncNow,
  };
})();