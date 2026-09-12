(() => {
  const frame = document.getElementById('app');
  const APP_KEY = 'healthy-action-v07';
  if (!frame) return;

  const config = window.HEALTHY_ACTION_CONFIG || {};
  const supabaseBase = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');

  function readDb() {
    try { return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeDb(db) { localStorage.setItem(APP_KEY, JSON.stringify(db)); }
  function shiftDay(day, amount) {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + amount);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function ensureDay(db, day) {
    db.days ||= {};
    db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return db.days[day];
  }
  function activeAction(dayState) {
    return (dayState?.rinloActions || []).find((action) => ['suggested','accepted'].includes(action.status)) || null;
  }
  function mainActionKind(dayState, review) {
    if (review?.mainActionKind) return review.mainActionKind;
    const actions = dayState?.rinloActions || [];
    const linked = review?.mainActionId
      ? actions.find((action) => String(action.serverId || action.id || '') === String(review.mainActionId))
      : null;
    return linked?.kind || actions.find((action) => action.status === 'completed')?.kind || actions[0]?.kind || null;
  }
  function latestLocalReviewBefore(day) {
    const db = readDb();
    const floor = shiftDay(day, -7);
    const keys = Object.keys(db.days || {})
      .filter((key) => key < day && key >= floor && db.days?.[key]?.rinloEveningReview)
      .sort()
      .reverse();
    const reviewDay = keys[0];
    if (!reviewDay) return null;
    const state = db.days[reviewDay];
    return {
      ...state.rinloEveningReview,
      day: reviewDay,
      mainActionKind: mainActionKind(state, state.rinloEveningReview),
    };
  }

  async function supabaseGet(path) {
    const transport = window.RinloSupabaseTransport;
    const auth = window.RinloSupabaseAuth;
    if (!transport?.enabled || !auth || !supabaseBase || !publishableKey) return null;
    const session = await auth.ensureSession();
    if (!session?.access_token) return null;
    const response = await fetch(`${supabaseBase}${path}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || data?.error || `adaptive_learning_${response.status}`);
    return data;
  }

  async function latestSupabaseReviewBefore(day) {
    if (!window.RinloSupabaseTransport?.enabled) return null;
    const floor = shiftDay(day, -7);
    const rows = await supabaseGet(
      `/rest/v1/daily_evening_reviews?select=*&day=lt.${encodeURIComponent(day)}&day=gte.${encodeURIComponent(floor)}&order=day.desc&limit=1`
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    let mainActionKindValue = null;
    if (row.main_action_id) {
      const actions = await supabaseGet(
        `/rest/v1/rinlo_actions?select=id,kind&id=eq.${encodeURIComponent(row.main_action_id)}&limit=1`
      );
      mainActionKindValue = Array.isArray(actions) ? actions[0]?.kind || null : null;
    }
    return {
      day: String(row.day),
      planFit: row.plan_fit,
      actionUseful: row.action_useful,
      mainActionId: row.main_action_id || null,
      mainActionKind: mainActionKindValue,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mergePreviousReview(review) {
    if (!review?.day || !review?.planFit || !review?.actionUseful) return;
    const db = readDb();
    const dayState = ensureDay(db, review.day);
    dayState.closed = true;
    dayState.rinloEveningReview = {
      ...(dayState.rinloEveningReview || {}),
      ...review,
    };
    writeDb(db);
  }

  async function preparePreviousReview(day) {
    if (window.HealthyActionAPI?.enabled) return null;
    try {
      const remote = await latestSupabaseReviewBefore(day);
      if (remote) mergePreviousReview(remote);
    } catch (error) {
      console.warn('Rinlo adaptive review restore deferred', error);
    }
    return latestLocalReviewBefore(day);
  }

  function reducedEffortMinutes(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes <= 5) return Number.isFinite(minutes) ? minutes : value;
    return Math.max(5, Math.round((minutes * 0.5) / 5) * 5);
  }
  function shortenTitle(title, beforeMinutes, afterMinutes) {
    if (!Number.isFinite(beforeMinutes) || beforeMinutes === afterMinutes) return title;
    const pattern = new RegExp(`\\b${beforeMinutes}\\b`);
    return pattern.test(String(title || ''))
      ? String(title).replace(pattern, String(afterMinutes))
      : title;
  }

  async function adaptCurrentAction(win, day, previousReview) {
    if (!previousReview) return null;
    let db = readDb();
    let current = activeAction(db.days?.[day]);
    if (!current) return null;

    const previousKind = previousReview.mainActionKind || null;
    let avoidedPreviousKind = false;
    if (
      previousReview.actionUseful === 'no'
      && previousKind
      && current.kind === previousKind
      && typeof win.rinloCoreReplaceAction === 'function'
    ) {
      await win.rinloCoreReplaceAction();
      db = readDb();
      current = activeAction(db.days?.[day]);
      avoidedPreviousKind = Boolean(current && current.kind !== previousKind);
      if (!current) return null;
    }

    const already = current.context?.adaptation;
    if (already?.source === 'evening_review' && already.reviewDay === previousReview.day) return current;

    const adaptation = {
      source: 'evening_review',
      reviewDay: previousReview.day,
      planFit: previousReview.planFit,
      actionUseful: previousReview.actionUseful,
      previousKind,
      avoidedPreviousKind,
      effortReduced: false,
    };

    if (previousReview.planFit === 'too_much') {
      const before = Number(current.effortMinutes);
      const after = reducedEffortMinutes(before);
      if (Number.isFinite(before) && Number.isFinite(after) && after < before) {
        current.effortMinutes = after;
        current.title = shortenTitle(current.title, before, after);
        current.rationale = `В прошлый раз план ощущался перегруженным, поэтому сегодня шаг короче. ${current.rationale}`;
        adaptation.effortReduced = true;
        adaptation.previousEffortMinutes = before;
        adaptation.adaptedEffortMinutes = after;
      }
    }

    current.context = { ...(current.context || {}), adaptation };
    writeDb(db);
    try { win.eval?.('db = load()'); win.renderToday?.(); } catch {}
    return current;
  }

  function install(attempt = 0) {
    const win = frame.contentWindow;
    if (!win || typeof win.rinloCoreCheckin !== 'function' || typeof win.rinloCoreSkipCheckin !== 'function') {
      if (attempt < 60) setTimeout(() => install(attempt + 1), 50);
      return;
    }
    if (win.__rinloAdaptiveLearning === 'v1') return;

    const wrap = (name) => {
      const original = win[name].bind(win);
      win[name] = async (...args) => {
        const day = win.__haViewDay || shiftDay(new Date().toISOString().slice(0, 10), 0);
        const previousReview = await preparePreviousReview(day);
        const result = await original(...args);
        if (!window.HealthyActionAPI?.enabled) await adaptCurrentAction(win, day, previousReview);
        return result;
      };
    };

    wrap('rinloCoreCheckin');
    wrap('rinloCoreSkipCheckin');
    win.__rinloAdaptiveLearning = 'v1';
    window.RinloAdaptiveLearning = {
      version: 'v1',
      latestLocalReviewBefore,
      preparePreviousReview,
      adaptCurrentAction: (day) => adaptCurrentAction(win, day, latestLocalReviewBefore(day)),
    };
  }

  frame.addEventListener('load', () => setTimeout(() => install(), 0));
  setTimeout(() => install(), 0);
  setTimeout(() => install(), 250);
})();
