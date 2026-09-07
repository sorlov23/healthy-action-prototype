import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { getFoodLogsForDay } from './food-logs.js';

function parseDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_date');
  return date;
}

export async function createWeightLog(userId, weightKg, measuredAt) {
  const result = await pool.query(`
    insert into weight_logs(user_id, measured_at, weight_kg)
    values($1, $2, $3)
    returning id, measured_at, weight_kg, created_at
  `, [userId, parseDate(measuredAt), Number(weightKg)]);
  const row = result.rows[0];
  return {
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
  };
}

export async function listWeightLogs(userId, limit = 90) {
  const safeLimit = Math.min(Math.max(Number(limit) || 90, 1), 365);
  const result = await pool.query(`
    select id, measured_at, weight_kg, created_at
    from weight_logs
    where user_id = $1
    order by measured_at desc
    limit $2
  `, [userId, safeLimit]);
  return result.rows.map((row) => ({
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
  }));
}

export async function applyDailyMetricDelta(userId, day, { waterMlDelta = 0, stepsDelta = 0 } = {}) {
  const result = await pool.query(`
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

export async function getDailyMetrics(userId, day) {
  const result = await pool.query(`
    select day, water_ml, steps, habit_flags, updated_at
    from daily_metrics
    where user_id = $1 and day = $2::date
  `, [userId, day]);
  return result.rowCount ? mapDailyMetrics(result.rows[0]) : { day, waterMl: 0, steps: 0, habits: {} };
}

export async function getDayOverview(userId, day, timezoneOffsetMinutes = 0) {
  const [food, metrics, weightResult] = await Promise.all([
    getFoodLogsForDay(userId, day, timezoneOffsetMinutes),
    getDailyMetrics(userId, day),
    pool.query(`
      select id, measured_at, weight_kg, created_at
      from weight_logs
      where user_id = $1
        and (measured_at - ($3 * interval '1 minute'))::date = $2::date
      order by measured_at desc
      limit 1
    `, [userId, day, Number(timezoneOffsetMinutes)]),
  ]);

  const weight = weightResult.rowCount ? {
    id: weightResult.rows[0].id,
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
          weightKg: { type: 'number', minimum: 30, maximum: 300 },
          measuredAt: { type: 'string', maxLength: 80 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const log = await createWeightLog(request.auth.userId, request.body.weightKg, request.body.measuredAt);
      return reply.code(201).send(log);
    } catch (error) {
      if (error.message === 'invalid_date') return reply.code(400).send({ error: 'validation_error', message: 'Некорректная дата веса' });
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
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          waterMlDelta: { type: 'integer', minimum: -20000, maximum: 20000, default: 0 },
          stepsDelta: { type: 'integer', minimum: -100000, maximum: 100000, default: 0 },
        },
      },
    },
  }, async (request) => applyDailyMetricDelta(request.auth.userId, request.body.day, request.body));

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
