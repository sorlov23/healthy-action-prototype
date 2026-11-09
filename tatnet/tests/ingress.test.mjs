import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

async function service(t, fetchImpl = async () => new Response('[]',{status:200,headers:{'content-type':'application/json'}}), config={}) {
  const dir=await mkdtemp(path.join(os.tmpdir(),'rinlo-tatnet-'));
  await mkdir(path.join(dir,'rinlo2'));
  await writeFile(path.join(dir,'rinlo2','index.html'), '<html>Rinlo preview</html>');
  const app=createApp({
    publicRoot:dir,
    authBase:'https://qa.neonauth.c-8.eu-central-1.aws.neon.tech/rinlo/auth',
    dataBase:'https://qa.apirest.c-8.eu-central-1.aws.neon.tech/rinlo/rest/v1',
    publicOrigin:'https://rinlo.tatnet.app',
    fetchImpl,
    ...config,
  });
  const server=http.createServer(app);
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(ok=>server.close(ok));await rm(dir,{force:true,recursive:true});});
  return base;
}

test('TatNet serves a local-first Rinlo without exposing dead Supabase endpoints',async t=>{
  const base=await service(t);
  const health=await fetch(base+'/healthz');assert.equal(health.status,200);
  assert.equal((await health.json()).mode,'tatnet-access');
  const root=await fetch(base+'/',{redirect:'manual'});
  assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/rinlo2/');
  const html=await fetch(base+'/rinlo2/');assert.equal(html.status,200);
  assert.match(await html.text(),/Rinlo preview/);
  const runtime=await fetch(base+'/runtime-config.js');
  const text=await runtime.text();
  assert.match(text,/supabaseAuthEnabled:false/);
  assert.match(text,/tatnetSameOrigin:true/);
  assert(!text.includes('xhlbiaueiqcmgifmihur'));
  const status=(await (await fetch(base+'/api/status')).json());
  assert.equal(status.mode,'local_first');assert.equal(status.ai,'not_configured');
});

test('TatNet blocks bad paths, unknown tables and cloud requests without a bearer token',async t=>{
  let requests=0;
  const base=await service(t,async()=>{requests++;return new Response('[]')});
  assert.equal((await fetch(base+'/api/neon/data/rinlo_decisions')).status,401);
  assert.equal((await fetch(base+'/api/neon/data/auth.users',{headers:{authorization:'Bearer abc'}})).status,404);
  assert.equal((await fetch(base+'/api/ai')).status,503);
  assert.equal((await fetch(base+'/not-found-file.js')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/rinlo2/..%5csecret.js')).status,400);
  assert.equal(requests,0);
});

test('TatNet rejects cross-site mutations before contacting Neon',async t=>{
  let requests=0;
  const base=await service(t,async()=>{requests++;return new Response('{}',{status:201})});
  const write=(origin)=>fetch(base+'/api/neon/data/rinlo_decisions',{
    method:'POST',
    headers:{origin,authorization:'Bearer signed.jwt', 'content-type':'application/json'},
    body:'{}',
  });
  const invalid=await write('https://evil.example');
  assert.equal(invalid.status,403);assert.equal(requests,0);
  const valid=await write('https://rinlo.tatnet.app');
  assert.equal(valid.status,201);assert.equal(requests,1);
});

test('TatNet replaces upstream auth cookie domains and paths, and keeps the JWT scoped',async t=>{
  let seen;
  const base=await service(t,async(target,init)=>{
    seen={target,method:init.method,origin:init.headers.get('origin'),cookie:init.headers.get('cookie')};
    return new Response('{"ok":true}',{
      status:200,
      headers:{
        'content-type':'application/json',
        'set-cookie':'__Secure-neon-auth.session_token=secret; Domain=qa.neon.tech; Path=/rinlo/auth; Secure; HttpOnly; SameSite=None',
      },
    });
  });
  const response=await fetch(base+'/api/neon/auth/get-session',{headers:{cookie:'old_token=foo'}});
  assert.equal(response.status,200);
  assert.equal(seen.target,'https://qa.neonauth.c-8.eu-central-1.aws.neon.tech/rinlo/auth/get-session');
  assert.equal(seen.cookie,'old_token=foo');
  const cookie=response.headers.get('set-cookie');
  assert(cookie.includes('Path=/api/neon/auth'));
  assert(!/Domain=/i.test(cookie));
  assert.equal(response.headers.get('access-control-allow-origin'),null);
});

test('No arbitrary proxy upstreams can be configured',()=>{
  assert.throws(()=>createApp({authBase:'https://evil.example',dataBase:''}),/Invalid Neon upstream/);
  assert.throws(()=>createApp({authBase:'',dataBase:'',publicOrigin:'http://not-secure.example'}),/Invalid public origin/);
});
