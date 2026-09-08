import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { getProfile } from './profile.js';
import { getDailyCheckin } from './checkins.js';
import { getDayOverview } from './state.js';

function mapAction(row) {
  if (!row) return null;
  return {
    id: row.id,
    day: String(row.day),
    kind: row.kind,
    title: row.title,
    rationale: row.rationale,
    effortMinutes: row.effort_minutes == null ? null : Number(row.effort_minutes),
    source: row.source,
    status: row.status,
    context: row.context || {},
    suggestedAt: row.suggested_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export async function listActionsForDay(userId, day) {
  const result = await pool.query(`
    select *
    from rinlo_actions
    where user_id = $1 and day = $2::date
    order by suggested_at desc
  `, [userId, day]);
  return result.rows.map(mapAction);
}

export async function createAction(userId, day, payload) {
  const result = await pool.query(`
    insert into rinlo_actions(
      user_id, day, kind, title, rationale, effort_minutes, source, context
    ) values($1,$2::date,$3,$4,$5,$6,$7,$8::jsonb)
    returning *
  `, [
    userId,
    day,
    payload.kind,
    payload.title,
    payload.rationale,
    payload.effortMinutes ?? null,
    payload.source || 'rules',
    JSON.stringify(payload.context || {}),
  ]);
  return mapAction(result.rows[0]);
}

function statusForEvent(currentStatus, eventType) {
  if (eventType === 'accepted') return 'accepted';
  if (eventType === 'completed') return 'completed';
  if (eventType === 'replaced') return 'replaced';
  if (eventType === 'dismissed') return 'dismissed';
  return currentStatus;
}

export async function addActionEvent(userId, actionId, payload) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const actionResult = await client.query(`
      select * from rinlo_actions
      where id = $1 and user_id = $2
      for update
    `, [actionId, userId]);
    if (!actionResult.rowCount) {
      await client.query('rollback');
      return null;
    }

    const action = actionResult.rows[0];
    const nextStatus = statusForEvent(action.status, payload.eventType);
    const completedAt = payload.eventType === 'completed' ? new Date() : action.completed_at;

    await client.query(`
      insert into rinlo_action_events(user_id, action_id, event_type, reason_code, payload)
      values($1,$2,$3,$4,$5::jsonb)
    `, [
      userId,
      actionId,
      payload.eventType,
      payload.reasonCode ?? null,
      JSON.stringify(payload.payload || {}),
    ]);

    const updated = await client.query(`
      update rinlo_actions
      set status = $3, completed_at = $4, updated_at = now()
      where id = $1 and user_id = $2
      returning *
    `, [actionId, userId, nextStatus, completedAt]);

    await client.query('commit');
    return mapAction(updated.rows[0]);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function buildCandidates({ profile, checkin, overview, localHour }) {
  const candidates = [];
  const metrics = overview?.metrics || {};
  const food = overview?.food || { items: [], totals: { kcal: 0, protein: 0 } };
  const stepTarget = Number(profile?.stepTarget || 8000);
  const proteinTarget = Number(profile?.proteinTargetG || 0);
  const calorieTarget = Number(profile?.calorieTarget || 0);
  const primaryGoal = profile?.primaryGoal || null;
  const wellbeingLow = checkin?.wellbeing === 'poor' || Number(checkin?.energy || 5) <= 2 || Number(checkin?.sleepQuality || 5) <= 2;

  if (wellbeingLow) {
    candidates.push({
      kind: 'recovery',
      title: 'Сделайте день чуть легче',
      rationale: 'По сегодняшнему самочувствию полезнее снизить нагрузку, а не пытаться закрыть все ориентиры.',
      effortMinutes: 10,
      context: { signal: 'low_recovery', wellbeing: checkin?.wellbeing, energy: checkin?.energy, sleepQuality: checkin?.sleepQuality },
    });
  }

  if (primaryGoal === 'sleep' && localHour >= 18) {
    candidates.push({
      kind: 'sleep',
      title: 'Оставьте 20 спокойных минут перед сном',
      rationale: 'Сегодня ваш главный фокус — восстановление. Небольшой спокойный переход ко сну полезнее ещё одной задачи.',
      effortMinutes: 20,
      context: { signal: 'sleep_goal', localHour },
    });
  }

  if (primaryGoal === 'nicotine') {
    candidates.push({
      kind: 'nicotine',
      title: 'Отложите следующий никотиновый эпизод на 10 минут',
      rationale: 'Небольшая пауза помогает сделать привычку менее автоматической без требования идеального дня.',
      effortMinutes: 10,
      context: { signal: 'nicotine_goal' },
    });
  }

  if ((primaryGoal === 'weight_loss' || primaryGoal === 'nutrition') && food.items.length > 0 && proteinTarget > 0 && food.totals.protein < proteinTarget * 0.55) {
    candidates.push({
      kind: 'nutrition',
      title: 'Добавьте белок в следующий приём пищи',
      rationale: `Сейчас зафиксировано около ${Math.round(food.totals.protein)} из ${proteinTarget} г белка. Это более полезный ориентир, чем пытаться сделать питание идеальным.`,
      effortMinutes: 5,
      context: { signal: 'protein_low', protein: food.totals.protein, proteinTarget },
    });
  }

  if (stepTarget > 0 && Number(metrics.steps || 0) < stepTarget * 0.5) {
    candidates.push({
      kind: 'movement',
      title: 'Пройдитесь 10 минут',
      rationale: `Сегодня движения пока меньше обычного: ${Number(metrics.steps || 0).toLocaleString('ru-RU')} шагов при ориентире ${stepTarget.toLocaleString('ru-RU')}. Небольшой прогулки достаточно.`,
      effortMinutes: 10,
      context: { signal: 'steps_low', steps: Number(metrics.steps || 0), stepTarget },
    });
  }

  if (localHour >= 12 && Number(metrics.waterMl || 0) < 750) {
    candidates.push({
      kind: 'hydration',
      title: 'Выпейте стакан воды',
      rationale: 'Воды сегодня пока немного. Один стакан — достаточный следующий шаг, без необходимости догонять норму залпом.',
      effortMinutes: 2,
      context: { signal: 'water_low', waterMl: Number(metrics.waterMl || 0) },
    });
  }

  if (profile?.calorieTrackingEnabled !== false && primaryGoal === 'weight_loss' && calorieTarget > 0 && food.totals.kcal > calorieTarget * 1.1) {
    candidates.push({
      kind: 'nutrition',
      title: 'Оставьте следующий приём пищи обычным',
      rationale: 'Сегодня получилось выше калорийного ориентира. Компенсировать голоданием или избыточной нагрузкой не нужно — просто вернитесь к обычному режиму.',
      effortMinutes: 5,
      context: { signal: 'calories_over_target', kcal: food.totals.kcal, calorieTarget },
    });
  }

  if (!candidates.length) {
    candidates.push({
      kind: 'general',
      title: 'Сделайте один небольшой активный перерыв',
      rationale: 'Сегодня нет сигнала, который требует жёсткого приоритета. Десяти спокойных минут движения достаточно, чтобы поддержать ритм.',
      effortMinutes: 10,
      context: { signal: 'steady_day' },
    });
  }

  return candidates;
}

export async function suggestNextAction(userId, day, { timezoneOffsetMinutes = 0, localHour = 12 } = {}) {
  const existing = await listActionsForDay(userId, day);
  const active = existing.find((action) => ['suggested','accepted'].includes(action.status));
  if (active) return { action: active, reused: true };

  const [profile, checkin, overview] = await Promise.all([
    getProfile(userId),
    getDailyCheckin(userId, day),
    getDayOverview(userId, day, timezoneOffsetMinutes),
  ]);

  const candidates = buildCandidates({ profile, checkin, overview, localHour });
  const lastRejected = existing.find((action) => ['replaced','dismissed'].includes(action.status));
  const selected = candidates.find((candidate) => candidate.kind !== lastRejected?.kind) || candidates[0];
  const action = await createAction(userId, day, {
    ...selected,
    source: 'rules',
    context: {
      ...selected.context,
      primaryGoal: profile?.primaryGoal || null,
      checkinPresent: Boolean(checkin),
    },
  });
  await addActionEvent(userId, action.id, { eventType: 'shown' });
  return { action, reused: false };
}

export async function registerActionRoutes(app) {
  app.get('/api/v1/actions', {
    preHandler: requireAuth,
    schema: {
      querystring: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
    },
  }, async (request) => ({ items: await listActionsForDay(request.auth.userId, request.query.day) }));

  app.post('/api/v1/actions/suggest', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          timezoneOffsetMinutes: { type: 'integer', minimum: -840, maximum: 840, default: 0 },
          localHour: { type: 'integer', minimum: 0, maximum: 23, default: 12 },
        },
      },
    },
  }, async (request) => suggestNextAction(request.auth.userId, request.body.day, request.body));

  app.post('/api/v1/actions/:id/events', {
    preHandler: requireAuth,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        additionalProperties: false,
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['eventType'],
        additionalProperties: false,
        properties: {
          eventType: { type: 'string', enum: ['shown','accepted','completed','replaced','dismissed','feedback'] },
          reasonCode: {
            anyOf: [
              { type: 'string', enum: ['no_time','low_energy','inconvenient_now','dont_want','already_did_similar','other'] },
              { type: 'null' },
            ],
          },
          payload: { type: 'object', additionalProperties: true },
        },
      },
    },
  }, async (request, reply) => {
    const action = await addActionEvent(request.auth.userId, request.params.id, request.body);
    if (!action) return reply.code(404).send({ error: 'not_found' });
    return { action };
  });
}
