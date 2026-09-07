import { pool } from './db.js';
import { requireAuth } from './auth.js';

export async function deleteAccount(userId) {
  const result = await pool.query('delete from app_users where id = $1 returning id', [userId]);
  return result.rowCount > 0;
}

export async function registerAccountRoutes(app) {
  app.delete('/api/v1/account', { preHandler: requireAuth }, async (request, reply) => {
    const deleted = await deleteAccount(request.auth.userId);
    if (!deleted) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });
}
