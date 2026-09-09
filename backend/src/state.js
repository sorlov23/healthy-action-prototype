import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { getFoodLogsForDay } from './food-logs.js';

function parseDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_date');
  return date;
}

function mapWeightRow(row, replayed = false) {
  return {
    id: row.id,
    clientEventId: row.client_event_id || null,
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
    replayed,
  };
}

export async function createWeightLog(userId, weightKg, measuredAt, clientEventId = null) {
  const result = await pool.query(`
    insert into weight_logs(user_id, measured_at, weight_kg, client_event_id)
    values($1, $2, $3, $4)
    on conflict do nothing
    returning id, client_event_id, measured_at, weight_kg, created_at
  `, [userId, parseDate(measuredAt), Number(weightKg), clientEventId || null]);

  if (result.rowCount) return mapWeightRow(result.rows[0], false);
  if (!clientEventId) throw new Error('weight_log_conflict');

  const existing = await pool.query(`
    select id, client_event_id, measured_at, weight_kg, created_at
    from weight_logs
    where user_id = $1 and client_event_id = $2
    limit 1
  `, [userId, clientEventId]);
  if (!existing.rowCount) throw new Error('weight_log_conflict');
  return mapWeightRow(existing.rows[0], true);
}

export async function listWeightLogs(userId, limit = 90) {
  const safeLimit = Math.min(Math.max(Number(limit) || 90, 1), 365);
  const result = await pool.query(`
    select id, client_event_id, measured_at, weight_kg, created_at
    from weight_logs
    where user_id = $1
    order by measured_at desc
    limit $2
  `, [userId, safeLimit]);
  return result.rows.map((row) => mapWeightRow(row));
}

function mapDailyMetrics(row) {
  if (!row) return { waterMl: 0, steps: 0, habits: {} };
  return {
    day: String(row.day),
    waterMl: Number(row.water_ml || 0),
    steps: Number(row.steps || 0),
    habits: row.habit_flags || {},
    updatedAt: row.updated_at,
  };
}

async function getDailyMetricsWith(executor, userId, day) {
  const result = await executor.query(`
    select day, water_ml, steps, habit_flags, updated_at
    from daily_metrics
    where user_id = $1 and day = $2::date
  `, [userId, day]);
  return result.rowCount ? mapDailyMetrics(result.rows[0]) : { day, waterMl: 0, steps: 0, habits: {} };
}

async function applyDailyMetricDeltaWith(executor, userId, day, waterMlDelta, stepsDelta) {
  const result = await executor.query(`
    insert into daily_metrics(user_id, day, water_ml, steps)
    values($1, $2::date, greatest(0, $3::int), greatest(0, $4::int))
    on conflict(user_id, day) do update set
      water_ml = greatest(0, daily_metrics.water_ml + $3::int),
      steps = greatest(0, daily_metrics.steps + $4::int),
      updated_at = now()
    returning day, water_ml, steps, habit_flags, updated_at
  `, [userId, day, Number(waterMlDelta), Number(stepsDelta)]);
  return mapDailyMetrics(result.rows[0]);
}

