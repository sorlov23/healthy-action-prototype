import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createGuestSession } from '../src/auth.js';
import { createFoodLog } from '../src/food-logs.js';
import { createWeightLog, applyDailyMetricDelta } from '../src/state.js';
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
  } finally {
    await deleteAccount(session.userId);
  }
});

test.after(async () => {
  await pool.end();
});
