import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

test('Neon Auth QA assets are bundled locally and do not embed secrets', () => {
  const html = readFileSync(new URL('../../rinlo2/neon-auth-qa.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../client/auth-qa.ts', import.meta.url), 'utf8');
  const bundleFile = new URL('../../rinlo2/neon-auth-qa.bundle.js', import.meta.url);
  const bundle = readFileSync(bundleFile, 'utf8');

  assert.match(html, /src="\.\/neon-auth-qa\.bundle\.js"/, 'QA only loads first-party JS');
  assert(!/https:\/\/esm\.sh|cdn\.jsdelivr\.net|unpkg\.com/.test(html), 'no cross-origin SDK CDN');
  assert.match(source, /createAuthClient/);
  assert.match(source, /client\.signIn\.email/);
  assert.match(source, /client\.signUp\.email/);
  assert.match(source, /client\.token\(\)/);
  assert.match(source, /credentials: 'omit'/);
  assert.match(source, /rinlo_decisions\?select=id&limit=5/);
  assert(statSync(bundleFile).size > 10_000 && statSync(bundleFile).size < 2_000_000);
  assert(!bundle.includes('sb_secret_'), 'no DB secret key');
  assert(!bundle.includes('GEMINI_API_KEY='), 'no embedded Gemini secret');
  assert(!html.includes('<script src="https://'), 'no remote JS');
});
