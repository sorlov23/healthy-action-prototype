import { pool } from './db.js';
import { requireAuth } from './auth.js';

function mapReview(row) {
  if (!row) return null;
  return {
    day: String(row.day),
    planFit: row.plan_fit,
    actionUseful: row.action_useful,
    mainActionId: row.main_action_id || null,
    mainActionKind: row.main_action_kind || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEveningReview(userId, day) {
  const result = await pool.query(`
    select *
    from daily_evening_reviews
    where user_id = $1 and day = $2::date
  `, [userId, day]);
  return result.rowCount ? mapReview(result.rows[0]) : null;
}

export async function getLatestEveningReviewBefore(userId, day, maxDays = 7) {
  const result = await pool.query(`
    select r.*, a.kind as main_action_kind
    from daily_evening_reviews r
    left join rinlo_actions a
      on a.id = r.main_action_id and a.user_id = r.user_id
    where r.user_id = $1
      and r.day < $2::date
      and r.day >= ($2::date - $3::integer)
    order by r.day desc
    limit 1
  `, [userId, day, maxDays]);
  return result.rowCount ? mapReview(result.rows[0]) : null;
}

export async function upsertEveningReview(userId, day, payload) {
  let mainActionId = payload.mainActionId || null;
  if (mainActionId) {
    const owned = await pool.query(`
      select 1 from rinlo_actions where id = $1::uuid and user_id = $2
    `, [mainActionId, userId]);
    if (!owned.rowCount) mainActionId = null;
  }

  const result = await pool.query(`
    insert into daily_evening_reviews(
      user_id, day, plan_fit, action_useful, main_action_id, updated_at
    ) values($1,$2::date,$3,$4,$5::uuid,now())
    on conflict(user_id, day) do update set
      plan_fit = excluded.plan_fit,
      action_useful = excluded.action_useful,
      main_action_id = excluded.main_action_id,
      updated_at = now()
    returning *
  `, [userId, day, payload.planFit, payload.actionUseful, mainActionId]);
  return mapReview(result.rows[0]);
}

export async function registerEveningReviewRoutes(app) {
  const paramsSchema = {
    type: 'object',
    required: ['day'],
    additionalProperties: false,
    properties: {
      day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    },
  };

  app.get('/api/v1/evening-reviews/:day', {
    preHandler: requireAuth,
    schema: { params: paramsSchema },
  }, async (request) => ({
    eveningReview: await getEveningReview(request.auth.userId, request.params.day),
  }));

  app.put('/api/v1/evening-reviews/:day', {
    preHandler: requireAuth,
    schema: {
      params: paramsSchema,
      body: {
        type: 'object',
        required: ['planFit', 'actionUseful'],
        additionalProperties: false,
        properties: {
          planFit: { type: 'string', enum: ['easy','right','too_much'] },
          actionUseful: { type: 'string', enum: ['yes','no','skipped'] },
          mainActionId: {
            anyOf: [
              { type: 'string', format: 'uuid' },
              { type: 'null' },
            ],
          },
        },
      },
    },
  }, async (request) => ({
    eveningReview: await upsertEveningReview(
      request.auth.userId,
      request.params.day,
      request.body,
    ),
  }));
}
