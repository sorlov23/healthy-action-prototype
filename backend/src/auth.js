import { createHash, randomBytes } from 'node:crypto';
import { pool } from './db.js';

const SESSION_TTL_DAYS = Math.min(Math.max(Number(process.env.SESSION_TTL_DAYS || 180), 1), 3650);

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createGuestSession() {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const client = await pool.connect();

  try {
    await client.query('begin');
    const user = await client.query('insert into app_users default values returning id, created_at');
    const session = await client.query(`
      insert into auth_sessions(user_id, token_hash, expires_at)
      values($1, $2, now() + ($3 * interval '1 day'))
      returning id, expires_at
    `, [user.rows[0].id, tokenHash, SESSION_TTL_DAYS]);
    await client.query('commit');

    return {
      token,
      userId: user.rows[0].id,
      expiresAt: session.rows[0].expires_at,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticateToken(token) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = hashToken(token);
  const result = await pool.query(`
    update auth_sessions
    set last_seen_at = now()
    where token_hash = $1
      and revoked_at is null
      and expires_at > now()
    returning id, user_id, expires_at
  `, [tokenHash]);

  if (!result.rowCount) return null;
  return {
    sessionId: result.rows[0].id,
    userId: result.rows[0].user_id,
    expiresAt: result.rows[0].expires_at,
  };
}

export async function requireAuth(request, reply) {
  const header = String(request.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  const auth = match ? await authenticateToken(match[1].trim()) : null;
  if (!auth) {
    return reply.code(401).send({
      error: 'unauthorized',
      message: 'Нужна действующая сессия',
    });
  }
  request.auth = auth;
}

export async function registerAuthRoutes(app) {
  app.post('/api/v1/auth/guest', async (_request, reply) => {
    const session = await createGuestSession();
    return reply.code(201).send({
      type: 'guest',
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
  });

  app.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request) => ({
    userId: request.auth.userId,
    sessionExpiresAt: request.auth.expiresAt,
  }));
}
