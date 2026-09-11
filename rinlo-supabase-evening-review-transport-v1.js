(() => {
  const transport = window.RinloSupabaseTransport;
  const auth = window.RinloSupabaseAuth;
  const config = window.HEALTHY_ACTION_CONFIG || {};
  if (!transport || !auth) return;

  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const originalRequest = transport.request.bind(transport);

  const parseBody = (options = {}) => {
    if (!options.body) return {};
    if (typeof options.body === 'string') return JSON.parse(options.body);
    return options.body;
  };

  function errorFromResponse(response, data) {
    const message = data?.message || data?.error_description || data?.error || data?.hint || `supabase_evening_review_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code || null;
    return error;
  }

  async function authorizedRequest(path, options = {}) {
    if (!transport.enabled || !base || !publishableKey) throw new Error('supabase_evening_review_transport_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token) throw new Error('no_supabase_session');
    const response = await fetch(`${base}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw errorFromResponse(response, data || {});
    return data;
  }

  function mapReview(row) {
    if (!row) return null;
    return {
      day: String(row.day),
      planFit: row.plan_fit,
      actionUseful: row.action_useful,
      mainActionId: row.main_action_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function selectReview(day) {
    const rows = await authorizedRequest(
      `/rest/v1/daily_evening_reviews?select=*&day=eq.${encodeURIComponent(day)}&limit=1`,
      { method: 'GET' },
    );
    return mapReview(Array.isArray(rows) ? rows[0] : rows);
  }

  async function upsertReview(day, payload) {
    const session = await auth.ensureSession();
    const rows = await authorizedRequest('/rest/v1/daily_evening_reviews?on_conflict=user_id,day', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: session.user.id,
        day,
        plan_fit: payload.planFit,
        action_useful: payload.actionUseful,
        main_action_id: payload.mainActionId || null,
        updated_at: new Date().toISOString(),
      }),
    });
    return { eveningReview: mapReview(Array.isArray(rows) ? rows[0] : rows) };
  }

  transport.request = async (path, options = {}) => {
    const url = new URL(path, 'https://rinlo.local');
    const method = String(options.method || 'GET').toUpperCase();
    const body = parseBody(options);
    const review = /^\/api\/v1\/evening-reviews\/(\d{4}-\d{2}-\d{2})$/.exec(url.pathname);

    if (review && method === 'PUT') return upsertReview(review[1], body);
    if (review && method === 'GET') return { eveningReview: await selectReview(review[1]) };

    const result = await originalRequest(path, options);
    if (url.pathname === '/api/v1/bootstrap' && method === 'GET' && result) {
      result.eveningReview = await selectReview(url.searchParams.get('day'));
    }
    return result;
  };

  transport.eveningReviewVersion = 'v1';
})();
