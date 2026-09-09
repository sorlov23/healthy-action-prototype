import { pool } from './db.js';
import { requireAuth } from './auth.js';

function parseDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_eaten_at');
  return date;
}

function mapItem(item) {
  return {
    id: item.id,
    foodId: item.food_id,
    name: item.name,
    grams: Number(item.grams),
    kcal: Number(item.kcal),
    protein: Number(item.protein_g),
    confidence: item.confidence == null ? null : Number(item.confidence),
  };
}

function mapLog(log, items = [], replayed = false) {
  return {
    id: log.id,
    clientEventId: log.client_event_id || null,
    eatenAt: log.eaten_at,
    source: log.source,
    originalText: log.original_text,
    totalKcal: Number(log.total_kcal),
    totalProtein: Number(log.total_protein_g),
    createdAt: log.created_at,
    replayed,
    items: items.map(mapItem),
  };
}

async function listItemsForLog(client, logId) {
  const result = await client.query(`
    select id, food_log_id, food_id, name, grams, kcal, protein_g, confidence
    from food_log_items
    where food_log_id = $1
    order by created_at asc
  `, [logId]);
  return result.rows;
}

async function replaceItems(client, logId, items = []) {
  await client.query('delete from food_log_items where food_log_id = $1', [logId]);
  const saved = [];
  for (const item of items) {
    const result = await client.query(`
      insert into food_log_items(food_log_id, food_id, name, grams, kcal, protein_g, confidence)
      values($1, $2, $3, $4, $5, $6, $7)
      returning id, food_log_id, food_id, name, grams, kcal, protein_g, confidence
    `, [
      logId,
      item.foodId || null,
      item.name,
      Number(item.grams),
      Number(item.kcal || 0),
      Number(item.protein || 0),
      item.confidence == null ? null : Number(item.confidence),
    ]);
    saved.push(result.rows[0]);
  }
  return saved;
}

