(() => {
  const frame = document.getElementById('app');
  const transport = () => window.RinloSupabaseTransport;
  const APP_KEY = 'healthy-action-v07';
  if (!frame) return;

  const nowIso = () => new Date().toISOString();
  const uid = (prefix = 'action-op') => `${prefix}:${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const localDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  function readDb() {
    try { return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeDb(db) { localStorage.setItem(APP_KEY, JSON.stringify(db)); }
  function actionPayload(action, day, clientActionId) {
    return {
      clientActionId,
      day,
      kind: action.kind || 'general',
      title: String(action.title || 'Небольшой следующий шаг'),
      rationale: String(action.rationale || 'Поддержать текущий ритм небольшим действием.'),
      effortMinutes: action.effortMinutes == null ? null : Number(action.effortMinutes),
      context: action.context && typeof action.context === 'object' ? action.context : {},
      suggestedAt: action.suggestedAt || nowIso(),
    };
  }
  function dayActions(db, day) {
    db.days ||= {};
    db.days[day] ||= { events: [], water: 0, steps: 0, habits: {}, closed: false };
    db.days[day].rinloActions ||= [];
    return db.days[day].rinloActions;
  }
  function findAction(db, day, localActionId) {
    return dayActions(db, day).find((action) => String(action.id) === String(localActionId));
  }
  function mergeServerAction(day, serverAction, localActionId = null) {
    if (!serverAction?.id) return;
    const db = readDb();
    const actions = dayActions(db, day);
    let target = localActionId == null ? null : actions.find((action) => String(action.id) === String(localActionId));
    if (!target) {
      target = actions.find((action) => String(action.serverId || action.id || '') === String(serverAction.id));
    }
    const mapped = { ...serverAction, serverId: serverAction.id };
    if (target) {
      const localId = target.id;
      const clientActionId = serverAction.clientActionId || target.clientActionId || String(localId);
      Object.assign(target, mapped, { id: localId, serverId: serverAction.id, clientActionId });
    } else {
      actions.unshift(mapped);
    }
    writeDb(db);
  }

  function patchDependentActionItems(ctx, localActionId, serverId) {
    const target = String(localActionId);
    const items = ctx.readOutbox();
    let changed = false;
    for (const item of items) {
      if (item.kind === 'action-event' && String(item.localActionId) === target && !item.actionId) {
        item.actionId = serverId;
        changed = true;
      }
    }
    if (changed) ctx.writeOutbox(items);
  }
  function dropDependentActionItems(ctx, localActionId) {
    const target = String(localActionId);
    const items = ctx.readOutbox();
    const next = items.filter((item) => !(item.kind === 'action-event' && String(item.localActionId) === target));
    if (next.length !== items.length) ctx.writeOutbox(next);
  }

  const extensions = window.RinloServerSyncExtensions ||= {};
  const previousProcessItem = extensions.processItem;
  const previousSeed = extensions.seedSupabaseIdentity;

  extensions.processItem = async (item, ctx) => {
    if (typeof previousProcessItem === 'function') {
      const previous = await previousProcessItem(item, ctx);
      if (previous?.handled) return previous;
    }

    if (item.kind === 'action-create') {
      const result = await ctx.request('/api/v1/actions/import-local', {
        method: 'POST',
        body: JSON.stringify(item.payload),
      });
      if (result?.action?.id) {
        mergeServerAction(item.day, result.action, item.localActionId);
        if (result.reused === true) dropDependentActionItems(ctx, item.localActionId);
        else patchDependentActionItems(ctx, item.localActionId, result.action.id);
        ctx.refreshFrame();
      }
      return { handled: true, value: result };
    }

    if (item.kind === 'action-event') {
      if (!item.actionId) throw new Error('dependency_pending');
      const result = await ctx.request(`/api/v1/actions/${encodeURIComponent(item.actionId)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          operationId: item.operationId || item.id,
          eventType: item.eventType,
          reasonCode: item.reasonCode ?? null,
          payload: item.payload || {},
        }),
      });
      if (result?.action) {
        mergeServerAction(item.day, result.action, item.localActionId);
        ctx.refreshFrame();
      }
      return { handled: true, value: result };
    }

    return { handled: false };
  };

  extensions.seedSupabaseIdentity = (ctx) => {
    if (typeof previousSeed === 'function') previousSeed(ctx);
    for (const day of Object.keys(ctx.db.days || {}).sort()) {
      const actions = [...(ctx.db.days?.[day]?.rinloActions || [])]
        .sort((a, b) => String(a.suggestedAt || '').localeCompare(String(b.suggestedAt || '')));
      for (const action of actions) {
        action.id ||= ctx.uid('local-action');
        action.clientActionId ||= String(action.id);
        delete action.serverId;
        const localActionId = String(action.id);
        const replaceBase = `action:${day}:${localActionId}`;
        ctx.add({
          kind: 'action-create',
          day,
          localActionId,
          payload: actionPayload(action, day, action.clientActionId),
          replaceKey: `${replaceBase}:create`,
        });
        if (['accepted','completed','replaced','dismissed'].includes(action.status)) {
          ctx.add({
            kind: 'action-event',
            day,
            localActionId,
            actionId: null,
            operationId: ctx.uid('action-seed-event'),
            eventType: action.status,
            reasonCode: null,
            payload: {},
            replaceKey: `${replaceBase}:${action.status}`,
          });
        }
        if (typeof action.feedback?.useful === 'boolean') {
          ctx.add({
            kind: 'action-event',
            day,
            localActionId,
            actionId: null,
            operationId: ctx.uid('action-seed-feedback'),
            eventType: 'feedback',
            reasonCode: null,
            payload: { useful: Boolean(action.feedback.useful) },
            replaceKey: `${replaceBase}:feedback`,
          });
        }
      }
    }
  };

  function queueActionCreate(day, action) {
    const sync = window.RinloServerSync;
    if (!transport()?.enabled || !sync?.enqueue || !action || action.serverId) return false;
    const localActionId = String(action.id || uid('local-action'));
    const db = readDb();
    const local = findAction(db, day, localActionId);
    if (local) {
      local.id ||= localActionId;
      local.clientActionId ||= String(local.id);
      writeDb(db);
    }
    const clientActionId = String(local?.clientActionId || action.clientActionId || localActionId);
    const pending = sync.pending?.() || [];
    if (pending.some((item) => item.kind === 'action-create' && String(item.localActionId) === localActionId)) return true;
    sync.enqueue({
      kind: 'action-create',
      day,
      localActionId,
      payload: actionPayload(local || action, day, clientActionId),
    }, { replaceKey: `action:${day}:${localActionId}:create` });
    return true;
  }

  function queueActionEvent(day, action, eventType, reasonCode = null, payload = {}) {
    const sync = window.RinloServerSync;
    if (!transport()?.enabled || !sync?.enqueue || !action) return false;
    if (!['accepted','completed','replaced','dismissed','feedback'].includes(eventType)) return false;
    const localActionId = String(action.id);
    if (!action.serverId) queueActionCreate(day, action);
    const operationId = uid('action-event');
    const replaceKey = eventType === 'feedback'
      ? `action:${day}:${localActionId}:feedback`
      : `action:${day}:${localActionId}:${eventType}`;
    sync.enqueue({
      kind: 'action-event',
      day,
      localActionId,
      actionId: action.serverId || null,
      operationId,
      eventType,
      reasonCode: reasonCode ?? null,
      payload: payload || {},
    }, { replaceKey });
    return operationId;
  }

  function backfillUnsyncedActions() {
    const db = readDb();
    for (const day of Object.keys(db.days || {}).sort()) {
      for (const action of db.days?.[day]?.rinloActions || []) {
        if (action.serverId) continue;
        queueActionCreate(day, action);
        if (['accepted','completed','replaced','dismissed'].includes(action.status)) {
          queueActionEvent(day, action, action.status, null, {});
        }
        if (typeof action.feedback?.useful === 'boolean') {
          queueActionEvent(day, action, 'feedback', null, { useful: Boolean(action.feedback.useful) });
        }
      }
    }
  }

  function snapshotActions(day) {
    const db = readDb();
    return JSON.parse(JSON.stringify(db.days?.[day]?.rinloActions || []));
  }

  function persistActionDiff(day, before, after, reasonCode = null) {
    const beforeById = new Map(before.map((action) => [String(action.id), action]));
    const afterById = new Map(after.map((action) => [String(action.id), action]));

    for (const [id, next] of afterById) {
      const prev = beforeById.get(id);
      if (!prev) continue;
      if (prev.status !== next.status && ['accepted','completed','replaced','dismissed'].includes(next.status)) {
        queueActionEvent(day, next, next.status, next.status === 'dismissed' ? reasonCode : null, {});
      }
      if (JSON.stringify(prev.feedback || null) !== JSON.stringify(next.feedback || null) && typeof next.feedback?.useful === 'boolean') {
        queueActionEvent(day, next, 'feedback', null, { useful: Boolean(next.feedback.useful) });
      }
    }

    for (const [id, next] of afterById) {
      if (!beforeById.has(id)) queueActionCreate(day, next);
    }
  }

  function installBridge(attempt = 0) {
    const win = frame.contentWindow;
    const sync = window.RinloServerSync;
    if (!win || !sync?.enqueue || typeof win.rinloCoreCheckin !== 'function') {
      if (attempt < 60) setTimeout(() => installBridge(attempt + 1), 75);
      return;
    }
    if (win.__rinloActionSync === 'v1') return;

    const wrap = (name, reasonFromArgs = null) => {
      if (typeof win[name] !== 'function') return;
      const original = win[name].bind(win);
      win[name] = async (...args) => {
        const day = win.__haViewDay || localDayKey();
        const before = snapshotActions(day);
        const result = await original(...args);
        const after = snapshotActions(day);
        persistActionDiff(day, before, after, reasonFromArgs ? reasonFromArgs(args) : null);
        return result;
      };
    };

    wrap('rinloCoreCheckin');
    wrap('rinloCoreSkipCheckin');
    wrap('rinloCoreCompleteAction');
    wrap('rinloCoreReplaceAction');
    wrap('rinloCoreDismissReason', (args) => args[0] || null);
    wrap('rinloCoreActionFeedback');

    win.__rinloActionSync = 'v1';
    window.RinloActionSync = {
      version: 'v1',
      queueActionCreate,
      queueActionEvent,
      backfillUnsyncedActions,
    };
    backfillUnsyncedActions();
  }

  frame.addEventListener('load', () => setTimeout(() => installBridge(), 0));
  setTimeout(() => installBridge(), 0);
  setTimeout(() => installBridge(), 300);
})();