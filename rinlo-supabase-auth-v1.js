(() => {
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const enabled = config.supabaseAuthEnabled !== false && Boolean(base && publishableKey);
  const storageKey = 'rinlo_supabase_session_v1';
  const refreshSkewSeconds = 90;
  let ensurePromise = null;

  function normalizeSession(value) {
    if (!value?.access_token || !value?.refresh_token || !value?.user?.id) return null;
    const expiresAt = Number(value.expires_at || 0)
      || Math.floor(Date.now() / 1000) + Math.max(1, Number(value.expires_in || 3600));
    return {
      access_token: String(value.access_token),
      refresh_token: String(value.refresh_token),
      token_type: String(value.token_type || 'bearer'),
      expires_in: Number(value.expires_in || Math.max(1, expiresAt - Math.floor(Date.now() / 1000))),
      expires_at: expiresAt,
      user: value.user,
    };
  }

  function readSession() {
    try {
      return normalizeSession(JSON.parse(localStorage.getItem(storageKey) || 'null'));
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  }

  function saveSession(value) {
    const session = normalizeSession(value);
    if (!session) throw new Error('invalid_supabase_session');
    localStorage.setItem(storageKey, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(storageKey);
  }

  function sessionIsFresh(session) {
    return Boolean(session?.access_token && Number(session.expires_at || 0) > Math.floor(Date.now() / 1000) + refreshSkewSeconds);
  }

  async function authRequest(path, body, bearer = publishableKey) {
    if (!enabled) throw new Error('supabase_auth_disabled');
    const response = await fetch(`${base}/auth/v1${path}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.msg || data.error_description || data.error || `supabase_auth_${response.status}`);
      error.status = response.status;
      error.code = data.code || data.error_code || null;
      throw error;
    }
    return data;
  }

  async function createAnonymousSession() {
    const data = await authRequest('/signup', {
      data: { client: 'rinlo-pwa', schema_version: 1 },
      gotrue_meta_security: { captcha_token: null },
    });
    const session = saveSession(data);
    window.dispatchEvent(new CustomEvent('rinlo:supabase-auth', { detail: { event: 'SIGNED_IN', userId: session.user.id } }));
    return session;
  }

  async function refreshSession(current) {
    const data = await authRequest('/token?grant_type=refresh_token', {
      refresh_token: current.refresh_token,
    });
    // GoTrue may omit user in edge cases; preserve the known user identity.
    const session = saveSession({ ...data, user: data.user || current.user });
    window.dispatchEvent(new CustomEvent('rinlo:supabase-auth', { detail: { event: 'TOKEN_REFRESHED', userId: session.user.id } }));
    return session;
  }

  async function ensureSessionInternal() {
    const current = readSession();
    if (sessionIsFresh(current)) return current;
    if (current?.refresh_token) {
      try {
        return await refreshSession(current);
      } catch (error) {
        // A revoked/expired refresh token means this anonymous identity cannot be
        // recovered on this device. Fall back to a fresh anonymous user.
        if (![400, 401, 403].includes(Number(error?.status || 0))) throw error;
        clearSession();
      }
    }
    return createAnonymousSession();
  }

  async function ensureSession() {
    if (!enabled) return null;
    if (!ensurePromise) {
      ensurePromise = ensureSessionInternal().finally(() => { ensurePromise = null; });
    }
    return ensurePromise;
  }

  async function getAccessToken() {
    const session = await ensureSession();
    return session?.access_token || null;
  }

  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) ensurePromise = null;
  });

  window.RinloSupabaseAuth = {
    version: 'v1',
    enabled,
    projectUrl: base,
    ensureSession,
    getSession: readSession,
    getAccessToken,
    getUserId: () => readSession()?.user?.id || null,
    clearLocalSession: clearSession,
  };
})();
