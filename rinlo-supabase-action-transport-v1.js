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

  async function rpc(name, body) {
    if (!transport.enabled || !base || !publishableKey) throw new Error('supabase_action_transport_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token) throw new Error('no_supabase_session');
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw errorFromResponse(response, data || {});
    return data;
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
      if (Array.isArray(result.actions)) {
        result.actions = result.actions.map((action) => ({ ...action, serverId: action.serverId || action.id }));
      }
      if (result.currentAction) result.currentAction = { ...result.currentAction, serverId: result.currentAction.serverId || result.currentAction.id };
    }
    return result;
  };

  transport.actionSyncVersion = 'v1';
})();