(() => {
  const frame = document.getElementById('app');
  const api = window.HealthyActionAPI;
  if (!frame || !api) return;

  const APP_KEY = 'healthy-action-v07';
  const OUTBOX_KEY = 'rinlo-sync-outbox-v1';
  const SESSION_KEY = 'ha_api_session_v1';
  let mounted = false;
  let draining = false;
  let inflightId = null;
  let retryTimer = null;

  const nowIso = () => new Date().toISOString();
  const uid = (prefix = 'op') => `${prefix}:${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const num = (value, fallback = 0) => {
    const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  function readDb() {
    try { return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeDb(db) { localStorage.setItem(APP_KEY, JSON.stringify(db)); }
  function readOutbox() {
    try {
      const value = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function writeOutbox(items) {
    if (!items.length) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  }
  function currentDayKey(win = frame.contentWindow) { return win?.__haViewDay || localDayKey(); }
  function findLocalEvent(day, localEventId) {
    const db = readDb();
    const event = (db.days?.[day]?.events || []).find((item) => String(item.id) === String(localEventId));
    return { db, event };
  }
  function updateLocalEvent(day, localEventId, patch) {
    const { db, event } = findLocalEvent(day, localEventId);
    if (!event) return false;
    Object.assign(event, patch);
    writeDb(db);
    return true;
  }
  function refreshFrame() {
    const win = frame.contentWindow;
    if (!win) return;
    try {
      win.eval('db = load()');
      win.render?.();
    } catch (error) { console.warn('Rinlo server sync refresh deferred', error); }
  }

  function enqueue(item, { replaceKey = null } = {}) {
    const items = readOutbox();
    const next = replaceKey
      ? items.filter((entry) => entry.replaceKey !== replaceKey || entry.id === inflightId)
      : items;
    next.push({ id: item.id || uid('sync'), createdAt: item.createdAt || nowIso(), attempts: 0, ...item, ...(replaceKey ? { replaceKey } : {}) });
    writeOutbox(next);
    scheduleDrain(20);
  }

  function updateQueuedCreate(localEventId, payload) {
    const target = String(localEventId);
    const items = readOutbox();
    let updated = false;
    for (const item of items) {
      if (item.localEventId === target && ['food-create', 'weight-create'].includes(item.kind)) {
        // Once a create request is in flight its payload is already fixed. Do not
        // pretend a localStorage rewrite can change that request; queue a dependent
        // update instead so the edit is applied after the create receives serverId.
        if (item.id === inflightId) continue;
        item.payload = payload;
        item.updatedAt = nowIso();
        updated = true;
      }
    }
    if (updated) writeOutbox(items);
    return updated;
  }

  function hasPendingCreate(localEventId) {
    const target = String(localEventId);
    return readOutbox().some((item) =>
      item.localEventId === target && ['food-create', 'weight-create'].includes(item.kind)
    );
  }

  function cancelPendingCreate(localEventId) {
    const target = String(localEventId);
    const items = readOutbox();
    const create = items.find((item) => item.localEventId === target && ['food-create', 'weight-create'].includes(item.kind));
    if (!create || create.id === inflightId) return false;
    writeOutbox(items.filter((item) => item.localEventId !== target));
    return true;
  }

  async function request(path, options = {}, retry = true) {
    if (!api.enabled || !api.base || typeof api.ensureSession !== 'function') throw new Error('api_disabled');
    const session = await api.ensureSession();
    if (!session?.token) throw new Error('no_session');
    const timeoutMs = Math.max(1000, Number(window.HEALTHY_ACTION_CONFIG?.apiTimeoutMs || 4000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${api.base}${path}`, {
        ...options,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (response.status === 401 && retry) {
        localStorage.removeItem(SESSION_KEY);
        return request(path, options, false);
      }
      if (response.status === 204) return { ok: true };
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `api_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }

  function foodPayload(event) {
    return {
      clientEventId: event.clientEventId,
      eatenAt: event.time || nowIso(),
      source: 'manual',
      originalText: String(event.text || ''),
      totalKcal: Math.max(0, num(event.cal, 0)),
      totalProtein: Math.max(0, num(event.protein, 0)),
      items: [],
    };
  }
  function weightPayload(event) {
    return { clientEventId: event.clientEventId, weightKg: num(event.weight, 0), measuredAt: event.time || nowIso() };
  }
  function profilePayload(win) {
    const profile = readDb().profile;
    if (!profile) return null;
    let targets = { cal: 1900, protein: 120, steps: 8000 };
    try { targets = win?.targets?.() || targets; } catch {}
    const startWeightKg = num(profile.weight ?? profile.startWeightKg, NaN);
    const targetWeightKg = num(profile.goal ?? profile.targetWeightKg, NaN);
    const heightCm = num(profile.height ?? profile.heightCm, NaN);
    const ageYears = Math.round(num(profile.age ?? profile.ageYears, NaN));
    if (![startWeightKg, targetWeightKg, heightCm, ageYears].every(Number.isFinite)) return null;
    return {
      startWeightKg, targetWeightKg, heightCm, ageYears,
      sex: profile.sex || null,
      activity: ['low', 'medium', 'high'].includes(profile.activity) ? profile.activity : 'low',
      focuses: Array.isArray(profile.habits) ? profile.habits.slice(0, 2) : [],
      primaryGoal: profile.primaryGoal || null,
      secondaryGoals: Array.isArray(profile.secondaryGoals) ? profile.secondaryGoals.slice(0, 3) : [],
      calorieTrackingEnabled: profile.calorieTrackingEnabled !== false,
      calorieTarget: Math.max(800, Math.round(num(targets.cal, 1900))),
      proteinTargetG: Math.max(20, Math.round(num(targets.protein, 120))),
      stepTarget: Math.max(1000, Math.round(num(targets.steps, 8000))),
    };
  }
  function checkinPayload(checkin) {
    if (!checkin?.wellbeing) return null;
    return {
      wellbeing: checkin.wellbeing,
      energy: checkin.energy ?? null,
      sleepQuality: checkin.sleepQuality ?? null,
      sleepMinutes: checkin.sleepMinutes ?? null,
      note: checkin.note ?? null,
    };
  }

  function patchDependentItems(localEventId, serverId) {
    const target = String(localEventId);
    const items = readOutbox();
    let changed = false;
    for (const item of items) {
      if (item.localEventId === target && !item.serverId) {
        item.serverId = serverId;
        changed = true;
      }
    }
    if (changed) writeOutbox(items);
  }

  async function processItem(item) {
    if (item.kind === 'profile-upsert') return request('/api/v1/profile', { method: 'PUT', body: JSON.stringify(item.payload) });
    if (item.kind === 'checkin-upsert') return request(`/api/v1/checkins/${encodeURIComponent(item.day)}`, { method: 'PUT', body: JSON.stringify(item.payload) });
    if (item.kind === 'food-create') {
      const result = await request('/api/v1/food/logs', { method: 'POST', body: JSON.stringify(item.payload) });
      if (result?.id) {
        updateLocalEvent(item.day, item.localEventId, { serverId: result.id, clientEventId: result.clientEventId || item.payload.clientEventId });
        patchDependentItems(item.localEventId, result.id);
      }
      return result;
    }
    if (item.kind === 'weight-create') {
      const result = await request('/api/v1/weight/logs', { method: 'POST', body: JSON.stringify(item.payload) });
      if (result?.id) {
        updateLocalEvent(item.day, item.localEventId, { serverId: result.id, clientEventId: result.clientEventId || item.payload.clientEventId });
        patchDependentItems(item.localEventId, result.id);
      }
      return result;
    }
    if (item.kind === 'metric-delta') {
      return request('/api/v1/daily/metrics', {
        method: 'POST',
        body: JSON.stringify({ operationId: item.operationId || item.id, day: item.day, waterMlDelta: Number(item.waterMlDelta || 0), stepsDelta: Number(item.stepsDelta || 0) }),
      });
    }
    if (item.kind === 'habit-set') return request(`/api/v1/daily/habits/${encodeURIComponent(item.habit)}`, { method: 'PUT', body: JSON.stringify({ day: item.day, done: Boolean(item.done) }) });
    if (item.kind === 'food-update') {
      if (!item.serverId) throw new Error('dependency_pending');
      const { clientEventId, ...payload } = item.payload;
      return request(`/api/v1/food/logs/${encodeURIComponent(item.serverId)}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    if (item.kind === 'weight-update') {
      if (!item.serverId) throw new Error('dependency_pending');
      const { clientEventId, ...payload } = item.payload;
      return request(`/api/v1/weight/logs/${encodeURIComponent(item.serverId)}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    if (item.kind === 'food-delete' || item.kind === 'weight-delete') {
      if (!item.serverId) throw new Error('dependency_pending');
      const base = item.kind === 'food-delete' ? '/api/v1/food/logs/' : '/api/v1/weight/logs/';
      try { return await request(`${base}${encodeURIComponent(item.serverId)}`, { method: 'DELETE' }); }
      catch (error) { if (error.status === 404) return { ok: true, alreadyDeleted: true }; throw error; }
    }
    throw new Error(`unknown_outbox_kind:${item.kind}`);
  }

  function markFailure(item, error) {
    const items = readOutbox();
    const current = items.find((entry) => entry.id === item.id);
    if (!current) return;
    current.attempts = Number(current.attempts || 0) + 1;
    current.lastError = String(error?.message || error);
    current.lastAttemptAt = nowIso();
    writeOutbox(items);
    api.lastSyncError = current.lastError;
  }

  async function drain() {
    if (draining || !api.enabled) return false;
    draining = true;
    clearTimeout(retryTimer);
    retryTimer = null;
    try {
      while (api.enabled) {
        const item = readOutbox()[0];
        if (!item) {
          api.lastSyncAt = Date.now();
          api.lastSyncError = null;
          return true;
        }
        inflightId = item.id;
        try {
          await processItem(item);
          writeOutbox(readOutbox().filter((entry) => entry.id !== item.id));
          api.lastSyncAt = Date.now();
          api.lastSyncError = null;
        } catch (error) {
          if (error?.message !== 'dependency_pending') markFailure(item, error);
          if (navigator.onLine !== false) scheduleDrain(Math.min(30000, 1000 * Math.max(2, Number(item.attempts || 0) + 1)));
          return false;
        } finally { inflightId = null; }
      }
      return false;
    } finally { draining = false; }
  }

  function scheduleDrain(delay = 0) {
    if (!api.enabled) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => drain().catch((error) => {
      api.lastSyncError = String(error?.message || error);
      console.warn('Rinlo outbox drain deferred', error);
    }), delay);
  }

  function mergeServerEvent(day, serverEvent) {
    const db = readDb();
    db.days ||= {};
    db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    const events = db.days[day].events ||= [];
    const existing = events.find((event) =>
      (serverEvent.serverId && String(event.serverId || '') === String(serverEvent.serverId))
      || (serverEvent.clientEventId && String(event.clientEventId || '') === String(serverEvent.clientEventId))
    );
    if (existing) Object.assign(existing, serverEvent);
    else events.push(serverEvent);
    writeDb(db);
  }

  function mergeBootstrap(payload, day) {
    if (!payload) return;
    const db = readDb();
    db.days ||= {};
    if (payload.profile) {
      const p = payload.profile;
      db.profile = {
        ...(db.profile || {}),
        weight: p.startWeightKg,
        goal: p.targetWeightKg,
        height: p.heightCm,
        age: p.ageYears,
        activity: p.activity || 'low',
        habits: Array.isArray(p.focuses) ? p.focuses : [],
        sex: p.sex || 'other',
        primaryGoal: p.primaryGoal || null,
        secondaryGoals: Array.isArray(p.secondaryGoals) ? p.secondaryGoals : [],
        calorieTrackingEnabled: p.calorieTrackingEnabled !== false,
      };
    }
    const serverDay = payload.day || {};
    const target = db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    target.events ||= [];
    target.habits ||= {};
    const pending = readOutbox();
    if (!pending.some((item) => item.day === day && item.kind === 'metric-delta') && serverDay.metrics) {
      target.water = Number(serverDay.metrics.waterMl || 0);
      target.steps = Number(serverDay.metrics.steps || 0);
    }
    if (!pending.some((item) => item.day === day && item.kind === 'habit-set') && serverDay.metrics?.habits) target.habits = { ...serverDay.metrics.habits };
    if (payload.checkin) target.rinloCheckin = payload.checkin;
    if (Array.isArray(payload.actions)) target.rinloActions = payload.actions;
    writeDb(db);

    for (const log of serverDay.food?.items || []) {
      mergeServerEvent(day, {
        id: log.clientEventId || log.id,
        serverId: log.id,
        clientEventId: log.clientEventId || null,
        type: 'food',
        time: log.eatenAt,
        text: log.originalText || (log.items || []).map((item) => item.name).join(', ') || 'Приём пищи',
        cal: Number(log.totalKcal || 0),
        protein: Number(log.totalProtein || 0),
      });
    }
    if (serverDay.weight) {
      mergeServerEvent(day, {
        id: serverDay.weight.clientEventId || serverDay.weight.id,
        serverId: serverDay.weight.id,
        clientEventId: serverDay.weight.clientEventId || null,
        type: 'weight',
        time: serverDay.weight.measuredAt,
        weight: Number(serverDay.weight.weightKg),
      });
    }
    for (const weight of payload.weights || []) {
      const weightDay = localDayKey(new Date(weight.measuredAt));
      mergeServerEvent(weightDay, {
        id: weight.clientEventId || weight.id,
        serverId: weight.id,
        clientEventId: weight.clientEventId || null,
        type: 'weight',
        time: weight.measuredAt,
        weight: Number(weight.weightKg),
      });
    }
    refreshFrame();
  }

  async function pull(day = localDayKey()) {
    if (!api.enabled) return null;
    const data = await request(`/api/v1/bootstrap?day=${encodeURIComponent(day)}&timezoneOffsetMinutes=${encodeURIComponent(new Date().getTimezoneOffset())}`);
    mergeBootstrap(data, day);
    api.lastSyncAt = Date.now();
    api.lastSyncError = null;
    return data;
  }
  async function syncNow({ pullAfter = true } = {}) {
    if (!api.enabled) return false;
    await api.ensureSession();
    const drained = await drain();
    if (pullAfter && drained) await pull(currentDayKey());
    return drained;
  }

  function queueNewEvent(win, type, beforeIds) {
    const day = currentDayKey(win);
    const db = readDb();
    const event = [...(db.days?.[day]?.events || [])].reverse().find((entry) => entry.type === type && !beforeIds.has(String(entry.id)));
    if (!event) return;
    event.clientEventId ||= uid(type);
    writeDb(db);
    enqueue({ kind: type === 'food' ? 'food-create' : 'weight-create', day, localEventId: String(event.id), payload: type === 'food' ? foodPayload(event) : weightPayload(event) });
  }

  function wrapMutations(win) {
    if (win.__rinloServerSyncWrapped) return;
    win.__rinloServerSyncWrapped = true;

    if (typeof win.rinloSaveFood === 'function') {
      const original = win.rinloSaveFood.bind(win);
      win.rinloSaveFood = (...args) => {
        const day = currentDayKey(win);
        const beforeIds = new Set((readDb().days?.[day]?.events || []).map((event) => String(event.id)));
        const result = original(...args);
        queueNewEvent(win, 'food', beforeIds);
        return result;
      };
    }
    if (typeof win.rinloSaveWeight === 'function') {
      const original = win.rinloSaveWeight.bind(win);
      win.rinloSaveWeight = (...args) => {
        const day = currentDayKey(win);
        const beforeIds = new Set((readDb().days?.[day]?.events || []).map((event) => String(event.id)));
        const result = original(...args);
        queueNewEvent(win, 'weight', beforeIds);
        return result;
      };
    }
    if (typeof win.addWater === 'function') {
      const original = win.addWater.bind(win);
      win.addWater = (value = 250, ...rest) => {
        const day = currentDayKey(win);
        const before = Number(readDb().days?.[day]?.water || 0);
        const result = original(value, ...rest);
        const delta = Math.round(Number(readDb().days?.[day]?.water || 0) - before);
        if (delta) enqueue({ kind: 'metric-delta', day, operationId: uid('water'), waterMlDelta: delta, stepsDelta: 0 });
        return result;
      };
    }
    if (typeof win.rinloSaveSteps === 'function') {
      const original = win.rinloSaveSteps.bind(win);
      win.rinloSaveSteps = (...args) => {
        const day = currentDayKey(win);
        const before = Number(readDb().days?.[day]?.steps || 0);
        const result = original(...args);
        const delta = Math.round(Number(readDb().days?.[day]?.steps || 0) - before);
        if (delta) enqueue({ kind: 'metric-delta', day, operationId: uid('steps'), waterMlDelta: 0, stepsDelta: delta });
        return result;
      };
      win.addSteps = (value = 1000) => win.rinloSaveSteps(Math.round(Number(value || 0)));
    }
    if (typeof win.toggleHabit === 'function') {
      const original = win.toggleHabit.bind(win);
      win.toggleHabit = (habit, ...rest) => {
        const day = currentDayKey(win);
        const result = original(habit, ...rest);
        const done = Boolean(readDb().days?.[day]?.habits?.[habit]);
        enqueue({ kind: 'habit-set', day, habit, done }, { replaceKey: `habit:${day}:${habit}` });
        return result;
      };
    }
    if (typeof win.rinloSaveEventEdit === 'function') {
      const original = win.rinloSaveEventEdit.bind(win);
      win.rinloSaveEventEdit = (id, ...rest) => {
        const day = currentDayKey(win);
        const before = findLocalEvent(day, id).event ? { ...findLocalEvent(day, id).event } : null;
        const result = original(id, ...rest);
        const after = findLocalEvent(day, id).event;
        if (!after || !before) return result;
        after.clientEventId ||= before.clientEventId || uid(after.type || 'event');
        updateLocalEvent(day, id, { clientEventId: after.clientEventId });
        const payload = after.type === 'food' ? foodPayload(after) : after.type === 'weight' ? weightPayload(after) : null;
        if (!payload) return result;
        const pendingCreate = hasPendingCreate(id);
        if (updateQueuedCreate(id, payload)) { scheduleDrain(20); return result; }
        if (after.serverId || pendingCreate) {
          enqueue({
            kind: after.type === 'food' ? 'food-update' : 'weight-update',
            day,
            localEventId: String(id),
            serverId: after.serverId || null,
            payload,
          }, { replaceKey: `update:${after.type}:${id}` });
        }
        return result;
      };
    }
    if (typeof win.delEvent === 'function') {
      const original = win.delEvent.bind(win);
      win.delEvent = (id, ...rest) => {
        const day = currentDayKey(win);
        const before = findLocalEvent(day, id).event ? { ...findLocalEvent(day, id).event } : null;
        const cancelled = cancelPendingCreate(id);
        const result = original(id, ...rest);
        if (!before || cancelled) return result;
        const kind = before.type === 'food' ? 'food-delete' : before.type === 'weight' ? 'weight-delete' : null;
        if (kind) enqueue({ kind, day, localEventId: String(id), serverId: before.serverId || null }, { replaceKey: `delete:${before.type}:${id}` });
        return result;
      };
    }
    if (typeof win.rinloCoreOnboardingNext === 'function') {
      const original = win.rinloCoreOnboardingNext.bind(win);
      win.rinloCoreOnboardingNext = async (...args) => {
        const before = JSON.stringify(readDb().profile || null);
        const result = await original(...args);
        const afterProfile = readDb().profile || null;
        if (afterProfile && before !== JSON.stringify(afterProfile)) {
          const payload = profilePayload(win);
          if (payload) enqueue({ kind: 'profile-upsert', payload }, { replaceKey: 'profile' });
        }
        return result;
      };
    }
    if (typeof win.rinloCoreCheckin === 'function') {
      const original = win.rinloCoreCheckin.bind(win);
      win.rinloCoreCheckin = async (...args) => {
        const result = await original(...args);
        const day = currentDayKey(win);
        const payload = checkinPayload(readDb().days?.[day]?.rinloCheckin);
        if (payload) enqueue({ kind: 'checkin-upsert', day, payload }, { replaceKey: `checkin:${day}` });
        return result;
      };
    }
    if (typeof win.rinloSaveCheckinDetails === 'function') {
      const original = win.rinloSaveCheckinDetails.bind(win);
      win.rinloSaveCheckinDetails = async (...args) => {
        const result = await original(...args);
        const day = currentDayKey(win);
        const payload = checkinPayload(readDb().days?.[day]?.rinloCheckin);
        if (payload) enqueue({ kind: 'checkin-upsert', day, payload }, { replaceKey: `checkin:${day}` });
        return result;
      };
    }
  }

  async function mount(attempt = 0) {
    const win = frame.contentWindow;
    if (!win) return;
    if (typeof win.rinloSaveFood !== 'function' || typeof win.rinloSaveWeight !== 'function') {
      if (attempt < 40) setTimeout(() => mount(attempt + 1), 75);
      return;
    }
    wrapMutations(win);
    win.__rinloServerSync = 'v1';
    window.RinloServerSync = {
      drain, pull, syncNow,
      pending: () => readOutbox().map((item) => ({ ...item })),
      clearLocalAppStateForTest() { localStorage.removeItem(APP_KEY); },
    };
    mounted = true;
    if (api.enabled) syncNow().catch((error) => {
      api.lastSyncError = String(error?.message || error);
      console.warn('Rinlo initial server sync deferred', error);
    });
  }

  window.addEventListener('online', () => scheduleDrain(0));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleDrain(0); });
  frame.addEventListener('load', () => setTimeout(() => mount(), 0));
  setTimeout(() => mount(), 0);
  setTimeout(() => { if (!mounted) mount(); }, 300);
})();
