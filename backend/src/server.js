import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import { pingDb, pool } from './db.js';
import { searchFoods } from './food-search.js';
import { resolveFoodText } from './food-resolver.js';
import { registerAuthRoutes } from './auth.js';
import { registerFoodLogRoutes } from './food-logs.js';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  trustProxy: true,
});

const allowedOrigins = String(process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

await app.register(cors, {
  origin(origin, cb) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.get('/health', async () => ({ status: 'ok', service: 'healthy-action-api' }));

app.get('/ready', async (_request, reply) => {
  try {
    const db = await pingDb();
    return { status: 'ready', databaseTime: db.now };
  } catch (error) {
    app.log.error(error);
    return reply.code(503).send({ status: 'not_ready' });
  }
});

app.get('/api/v1/foods/search', {
  schema: {
    querystring: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string', minLength: 2, maxLength: 120 },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 6 },
      },
    },
  },
}, async (request) => {
  const items = await searchFoods(request.query.q, request.query.limit);
  return { query: request.query.q, items };
});

app.post('/api/v1/food/resolve', {
  schema: {
    body: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', minLength: 2, maxLength: 1000 },
      },
    },
  },
}, async (request) => resolveFoodText(request.body.text));

await registerAuthRoutes(app);
await registerFoodLogRoutes(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.validation) {
    return reply.code(400).send({
      error: 'validation_error',
      message: 'Проверь параметры запроса',
      details: error.validation,
    });
  }
  return reply.code(500).send({ error: 'internal_error' });
});

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);

const shutdown = async (signal) => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
