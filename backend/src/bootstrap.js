import { requireAuth } from './auth.js';
import { getProfile } from './profile.js';
import { getDayOverview, listWeightLogs } from './state.js';
import { getDailyCheckin } from './checkins.js';
import { listActionsForDay } from './actions.js';
import { getEveningReview } from './evening-reviews.js';

export async function buildBootstrap(userId, day, timezoneOffsetMinutes = 0) {
  const [profile, currentDay, weights, checkin, actions, eveningReview] = await Promise.all([
    getProfile(userId),
    getDayOverview(userId, day, timezoneOffsetMinutes),
    listWeightLogs(userId, 30),
    getDailyCheckin(userId, day),
    listActionsForDay(userId, day),
    getEveningReview(userId, day),
  ]);

  const currentAction = actions.find((action) => ['suggested','accepted'].includes(action.status)) || null;

  return {
    profile,
    day: currentDay,
    weights,
    checkin,
    actions,
    currentAction,
    eveningReview,
    serverTime: new Date().toISOString(),
  };
}

export async function registerBootstrapRoutes(app) {
  app.get('/api/v1/bootstrap', {
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
  }, async (request) => buildBootstrap(
    request.auth.userId,
    request.query.day,
    request.query.timezoneOffsetMinutes || 0,
  ));
}
