import { pool } from './db.js';
import { requireAuth } from './auth.js';

function mapProfile(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    startWeightKg: row.start_weight_kg == null ? null : Number(row.start_weight_kg),
    targetWeightKg: row.target_weight_kg == null ? null : Number(row.target_weight_kg),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    ageYears: row.age_years == null ? null : Number(row.age_years),
    birthYear: row.birth_year == null ? null : Number(row.birth_year),
    sex: row.sex,
    activity: row.activity,
    focuses: row.focuses || [],
    primaryGoal: row.primary_goal,
    secondaryGoals: row.secondary_goals || [],
    calorieTrackingEnabled: row.calorie_tracking_enabled !== false,
    calorieTarget: row.calorie_target == null ? null : Number(row.calorie_target),
    proteinTargetG: row.protein_target_g == null ? null : Number(row.protein_target_g),
    stepTarget: row.step_target == null ? null : Number(row.step_target),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(userId) {
  const result = await pool.query('select * from profiles where user_id = $1', [userId]);
  return result.rowCount ? mapProfile(result.rows[0]) : null;
}

export async function upsertProfile(userId, payload) {
  const hasSex = Object.hasOwn(payload, 'sex');
  const hasPrimaryGoal = Object.hasOwn(payload, 'primaryGoal');
  const hasSecondaryGoals = Object.hasOwn(payload, 'secondaryGoals');
  const hasCalorieTracking = Object.hasOwn(payload, 'calorieTrackingEnabled');

  const result = await pool.query(`
    insert into profiles(
      user_id, start_weight_kg, target_weight_kg, height_cm, age_years, sex,
      activity, focuses, calorie_target, protein_target_g, step_target,
      primary_goal, secondary_goals, calorie_tracking_enabled, updated_at
    ) values($1,$2,$3,$4,$5,$6,$7,$8::text[],$9,$10,$11,$12,$13::text[],$14,now())
    on conflict(user_id) do update set
      start_weight_kg = excluded.start_weight_kg,
      target_weight_kg = excluded.target_weight_kg,
      height_cm = excluded.height_cm,
      age_years = excluded.age_years,
      sex = case when $15::boolean then excluded.sex else profiles.sex end,
      activity = excluded.activity,
      focuses = excluded.focuses,
      calorie_target = excluded.calorie_target,
      protein_target_g = excluded.protein_target_g,
      step_target = excluded.step_target,
      primary_goal = case when $16::boolean then excluded.primary_goal else profiles.primary_goal end,
      secondary_goals = case when $17::boolean then excluded.secondary_goals else profiles.secondary_goals end,
      calorie_tracking_enabled = case when $18::boolean then excluded.calorie_tracking_enabled else profiles.calorie_tracking_enabled end,
      updated_at = now()
    returning *
  `, [
    userId,
    payload.startWeightKg ?? null,
    payload.targetWeightKg ?? null,
    payload.heightCm ?? null,
    payload.ageYears ?? null,
    payload.sex ?? null,
    payload.activity ?? null,
    payload.focuses || [],
    payload.calorieTarget ?? null,
    payload.proteinTargetG ?? null,
    payload.stepTarget ?? null,
    payload.primaryGoal ?? null,
    payload.secondaryGoals || [],
    payload.calorieTrackingEnabled ?? true,
    hasSex,
    hasPrimaryGoal,
    hasSecondaryGoals,
    hasCalorieTracking,
  ]);
  return mapProfile(result.rows[0]);
}

export async function registerProfileRoutes(app) {
  app.get('/api/v1/profile', { preHandler: requireAuth }, async (request) => ({
    profile: await getProfile(request.auth.userId),
  }));

  app.put('/api/v1/profile', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'startWeightKg', 'targetWeightKg', 'heightCm', 'ageYears', 'activity',
          'focuses', 'calorieTarget', 'proteinTargetG', 'stepTarget',
        ],
        properties: {
          startWeightKg: { type: 'number', minimum: 30, maximum: 300 },
          targetWeightKg: { type: 'number', minimum: 30, maximum: 300 },
          heightCm: { type: 'number', minimum: 120, maximum: 230 },
          ageYears: { type: 'integer', minimum: 14, maximum: 100 },
          sex: {
            anyOf: [
              { type: 'string', enum: ['male','female','other'] },
              { type: 'null' },
            ],
          },
          activity: { type: 'string', enum: ['low','medium','high'] },
          focuses: {
            type: 'array',
            maxItems: 2,
            uniqueItems: true,
            items: { type: 'string', enum: ['vape','fastfood','water'] },
          },
          primaryGoal: {
            anyOf: [
              { type: 'string', enum: ['weight_loss','nutrition','movement','sleep','energy','nicotine'] },
              { type: 'null' },
            ],
          },
          secondaryGoals: {
            type: 'array',
            maxItems: 3,
            uniqueItems: true,
            items: { type: 'string', enum: ['weight_loss','nutrition','movement','sleep','energy','nicotine'] },
          },
          calorieTrackingEnabled: { type: 'boolean' },
          calorieTarget: { type: 'integer', minimum: 800, maximum: 6000 },
          proteinTargetG: { type: 'integer', minimum: 20, maximum: 500 },
          stepTarget: { type: 'integer', minimum: 1000, maximum: 50000 },
        },
      },
    },
  }, async (request) => ({
    profile: await upsertProfile(request.auth.userId, request.body),
  }));
}
