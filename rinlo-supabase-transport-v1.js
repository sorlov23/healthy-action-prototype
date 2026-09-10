(() => {
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const enabled = config.supabaseDataEnabled === true && Boolean(auth?.enabled && base && publishableKey);
  const APP_KEY = 'healthy-action-v07';
  const OUTBOX_KEY = 'rinlo-sync-outbox-v1';

  const numberOrNull = (value) => value == null ? null : Number(value);
  const parseBody = (options = {}) => {
    if (!options.body) return {};
    if (typeof options.body === 'string') return JSON.parse(options.body);
    return options.body;
  };

  function errorFromResponse(response, data) {
    const message = data?.message || data?.error_description || data?.error || data?.hint || `supabase_data_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code || null;
    return error;
  }

  async function requestData(path, options = {}) {
    if (!enabled) throw new Error('supabase_data_disabled');
    const session = await auth.ensureSession();
    if (!session?.access_token) throw new Error('no_supabase_session');
    const headers = {
      Accept: 'application/json',
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(`${base}${path}`, {
      ...options,
      cache: 'no-store',
      headers,
    });
    if (response.status === 204) return { response, data: null };
    const data = await response.json().catch(() => null);
    if (!response.ok) throw errorFromResponse(response, data || {});
    return { response, data };
  }

  async function rest(table, query = '', options = {}) {
    const suffix = query ? `?${query}` : '';
    return requestData(`/rest/v1/${table}${suffix}`, options);
  }

  async function rpc(name, body) {
    const { data } = await requestData(`/rest/v1/rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    });
    return data;
  }

  function mapProfile(row) {
    if (!row) return null;
    return {
      userId: row.user_id,
      startWeightKg: numberOrNull(row.start_weight_kg),
      targetWeightKg: numberOrNull(row.target_weight_kg),
      heightCm: numberOrNull(row.height_cm),
      ageYears: numberOrNull(row.age_years),
      sex: row.sex,
      activity: row.activity,
      focuses: row.focuses || [],
      primaryGoal: row.primary_goal,
      secondaryGoals: row.secondary_goals || [],
      calorieTrackingEnabled: row.calorie_tracking_enabled !== false,
      calorieTarget: numberOrNull(row.calorie_target),
      proteinTargetG: numberOrNull(row.protein_target_g),
      stepTarget: numberOrNull(row.step_target),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function profileRow(userId, payload) {
    return {
      user_id: userId,
      start_weight_kg: payload.startWeightKg ?? null,
      target_weight_kg: payload.targetWeightKg ?? null,
      height_cm: payload.heightCm ?? null,
      age_years: payload.ageYears ?? null,
      sex: payload.sex ?? null,
      activity: payload.activity ?? null,
      focuses: Array.isArray(payload.focuses) ? payload.focuses : [],
      primary_goal: payload.primaryGoal ?? null,
      secondary_goals: Array.isArray(payload.secondaryGoals) ? payload.secondaryGoals : [],
      calorie_tracking_enabled: payload.calorieTrackingEnabled !== false,
      calorie_target: payload.calorieTarget ?? null,
      protein_target_g: payload.proteinTargetG ?? null,
      step_target: payload.stepTarget ?? null,
      updated_at: new Date().toISOString(),
    };
  }

  function mapCheckin(row) {
    if (!row) return null;
    return {
      day: String(row.day),
      wellbeing: row.wellbeing,
      energy: numberOrNull(row.energy),
      sleepQuality: numberOrNull(row.sleep_quality),
      sleepMinutes: numberOrNull(row.sleep_minutes),
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapWeight(row, replayed = false) {
    if (!row) return null;
    return {
      id: row.id,
      clientEventId: row.client_event_id || null,
      measuredAt: row.measured_at,
      weightKg: Number(row.weight_kg),
      createdAt: row.created_at,
      replayed,
    };
  }

  function mapFood(row, replayed = false) {
    if (!row) return null;
    return {
      id: row.id,
      clientEventId: row.client_event_id || null,
      eatenAt: row.eaten_at,
      source: row.source,
      originalText: row.original_text,
      totalKcal: Number(row.total_kcal || 0),
      totalProtein: Number(row.total_protein_g || 0),
      createdAt: row.created_at,
      replayed,
      items: [],
    };
  }

  function mapMetrics(row, day) {
    if (!row) return { day, waterMl: 0, steps: 0, habits: {} };
    return {
      day: String(row.day || day),
      waterMl: Number(row.water_ml || 0),
      steps: Number(row.steps || 0),
      habits: row.habit_flags || {},
      updatedAt: row.updated_at,
    };
  }

  function mapAction(row) {
    return {
      id: row.id,
      day: String(row.day),
      kind: row.kind,
      title: row.title,
      rationale: row.rationale,
      effortMinutes: numberOrNull(row.effort_minutes),
      source: row.source,
      status: row.status,
      context: row.context || {},
      suggestedAt: row.suggested_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    };
  }

  function localDayUtcRange(day, timezoneOffsetMinutes = 0) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day));
    if (!match) throw new Error('invalid_day');
    const [, y, m, d] = match;
    const startMs = Date.UTC(Number(y), Number(m) - 1, Number(d)) + Number(timezoneOffsetMinutes || 0) * 60_000;
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(startMs + 86_400_000).toISOString(),
    };
  }

  async function selectRows(table, query) {
    const { data } = await rest(table, query, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  }

  async function upsertProfile(payload) {
    const session = await auth.ensureSession();
    const userId = session.user.id;
    const { data } = await rest('profiles', 'on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(profileRow(userId, payload)),
    });
    return { profile: mapProfile(Array.isArray(data) ? data[0] : data) };
  }

  async function upsertCheckin(day, payload) {
    const session = await auth.ensureSession();
    const row = {
      user_id: session.user.id,
      day,
      wellbeing: payload.wellbeing,
      energy: payload.energy ?? null,
      sleep_quality: payload.sleepQuality ?? null,
      sleep_minutes: payload.sleepMinutes ?? null,
      note: payload.note?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data } = await rest('daily_checkins', 'on_conflict=user_id,day', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
    return { checkin: mapCheckin(Array.isArray(data) ? data[0] : data) };
  }

  async function existingByClientEvent(table, clientEventId) {
    if (!clientEventId) return null;
    const rows = await selectRows(table, `select=*&client_event_id=eq.${encodeURIComponent(clientEventId)}&limit=1`);
    return rows[0] || null;
  }

  async function createFood(payload) {
    const session = await auth.ensureSession();
    const existing = await existingByClientEvent('food_logs', payload.clientEventId);
    if (existing) return mapFood(existing, true);
    const row = {
      user_id: session.user.id,
      client_event_id: payload.clientEventId || null,
      eaten_at: payload.eatenAt || new Date().toISOString(),
      source: payload.source || 'text',
      original_text: payload.originalText || null,
      total_kcal: Number(payload.totalKcal || 0),
      total_protein_g: Number(payload.totalProtein || 0),
      updated_at: new Date().toISOString(),
    };
    try {
      const { data } = await rest('food_logs', '', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      return mapFood(Array.isArray(data) ? data[0] : data, false);
    } catch (error) {
      if (error.code !== '23505' || !payload.clientEventId) throw error;
      const replay = await existingByClientEvent('food_logs', payload.clientEventId);
      if (!replay) throw error;
      return mapFood(replay, true);
    }
  }

  async function createWeight(payload) {
    const session = await auth.ensureSession();
    const existing = await existingByClientEvent('weight_logs', payload.clientEventId);
    if (existing) return mapWeight(existing, true);
    const row = {
      user_id: session.user.id,
      client_event_id: payload.clientEventId || null,
      measured_at: payload.measuredAt || new Date().toISOString(),
      weight_kg: Number(payload.weightKg),
    };
    try {
      const { data } = await rest('weight_logs', '', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      return mapWeight(Array.isArray(data) ? data[0] : data, false);
    } catch (error) {
      if (error.code !== '23505' || !payload.clientEventId) throw error;
      const replay = await existingByClientEvent('weight_logs', payload.clientEventId);
      if (!replay) throw error;
      return mapWeight(replay, true);
    }
  }

  async function updateFood(id, payload) {
    const row = {
      eaten_at: payload.eatenAt || new Date().toISOString(),
      source: payload.source || 'text',
      original_text: payload.originalText || null,
      total_kcal: Number(payload.totalKcal || 0),
      total_protein_g: Number(payload.totalProtein || 0),
      updated_at: new Date().toISOString(),
    };
    const { data } = await rest('food_logs', `id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved) { const error = new Error('not_found'); error.status = 404; throw error; }
    return mapFood(saved, false);
  }

  async function updateWeight(id, payload) {
    const row = {
      measured_at: payload.measuredAt || new Date().toISOString(),
      weight_kg: Number(payload.weightKg),
    };
    const { data } = await rest('weight_logs', `id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved) { const error = new Error('not_found'); error.status = 404; throw error; }
    return mapWeight(saved, false);
  }

  async function deleteRow(table, id) {
    const { data } = await rest(table, `id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { const error = new Error('not_found'); error.status = 404; throw error; }
    return { ok: true };
  }

  async function bootstrap(day, timezoneOffsetMinutes) {
    const range = localDayUtcRange(day, timezoneOffsetMinutes);
    const commonTime = `gte.${encodeURIComponent(range.start)}`;
    const endTime = `lt.${encodeURIComponent(range.end)}`;
    const [profiles, foodRows, metricsRows, weightRows, dayWeightRows, checkins, actionRows] = await Promise.all([
      selectRows('profiles', 'select=*&limit=1'),
      selectRows('food_logs', `select=*&eaten_at=${commonTime}&eaten_at=${endTime}&order=eaten_at.asc`),
      selectRows('daily_metrics', `select=*&day=eq.${encodeURIComponent(day)}&limit=1`),
      selectRows('weight_logs', 'select=*&order=measured_at.desc&limit=30'),
      selectRows('weight_logs', `select=*&measured_at=${commonTime}&measured_at=${endTime}&order=measured_at.desc&limit=1`),
      selectRows('daily_checkins', `select=*&day=eq.${encodeURIComponent(day)}&limit=1`),
      selectRows('rinlo_actions', `select=*&day=eq.${encodeURIComponent(day)}&order=suggested_at.desc`),
    ]);
    const foods = foodRows.map((row) => mapFood(row, false));
    const totals = foods.reduce((acc, item) => {
      acc.kcal += Number(item.totalKcal || 0);
      acc.protein += Number(item.totalProtein || 0);
      return acc;
    }, { kcal: 0, protein: 0 });
    const actions = actionRows.map(mapAction);
    return {
      profile: mapProfile(profiles[0]),
      day: {
        day,
        food: { day, items: foods, totals },
        metrics: mapMetrics(metricsRows[0], day),
        weight: mapWeight(dayWeightRows[0], false),
      },
      weights: weightRows.map((row) => mapWeight(row, false)),
      checkin: mapCheckin(checkins[0]),
      actions,
      currentAction: actions.find((item) => ['suggested', 'accepted'].includes(item.status)) || null,
      serverTime: new Date().toISOString(),
    };
  }

  async function compatibilityRequest(path, options = {}) {
    if (!enabled) throw new Error('supabase_data_disabled');
    const url = new URL(path, 'https://rinlo.local');
    const method = String(options.method || 'GET').toUpperCase();
    const body = parseBody(options);

    if (url.pathname === '/api/v1/profile' && method === 'PUT') return upsertProfile(body);
    const checkin = /^\/api\/v1\/checkins\/(\d{4}-\d{2}-\d{2})$/.exec(url.pathname);
    if (checkin && method === 'PUT') return upsertCheckin(checkin[1], body);
    if (url.pathname === '/api/v1/food/logs' && method === 'POST') return createFood(body);
    if (url.pathname === '/api/v1/weight/logs' && method === 'POST') return createWeight(body);
    if (url.pathname === '/api/v1/daily/metrics' && method === 'POST') {
      return rpc('rinlo_apply_metric_operation', {
        p_operation_id: body.operationId,
        p_day: body.day,
        p_water_ml_delta: Number(body.waterMlDelta || 0),
        p_steps_delta: Number(body.stepsDelta || 0),
      });
    }
    const habit = /^\/api\/v1\/daily\/habits\/([^/]+)$/.exec(url.pathname);
    if (habit && method === 'PUT') {
      return rpc('rinlo_set_daily_habit', {
        p_day: body.day,
        p_habit: decodeURIComponent(habit[1]),
        p_done: Boolean(body.done),
      });
    }
    const foodById = /^\/api\/v1\/food\/logs\/([^/]+)$/.exec(url.pathname);
    if (foodById && method === 'PUT') return updateFood(decodeURIComponent(foodById[1]), body);
    if (foodById && method === 'DELETE') return deleteRow('food_logs', decodeURIComponent(foodById[1]));
    const weightById = /^\/api\/v1\/weight\/logs\/([^/]+)$/.exec(url.pathname);
    if (weightById && method === 'PUT') return updateWeight(decodeURIComponent(weightById[1]), body);
    if (weightById && method === 'DELETE') return deleteRow('weight_logs', decodeURIComponent(weightById[1]));
    if (url.pathname === '/api/v1/bootstrap' && method === 'GET') {
      return bootstrap(
        url.searchParams.get('day'),
        Number(url.searchParams.get('timezoneOffsetMinutes') || 0),
      );
    }
    throw new Error(`unsupported_supabase_transport_route:${method}:${url.pathname}`);
  }

  function hasLocalProfile() {
    try { return Boolean(JSON.parse(localStorage.getItem(APP_KEY) || '{}').profile); }
    catch { return false; }
  }

  function hasOutbox() {
    try { return (JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') || []).length > 0; }
    catch { return false; }
  }

  window.RinloSupabaseTransport = {
    version: 'v1',
    enabled,
    request: compatibilityRequest,
    ensureSession: () => auth.ensureSession(),
    shouldAutoSync: () => Boolean(auth.getSession?.() || hasLocalProfile() || hasOutbox()),
    localDayUtcRange,
  };
})();