export async function applyDailyMetricDelta(userId, day, {
  waterMlDelta = 0,
  stepsDelta = 0,
  operationId = null,
} = {}) {
  const water = Number(waterMlDelta || 0);
  const steps = Number(stepsDelta || 0);
  if (!operationId) return applyDailyMetricDeltaWith(pool, userId, day, water, steps);

  const client = await pool.connect();
  try {
    await client.query('begin');
    const op = await client.query(`
      insert into daily_metric_operations(user_id, operation_id, day, water_ml_delta, steps_delta)
      values($1, $2, $3::date, $4::int, $5::int)
      on conflict(user_id, operation_id) do nothing
      returning operation_id
    `, [userId, operationId, day, water, steps]);

    if (!op.rowCount) {
      const existing = await client.query(`
        select day, water_ml_delta, steps_delta
        from daily_metric_operations
        where user_id = $1 and operation_id = $2
      `, [userId, operationId]);
      const row = existing.rows[0];
      if (!row
        || String(row.day) !== String(day)
        || Number(row.water_ml_delta) !== water
        || Number(row.steps_delta) !== steps) {
        throw new Error('metric_operation_conflict');
      }
      const metrics = await getDailyMetricsWith(client, userId, day);
      await client.query('commit');
      return { ...metrics, replayed: true, operationId };
    }

    const metrics = await applyDailyMetricDeltaWith(client, userId, day, water, steps);
    await client.query('commit');
    return { ...metrics, replayed: false, operationId };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function setDailyHabit(userId, day, habit, done) {
  const result = await pool.query(`
    insert into daily_metrics(user_id, day, habit_flags)
    values($1, $2::date, jsonb_build_object($3::text, $4::boolean))
    on conflict(user_id, day) do update set
      habit_flags = coalesce(daily_metrics.habit_flags, '{}'::jsonb) || jsonb_build_object($3::text, $4::boolean),
      updated_at = now()
    returning day, water_ml, steps, habit_flags, updated_at
  `, [userId, day, habit, Boolean(done)]);
  return mapDailyMetrics(result.rows[0]);
}

export async function getDailyMetrics(userId, day) {
  return getDailyMetricsWith(pool, userId, day);
}

export async function getDayOverview(userId, day, timezoneOffsetMinutes = 0) {
  const [food, metrics, weightResult] = await Promise.all([
    getFoodLogsForDay(userId, day, timezoneOffsetMinutes),
    getDailyMetrics(userId, day),
    pool.query(`
      select id, client_event_id, measured_at, weight_kg, created_at
      from weight_logs
      where user_id = $1
        and (measured_at - ($3 * interval '1 minute'))::date = $2::date
      order by measured_at desc
      limit 1
    `, [userId, day, Number(timezoneOffsetMinutes)]),
  ]);

  const weight = weightResult.rowCount ? {
    id: weightResult.rows[0].id,
    clientEventId: weightResult.rows[0].client_event_id || null,
    measuredAt: weightResult.rows[0].measured_at,
    weightKg: Number(weightResult.rows[0].weight_kg),
  } : null;

  return { day, food, metrics, weight };
}

export async function registerStateRoutes(app) {
  app.post('/api/v1/weight/logs', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['weightKg'],
        additionalProperties: false,
        properties: {
          clientEventId: { type: 'string', minLength: 1, maxLength: 160 },
          weightKg: { type: 'number', minimum: 30, maximum: 300 },
          measuredAt: { type: 'string', maxLength: 80 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const log = await createWeightLog(
        request.auth.userId,
        request.body.weightKg,
        request.body.measuredAt,
        request.body.clientEventId || null,
      );
      return reply.code(log.replayed ? 200 : 201).send(log);
    } catch (error) {
      if (error.message === 'invalid_date') return reply.code(400).send({ error: 'validation_error', message: 'Некорректная дата веса' });
      if (error.message === 'weight_log_conflict') return reply.code(409).send({ error: 'idempotency_conflict' });
      throw error;
    }
  });

  app.get('/api/v1/weight/logs', {
    preHandler: requireAuth,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: { limit: { type: 'integer', minimum: 1, maximum: 365, default: 90 } },
      },
    },
  }, async (request) => ({ items: await listWeightLogs(request.auth.userId, request.query.limit) }));

  app.post('/api/v1/daily/metrics', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          operationId: { type: 'string', minLength: 1, maxLength: 160 },
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          waterMlDelta: { type: 'integer', minimum: -20000, maximum: 20000, default: 0 },
          stepsDelta: { type: 'integer', minimum: -100000, maximum: 100000, default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      return await applyDailyMetricDelta(request.auth.userId, request.body.day, request.body);
    } catch (error) {
      if (error.message === 'metric_operation_conflict') {
        return reply.code(409).send({ error: 'idempotency_conflict' });
      }
      throw error;
    }
  });

  app.put('/api/v1/daily/habits/:habit', {
    preHandler: requireAuth,
    schema: {
      params: {
        type: 'object',
        required: ['habit'],
        properties: { habit: { type: 'string', enum: ['vape', 'fastfood', 'water'] } },
      },
      body: {
        type: 'object',
        required: ['day', 'done'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          done: { type: 'boolean' },
        },
      },
    },
  }, async (request) => setDailyHabit(request.auth.userId, request.body.day, request.params.habit, request.body.done));

  app.get('/api/v1/day', {
    preHandler: requireAuth,
    schema: {
      querystring: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          timezoneOffsetMinutes: { type: 'integer', minimum: -840, maximum: 840, default: 0 },
        },
      },
    },
  }, async (request) => getDayOverview(
    request.auth.userId,
    request.query.day,
    request.query.timezoneOffsetMinutes || 0,
  ));
}
