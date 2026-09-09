import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createGuestSession } from '../src/auth.js';
import { createFoodLog, updateFoodLog, deleteFoodLog } from '../src/food-logs.js';
import {
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
  applyDailyMetricDelta,
} from '../src/state.js';
import { deleteAccount } from '../src/account.js';
import { pool } from '../src/db.js';

test('local-first retry keys do not duplicate persisted state', async () => {
  const session = await createGuestSession();
  const suffix = randomUUID();

  try {
    const foodPayload = {
      clientEventId: `food-${suffix}`,
      eatenAt: '2026-09-09T08:00:00.000Z',
      source: 'text',
      originalText: 'омлет и кофе',
      totalKcal: 310,
      totalProtein: 20,
      items: [],
    };
    const firstFood = await createFoodLog(session.userId, foodPayload);
    const replayFood = await createFoodLog(session.userId, foodPayload);
    assert.equal(replayFood.id, firstFood.id);
    assert.equal(replayFood.replayed, true);
    const foodCount = await pool.query(
      'select count(*)::int as count from food_logs where user_id = $1 and client_event_id = $2',
      [session.userId, foodPayload.clientEventId],
    );
    assert.equal(foodCount.rows[0].count, 1);

    const updatedFood = await updateFoodLog(session.userId, firstFood.id, {
      eatenAt: foodPayload.eatenAt,
      source: 'text',
      originalText: 'омлет, кофе и йогурт',
      totalKcal: 420,
      totalProtein: 31,
      items: [],
    });
    assert.equal(updatedFood.totalKcal, 420);
    assert.equal(updatedFood.originalText, 'омлет, кофе и йогурт');

    const weightEventId = `weight-${suffix}`;
    const firstWeight = await createWeightLog(session.userId, 84.4, '2026-09-09T07:00:00.000Z', weightEventId);
    const replayWeight = await createWeightLog(session.userId, 84.4, '2026-09-09T07:00:00.000Z', weightEventId);
    assert.equal(replayWeight.id, firstWeight.id);
    assert.equal(replayWeight.replayed, true);
    const weightCount = await pool.query(
      'select count(*)::int as count from weight_logs where user_id = $1 and client_event_id = $2',
      [session.userId, weightEventId],
    );
    assert.equal(weightCount.rows[0].count, 1);

    const updatedWeight = await updateWeightLog(session.userId, firstWeight.id, 84.1, '2026-09-09T07:15:00.000Z');
    assert.equal(updatedWeight.weightKg, 84.1);

    const operationId = `metric-${suffix}`;
    const firstMetrics = await applyDailyMetricDelta(session.userId, '2026-09-09', {
      operationId,
      waterMlDelta: 250,
      stepsDelta: 1000,
    });
    const replayMetrics = await applyDailyMetricDelta(session.userId, '2026-09-09', {
      operationId,
      waterMlDelta: 250,
      stepsDelta: 1000,
    });
    assert.equal(firstMetrics.waterMl, 250);
    assert.equal(firstMetrics.steps, 1000);
    assert.equal(replayMetrics.waterMl, 250);
    assert.equal(replayMetrics.steps, 1000);
    assert.equal(replayMetrics.replayed, true);

    await assert.rejects(
      () => applyDailyMetricDelta(session.userId, '2026-09-09', {
        operationId,
        waterMlDelta: 500,
        stepsDelta: 1000,
      }),
      /metric_operation_conflict/,
    );

    assert.equal(await deleteFoodLog(session.userId, firstFood.id), true);
    assert.equal(await deleteWeightLog(session.userId, firstWeight.id), true);
    assert.equal(await deleteFoodLog(session.userId, firstFood.id), false);
    assert.equal(await deleteWeightLog(session.userId, firstWeight.id), false);
  } finally {
    await deleteAccount(session.userId);
  }
});

test.after(async () => {
  await pool.end();
});
