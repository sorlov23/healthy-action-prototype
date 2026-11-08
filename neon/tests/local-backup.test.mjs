import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../rinlo2/migration-local-backup-v1.js', import.meta.url), 'utf8');

test('local Rinlo backup excludes auth, keys and corrupted entries', () => {
  const saved = new Map([
    ['rinlo2-foundation-state-v1', JSON.stringify({ goal: 'lose', staples: ['eggs', 'cheese'] })],
    ['rinlo2-decisions-v2', JSON.stringify([{ id: 'decision-1', question: 'Завтрак' }])],
    ['rinlo2-cook-v1', JSON.stringify({ recent: ['Яйца'] })],
    ['rinlo2-corrections-v1', '[corrupt'],
    ['rinlo2-feedback-v1', JSON.stringify([{ feedback: 'helpful' }])],
    ['rinlo_supabase_session_v1', JSON.stringify({ access_token: 'very-secret', refresh_token: 'other-secret' })],
    ['GEMINI_API_KEY', '"must-not-leak"'],
  ]);

  const ctx = {
    window: {},
    localStorage: { getItem: (key) => saved.get(key) ?? null },
    document: { getElementById: () => null },
    Date,
    console,
  };
  vm.runInNewContext(source, ctx);
  const snapshot = ctx.window.RinloLocalBackup.buildSnapshot();
  const safe = JSON.parse(JSON.stringify(snapshot));

  assert.equal(safe.format, 'rinlo-local-backup');
  assert.equal(safe.version, 1);
  assert.equal(safe.data['rinlo2-foundation-state-v1'].goal, 'lose');
  assert.equal(safe.data['rinlo2-decisions-v2'][0].id, 'decision-1');
  assert(!Object.hasOwn(safe.data, 'rinlo2-corrections-v1'), 'corrupted JSON skipped');
  assert(!Object.hasOwn(safe.data, 'rinlo_supabase_session_v1'), 'Auth credentials excluded');
  assert(!Object.hasOwn(safe.data, 'GEMINI_API_KEY'), 'API secrets excluded');
  assert(!JSON.stringify(safe).includes('very-secret'));
  assert(!JSON.stringify(safe).includes('other-secret'));
  assert(!JSON.stringify(safe).includes('must-not-leak'));
});
