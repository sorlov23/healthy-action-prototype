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
    const message = data?.message || data?.error_description || data?.error || data?.hint || `supabase_action_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code || null;
    return error;
  }

  async function authorizedRequest(path, options = {}) {
    if (!transport.enabled || !base || !publishableKey) throw new Error('supabase_action_transport_disabled');
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

  async function rpc(name, body) {
    return authorizedRequest(`/rest/v1/rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    });
  }

  async function feedbackByAction(actions) {
    const ids = [...new Set((actions || [])
      .filter((action) => action?.status === 'completed')
      .map((action) => action.serverId || action.id)
      .filter(Boolean))];
    if (!ids.length) return new Map();

    const filter = encodeURIComponent(`in.(${ids.join(',')})`);
    const rows = await authorizedRequest(
      `/rest/v1/rinlo_action_events?select=action_id,payload,created_at&event_type=eq.feedback&action_id=${filter}&order=created_at.desc`,
      { method: 'GET' },
    );
    const latest = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row?.action_id || latest.has(String(row.action_id))) continue;
      latest.set(String(row.action_id), {
        useful: Boolean(row.payload?.useful),
        at: row.created_at || null,
      });
    }
    return latest;
  }

  transport.request = async (path, options = {}) => {
    const url = new URL(path, 'https://rinlo.local');
    const method = String(options.method || 'GET').toUpperCase();
    const body = parseBody(options);

    if (url.pathname === '/api/v1/actions/import-local' && method === 'POST') {
      return rpc('rinlo_import_action', {
        p_client_action_id: body.clientActionId,
        p_day: body.day,
        p_kind: body.kind,
        p_title: body.title,
        p_rationale: body.rationale,
        p_effort_minutes: body.effortMinutes ?? null,
        p_context: body.context || {},
        p_suggested_at: body.suggestedAt || new Date().toISOString(),
      });
    }

    const actionEvent = /^\/api\/v1\/actions\/([^/]+)\/events$/.exec(url.pathname);
    if (actionEvent && method === 'POST') {
      return rpc('rinlo_add_action_event', {
        p_operation_id: body.operationId,
        p_action_id: decodeURIComponent(actionEvent[1]),
        p_event_type: body.eventType,
        p_reason_code: body.reasonCode ?? null,
        p_payload: body.payload || {},
      });
    }

    const result = await originalRequest(path, options);
    if (url.pathname === '/api/v1/bootstrap' && method === 'GET' && result) {
      const actions = Array.isArray(result.actions)
        ? result.actions.map((action) => ({ ...action, serverId: action.serverId || action.id }))
        : [];
      const feedback = await feedbackByAction(actions);
      result.actions = actions.map((action) => {
        const saved = feedback.get(String(action.serverId || action.id));
        return saved ? { ...action, feedback: saved } : action;
      });
      if (result.currentAction) {
        const serverId = result.currentAction.serverId || result.currentAction.id;
        const saved = feedback.get(String(serverId));
        result.currentAction = {
          ...result.currentAction,
          serverId,
          ...(saved ? { feedback: saved } : {}),
        };
      }
    }
    return result;
  };

  transport.actionSyncVersion = 'v1';
})();
