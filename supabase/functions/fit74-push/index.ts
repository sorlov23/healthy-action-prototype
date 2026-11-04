import webpush from 'npm:web-push@3.6.7';
import { createHandler } from './core.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function db(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Database ${response.status}`);
  return response.status === 204 ? null : await response.json();
}
const eq = (value: string) => encodeURIComponent(value);
const store = {
  async config() { return (await db('fit74_push_config?id=eq.1'))?.[0]; },
  async initializeKeys(keys: { publicKey: string; privateKey: string }) {
    await db('fit74_push_config?id=eq.1&vapid_private=is.null', 'PATCH', {
      vapid_public: keys.publicKey, vapid_private: keys.privateKey,
    });
  },
  async subscribe(user: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, timeZone: string) {
    // Do not reset daily delivery or test timestamps when reconnecting.
    await db('fit74_push_subscriptions?on_conflict=endpoint', 'POST', {
      user_id: user, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth, time_zone: timeZone, enabled: true,
      updated_at: new Date().toISOString(), last_status: 'connected',
    });
  },
  async owned(user: string, endpoint: string) {
    return (await db(`fit74_push_subscriptions?user_id=eq.${eq(user)}&endpoint=eq.${eq(endpoint)}&select=enabled,last_status`))?.[0];
  },
  async disable(user: string, endpoint: string) {
    await db(`fit74_push_subscriptions?user_id=eq.${eq(user)}&endpoint=eq.${eq(endpoint)}`, 'PATCH', { enabled: false });
  },
  async claimDue() { return await db('rpc/fit74_push_claim_due', 'POST', {}); },
  async claimTest(user: string, endpoint: string) {
    const before = new Date(Date.now() - 60000).toISOString();
    return (await db(`fit74_push_subscriptions?user_id=eq.${eq(user)}&endpoint=eq.${eq(endpoint)}&enabled=eq.true&or=(last_test_at.is.null,last_test_at.lt.${before})`,
      'PATCH', { last_test_at: new Date().toISOString() }))?.[0];
  },
  async sent(endpoint: string, date: string) {
    await db(`fit74_push_subscriptions?endpoint=eq.${eq(endpoint)}`, 'PATCH', {
      last_sent_date: date, lease_until: null, last_status: 'sent', updated_at: new Date().toISOString(),
    });
  },
  async failed(endpoint: string, status: number, expired: boolean) {
    await db(`fit74_push_subscriptions?endpoint=eq.${eq(endpoint)}`, 'PATCH', {
      last_status: expired ? 'expired' : `error_${status}`, ...(expired ? { enabled: false } : {}),
    });
  },
  async heartbeat(result: { claimed: number; sent: number }) {
    await db('fit74_push_config?id=eq.1', 'PATCH', { last_run_at: new Date().toISOString(), last_result: result });
  },
};

async function authenticate(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: authorization }, signal: AbortSignal.timeout(10000),
  });
  return response.ok ? await response.json() : null;
}

// JWT verification happens with Auth for user actions; dispatch requires its own private secret.
Deno.serve(createHandler({ store, authenticate, push: webpush }));