export async function createFoodLog(userId, payload) {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const eatenAt = parseDate(payload.eatenAt);
    const clientEventId = payload.clientEventId || null;
    const logResult = await client.query(`
      insert into food_logs(
        user_id, eaten_at, source, original_text, total_kcal, total_protein_g, client_event_id
      )
      values($1, $2, $3, $4, $5, $6, $7)
      on conflict do nothing
      returning id, client_event_id, eaten_at, source, original_text, total_kcal, total_protein_g, created_at
    `, [
      userId,
      eatenAt,
      payload.source || 'text',
      payload.originalText || null,
      Number(payload.totalKcal || 0),
      Number(payload.totalProtein || 0),
      clientEventId,
    ]);

    if (!logResult.rowCount) {
      if (!clientEventId) throw new Error('food_log_conflict');
      const existingResult = await client.query(`
        select id, client_event_id, eaten_at, source, original_text, total_kcal, total_protein_g, created_at
        from food_logs
        where user_id = $1 and client_event_id = $2
        limit 1
      `, [userId, clientEventId]);
      if (!existingResult.rowCount) throw new Error('food_log_conflict');
      const existing = existingResult.rows[0];
      const existingItems = await listItemsForLog(client, existing.id);
      await client.query('commit');
      return mapLog(existing, existingItems, true);
    }

    const log = logResult.rows[0];
    const items = await replaceItems(client, log.id, payload.items || []);
    await client.query('commit');
    return mapLog(log, items, false);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateFoodLog(userId, logId, payload) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query(`
      update food_logs set
        eaten_at = $3,
        source = $4,
        original_text = $5,
        total_kcal = $6,
        total_protein_g = $7
      where id = $1 and user_id = $2
      returning id, client_event_id, eaten_at, source, original_text, total_kcal, total_protein_g, created_at
    `, [
      logId,
      userId,
      parseDate(payload.eatenAt),
      payload.source || 'text',
      payload.originalText || null,
      Number(payload.totalKcal || 0),
      Number(payload.totalProtein || 0),
    ]);
    if (!result.rowCount) {
      await client.query('rollback');
      return null;
    }
    const items = await replaceItems(client, logId, payload.items || []);
    await client.query('commit');
    return mapLog(result.rows[0], items, false);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteFoodLog(userId, logId) {
  const result = await pool.query(
    'delete from food_logs where id = $1 and user_id = $2 returning id',
    [logId, userId],
  );
  return result.rowCount > 0;
}

export async function getFoodLogsForDay(userId, day, timezoneOffsetMinutes = 0) {
  const logsResult = await pool.query(`
    select id, client_event_id, eaten_at, source, original_text, total_kcal, total_protein_g, created_at
    from food_logs
    where user_id = $1
      and (eaten_at - ($3 * interval '1 minute'))::date = $2::date
    order by eaten_at asc
  `, [userId, day, Number(timezoneOffsetMinutes)]);

  const logs = logsResult.rows;
  if (!logs.length) {
    return { day, items: [], totals: { kcal: 0, protein: 0 } };
  }

  const ids = logs.map((log) => log.id);
  const itemsResult = await pool.query(`
    select id, food_log_id, food_id, name, grams, kcal, protein_g, confidence
    from food_log_items
    where food_log_id = any($1::uuid[])
    order by created_at asc
  `, [ids]);

  const byLog = new Map();
  for (const item of itemsResult.rows) {
    if (!byLog.has(item.food_log_id)) byLog.set(item.food_log_id, []);
    byLog.get(item.food_log_id).push(item);
  }

  const mapped = logs.map((log) => mapLog(log, byLog.get(log.id) || []));

  return {
    day,
    items: mapped,
    totals: mapped.reduce((acc, log) => {
      acc.kcal += log.totalKcal;
      acc.protein += log.totalProtein;
      return acc;
    }, { kcal: 0, protein: 0 }),
  };
}

function foodBodySchema({ includeClientEventId = false } = {}) {
  return {
    type: 'object',
    required: ['source', 'totalKcal', 'totalProtein'],
    additionalProperties: false,
    properties: {
      ...(includeClientEventId ? { clientEventId: { type: 'string', minLength: 1, maxLength: 160 } } : {}),
      eatenAt: { type: 'string', maxLength: 80 },
      source: { type: 'string', enum: ['text', 'photo', 'voice', 'manual'] },
      originalText: { type: 'string', maxLength: 2000 },
      totalKcal: { type: 'number', minimum: 0, maximum: 20000 },
      totalProtein: { type: 'number', minimum: 0, maximum: 2000 },
      items: {
        type: 'array',
        maxItems: 30,
        items: {
          type: 'object',
          required: ['name', 'grams', 'kcal', 'protein'],
          additionalProperties: false,
          properties: {
            foodId: { type: 'string', maxLength: 120 },
            name: { type: 'string', minLength: 1, maxLength: 300 },
            grams: { type: 'number', exclusiveMinimum: 0, maximum: 10000 },
            kcal: { type: 'number', minimum: 0, maximum: 20000 },
            protein: { type: 'number', minimum: 0, maximum: 2000 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
  };
}

export async function registerFoodLogRoutes(app) {
  app.post('/api/v1/food/logs', {
    preHandler: requireAuth,
    schema: { body: foodBodySchema({ includeClientEventId: true }) },
  }, async (request, reply) => {
    try {
      const log = await createFoodLog(request.auth.userId, request.body);
      return reply.code(log.replayed ? 200 : 201).send(log);
    } catch (error) {
      if (error.message === 'invalid_eaten_at') {
        return reply.code(400).send({ error: 'validation_error', message: 'Некорректная дата приёма пищи' });
      }
      if (error.message === 'food_log_conflict') {
        return reply.code(409).send({ error: 'idempotency_conflict' });
      }
      throw error;
    }
  });

  app.put('/api/v1/food/logs/:id', {
    preHandler: requireAuth,
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', minLength: 1, maxLength: 80 } } },
      body: foodBodySchema(),
    },
  }, async (request, reply) => {
    try {
      const log = await updateFoodLog(request.auth.userId, request.params.id, request.body);
      if (!log) return reply.code(404).send({ error: 'not_found' });
      return log;
    } catch (error) {
      if (error.message === 'invalid_eaten_at') {
        return reply.code(400).send({ error: 'validation_error', message: 'Некорректная дата приёма пищи' });
      }
      throw error;
    }
  });

  app.delete('/api/v1/food/logs/:id', {
    preHandler: requireAuth,
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', minLength: 1, maxLength: 80 } } },
    },
  }, async (request, reply) => {
    const deleted = await deleteFoodLog(request.auth.userId, request.params.id);
    if (!deleted) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  app.get('/api/v1/food/logs', {
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
  }, async (request) => getFoodLogsForDay(
    request.auth.userId,
    request.query.day,
    request.query.timezoneOffsetMinutes || 0,
  ));
}
