import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const handler = (await import('../dist/analyzefood.mjs')).default;
const userId = '8b5b067f-28bb-4531-91c3-239bcf7cde53';

test('Neon Gemini endpoint enforces signed JWT before processing', async (t) => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const { privateKey: wrongPrivateKey } = await generateKeyPair('ES256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  const jwksServer = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => jwksServer.close(resolve)));

  process.env.NEON_AUTH_BASE_URL = 'https://auth.example.test';
  process.env.NEON_AUTH_JWKS_URL = `http://127.0.0.1:${jwksServer.address().port}/jwks`;
  delete process.env.GEMINI_API_KEY;

  const sign = (key, issuer = process.env.NEON_AUTH_BASE_URL, expiry = '5m') =>
    new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(userId)
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(key);

  const invoke = async (token, method = 'POST') => {
    const response = await handler.fetch(new Request('https://api.example.test/', {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      ...(method === 'POST' ? { body: '{}' } : {}),
    }));
    return { status: response.status, json: await response.json() };
  };

  assert.equal((await invoke(null)).status, 401, 'no bearer token denied');
  assert.equal((await invoke('not-a-jwt')).status, 401, 'invalid format denied');
  assert.equal((await invoke(await sign(wrongPrivateKey))).status, 401, 'forged token denied');
  assert.equal((await invoke(await sign(privateKey, 'https://wrong-issuer.example'))).status, 401,
    'wrong issuer denied');
  assert.equal((await invoke(await sign(privateKey, process.env.NEON_AUTH_BASE_URL, '-5s'))).status, 401,
    'expired token denied');

  const valid = await invoke(await sign(privateKey));
  assert.equal(valid.status, 503, 'valid JWT gets through authentication but needs a server-side Gemini key');
  assert.equal(valid.json.error, 'vision_not_configured');
  assert.equal((await invoke(await sign(privateKey), 'GET')).status, 405, 'unsupported method denied');

  const options = await handler.fetch(new Request('https://api.example.test/', { method: 'OPTIONS' }));
  assert.equal(options.status, 200);
});
