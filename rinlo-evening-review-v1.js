(() => {
  const frame = document.getElementById('app');
  const APP_KEY = 'healthy-action-v07';
  if (!frame) return;

  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const nowIso = () => new Date().toISOString();
  const uuidLike = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

  function readDb() {
    try { return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeDb(db) { localStorage.setItem(APP_KEY, JSON.stringify(db)); }
  function ensureDay(db, day) {
    db.days ||= {};
    db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    return db.days[day];
  }
  function mainActionFor(dayState) {
    const actions = Array.isArray(dayState?.rinloActions) ? dayState.rinloActions : [];
    return actions.find((action) => action.status === 'completed') || actions[0] || null;
  }
  function actionServerId(action) {
    if (!action) return null;
    if (uuidLike(action.serverId)) return String(action.serverId);
    if (uuidLike(action.id)) return String(action.id);
    return null;
  }
  function syncEnabled() {
    return Boolean(window.HealthyActionAPI?.enabled || window.RinloSupabaseTransport?.enabled);
  }

  function storeReview(day, planFit, actionUseful) {
    const db = readDb();
    const dayState = ensureDay(db, day);
    const mainActionId = actionServerId(mainActionFor(dayState));
    const previous = dayState.rinloEveningReview || {};
    const review = {
      ...previous,
      day,
      planFit,
      actionUseful,
      mainActionId,
      updatedAt: nowIso(),
      createdAt: previous.createdAt || nowIso(),
    };
    dayState.closed = true;
    dayState.rinloEveningReview = review;
    writeDb(db);

    if (syncEnabled() && window.RinloServerSync?.enqueue) {
      window.RinloServerSync.enqueue({
        kind: 'evening-review-upsert',
        day,
        payload: {
          planFit,
          actionUseful,
          mainActionId,
        },
      }, { replaceKey: `evening-review:${day}` });
    }
    return review;
  }

  const extensions = window.RinloServerSyncExtensions ||= {};
  const previousProcessItem = extensions.processItem;
  const previousSeed = extensions.seedSupabaseIdentity;

  extensions.processItem = async (item, ctx) => {
    if (typeof previousProcessItem === 'function') {
      const previous = await previousProcessItem(item, ctx);
      if (previous?.handled) return previous;
    }
    if (item.kind !== 'evening-review-upsert') return { handled: false };

    const result = await ctx.request(`/api/v1/evening-reviews/${encodeURIComponent(item.day)}`, {
      method: 'PUT',
      body: JSON.stringify(item.payload),
    });
    if (result?.eveningReview) {
      const db = ctx.readDb();
      const dayState = ensureDay(db, item.day);
      dayState.closed = true;
      dayState.rinloEveningReview = result.eveningReview;
      ctx.writeDb(db);
      ctx.refreshFrame();
    }
    return { handled: true, value: result };
  };

  extensions.seedSupabaseIdentity = (ctx) => {
    if (typeof previousSeed === 'function') previousSeed(ctx);
    for (const day of Object.keys(ctx.db.days || {}).sort()) {
      const review = ctx.db.days?.[day]?.rinloEveningReview;
      if (!review?.planFit || !review?.actionUseful) continue;
      ctx.add({
        kind: 'evening-review-upsert',
        day,
        payload: {
          planFit: review.planFit,
          actionUseful: review.actionUseful,
          mainActionId: uuidLike(review.mainActionId) ? review.mainActionId : null,
        },
        replaceKey: `evening-review:${day}`,
      });
    }
  };

  let draft = null;
  let draftDay = null;

  function ensureStyles(win) {
    const doc = win.document;
    if (doc.getElementById('rinlo-evening-review-v1-style')) return;
    const style = doc.createElement('style');
    style.id = 'rinlo-evening-review-v1-style';
    style.textContent = `
      .rer-intro{font-size:13px;line-height:1.5;color:#78827f;margin:6px 0 18px}
      .rer-q{margin-top:16px}.rer-q b{display:block;font-size:13px;margin-bottom:9px}
      .rer-options{display:grid;gap:8px}.rer-options.three{grid-template-columns:repeat(3,1fr)}
      .rer-option{border:1px solid #e2e9e5;background:#fff;border-radius:15px;padding:11px 8px;font-size:12px;font-weight:700;color:#3c4944;min-height:44px}
      .rer-option.sel{border-color:#83c7a7;background:#edf8f2;color:#1d7852;box-shadow:0 0 0 2px rgba(36,151,101,.05)}
      .rer-save[disabled]{opacity:.45;pointer-events:none}
      .rer-note{margin-top:12px;font-size:11px;line-height:1.45;color:#8a9491}
    `;
    doc.head.appendChild(style);
  }

  function selectedClass(value, expected) { return value === expected ? ' sel' : ''; }

  function renderSheet(win) {
    if (!draft || !draftDay || typeof win.openSheet !== 'function') return;
    ensureStyles(win);
    const ready = Boolean(draft.planFit && draft.actionUseful);
    win.openSheet(`
      <h2>Итог дня</h2>
      <div class="rer-intro">Две короткие отметки — не оценка дня, а сигнал, чтобы Rinlo лучше подбирал следующий шаг.</div>
      <div class="rer-q">
        <b>Как ощущался сегодняшний план?</b>
        <div class="rer-options three">
          <button class="rer-option${selectedClass(draft.planFit, 'easy')}" onclick="rinloEveningReviewPlanFit('easy')">Легко</button>
          <button class="rer-option${selectedClass(draft.planFit, 'right')}" onclick="rinloEveningReviewPlanFit('right')">В самый раз</button>
          <button class="rer-option${selectedClass(draft.planFit, 'too_much')}" onclick="rinloEveningReviewPlanFit('too_much')">Слишком много</button>
        </div>
      </div>
      <div class="rer-q">
        <b>Главное действие было полезным?</b>
        <div class="rer-options three">
          <button class="rer-option${selectedClass(draft.actionUseful, 'yes')}" onclick="rinloEveningReviewUseful('yes')">Да</button>
          <button class="rer-option${selectedClass(draft.actionUseful, 'no')}" onclick="rinloEveningReviewUseful('no')">Нет</button>
          <button class="rer-option${selectedClass(draft.actionUseful, 'skipped')}" onclick="rinloEveningReviewUseful('skipped')">Не делал</button>
        </div>
      </div>
      <div class="rer-note">Завтра не будет «компенсаций» или штрафов. Ответы нужны только для адаптации плана.</div>
      <button class="btn primary full rer-save" ${ready ? '' : 'disabled'} onclick="rinloEveningReviewSave()">Сохранить итог</button>
    `);
  }

  function install(attempt = 0) {
    const win = frame.contentWindow;
    if (!win || typeof win.finishDay !== 'function' || typeof win.openSheet !== 'function') {
      if (attempt < 60) setTimeout(() => install(attempt + 1), 75);
      return;
    }
    if (win.__rinloEveningReview === 'v1') return;

    win.finishDay = () => {
      draftDay = win.__haViewDay || localDayKey();
      const db = readDb();
      const dayState = ensureDay(db, draftDay);
      const existing = dayState.rinloEveningReview || null;
      const action = mainActionFor(dayState);
      const feedbackUseful = action?.feedback?.useful;
      draft = {
        planFit: existing?.planFit || null,
        actionUseful: existing?.actionUseful || (typeof feedbackUseful === 'boolean' ? (feedbackUseful ? 'yes' : 'no') : null),
      };
      renderSheet(win);
    };

    win.rinloEveningReviewPlanFit = (value) => {
      if (!['easy','right','too_much'].includes(value) || !draft) return;
      draft.planFit = value;
      renderSheet(win);
    };
    win.rinloEveningReviewUseful = (value) => {
      if (!['yes','no','skipped'].includes(value) || !draft) return;
      draft.actionUseful = value;
      renderSheet(win);
    };
    win.rinloEveningReviewSave = () => {
      if (!draftDay || !draft?.planFit || !draft?.actionUseful) return;
      storeReview(draftDay, draft.planFit, draft.actionUseful);
      try { win.eval('db = load()'); win.render?.(); } catch {}
      win.closeSheet?.();
      win.toast?.('Итог сохранён');
    };

    win.__rinloEveningReview = 'v1';
    window.RinloEveningReview = {
      version: 'v1',
      save: storeReview,
      get(day = localDayKey()) { return readDb().days?.[day]?.rinloEveningReview || null; },
    };
  }

  frame.addEventListener('load', () => setTimeout(() => install(), 0));
  setTimeout(() => install(), 0);
  setTimeout(() => install(), 300);
})();
