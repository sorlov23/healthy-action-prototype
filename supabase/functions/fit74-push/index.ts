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
const addDay = (date: string, n: number) =>
  new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const stableEntry = (e: Record<string, unknown> | undefined) => {
  if (!e) return false;
  const points = (e.workout ? 2 : 0) + Number(e.nutrition || 0) +
    ['movement', 'water', 'sleep', 'habit_1', 'habit_2', 'habit_3']
      .filter(k => e[k]).length;
  return points >= 5 || !!(e.minimum_mode && e.movement && e.water && e.habit_3);
};
const shiftSlot = (date: string, anchor: string) => {
  const offset = Math.round((Date.parse(date + 'T12:00:00Z') -
    Date.parse(anchor + 'T12:00:00Z')) / 86400000) - 1;
  return ((offset % 8) + 8) % 8;
};
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
  async reminderContext(endpoint: string, date: string) {
    // Server-side tone selection: no extra push permissions or daily-entry mutations.
    const own = (await db('fit74_push_subscriptions?select=user_id&endpoint=eq.' + eq(endpoint)))?.[0];
    if (!own?.user_id) return 'regular';
    const user = eq(own.user_id);
    const p = (await db('fit74_preferences?select=start_date,end_date,shift_cycle_enabled,shift_anchor_date&user_id=eq.' + user))?.[0];
    if (!p || date < p.start_date || date > p.end_date) return 'regular';
    if (p.shift_cycle_enabled && [4,5,6].includes(shiftSlot(date, p.shift_anchor_date || '2026-10-19')))
      return 'shift';
    const a = addDay(date, -2), b = addDay(date, -1);
    if (a < p.start_date) return 'regular';
    const history = await db('fit74_daily_entries?select=entry_date,workout,nutrition,movement,water,sleep,habit_1,habit_2,habit_3,minimum_mode&user_id=eq.'+
      user + '&entry_date=gte.' + a + '&entry_date=lte.' + b);
    const found = new Map((history || []).map((row: Record<string, unknown>) => [row.entry_date, row]));
    return !stableEntry(found.get(a)) && !stableEntry(found.get(b)) ? 'return' : 'regular';
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
