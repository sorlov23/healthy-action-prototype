import { pool } from './db.js';
import { requireAuth } from './auth.js';

function mapCheckin(row) {
  if (!row) return null;
  return {
    day: String(row.day),
    wellbeing: row.wellbeing,
    energy: row.energy == null ? null : Number(row.energy),
    sleepQuality: row.sleep_quality == null ? null : Number(row.sleep_quality),
    sleepMinutes: row.sleep_minutes == null ? null : Number(row.sleep_minutes),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDailyCheckin(userId, day) {
  const result = await pool.query(`
    select *
    from daily_checkins
    where user_id = $1 and day = $2::date
  `, [userId, day]);
  return result.rowCount ? mapCheckin(result.rows[0]) : null;
}

export async function upsertDailyCheckin(userId, day, payload) {
  const result = await pool.query(`
    insert into daily_checkins(
      user_id, day, wellbeing, energy, sleep_quality, sleep_minutes, note, updated_at
    ) values($1,$2::date,$3,$4,$5,$6,$7,now())
    on conflict(user_id, day) do update set
      wellbeing = excluded.wellbeing,
      energy = excluded.energy,
      sleep_quality = excluded.sleep_quality,
      sleep_minutes = excluded.sleep_minutes,
      note = excluded.note,
      updated_at = now()
    returning *
  `, [
    userId,
    day,
    payload.wellbeing,
    payload.energy ?? null,
    payload.sleepQuality ?? null,
    payload.sleepMinutes ?? null,
    payload.note?.trim() || null,
  ]);
  return mapCheckin(result.rows[0]);
}

export async function registerCheckinRoutes(app) {
  app.get('/api/v1/checkins/:day', {
    preHandler: requireAuth,
    schema: {
      params: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
    },
  }, async (request) => ({ checkin: await getDailyCheckin(request.auth.userId, request.params.day) }));

  app.put('/api/v1/checkins/:day', {
    preHandler: requireAuth,
    schema: {
      params: {
        type: 'object',
        required: ['day'],
        additionalProperties: false,
        properties: {
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
      body: {
        type: 'object',
        required: ['wellbeing'],
        additionalProperties: false,
        properties: {
          wellbeing: { type: 'string', enum: ['poor','okay','good','great'] },
          energy: { anyOf: [{ type: 'integer', minimum: 1, maximum: 5 }, { type: 'null' }] },
          sleepQuality: { anyOf: [{ type: 'integer', minimum: 1, maximum: 5 }, { type: 'null' }] },
          sleepMinutes: { anyOf: [{ type: 'integer', minimum: 0, maximum: 1440 }, { type: 'null' }] },
          note: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
        },
      },
    },
  }, async (request) => ({
    checkin: await upsertDailyCheckin(request.auth.userId, request.params.day, request.body),
  }));
}
