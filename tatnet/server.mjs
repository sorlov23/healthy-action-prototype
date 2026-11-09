import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultPublic = path.join(here, 'public');
const tables = new Set(['rinlo_decision_profiles','rinlo_decisions','rinlo_decision_corrections','rinlo_decision_feedback']);
const types = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'
};
const security = {
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer','Cache-Control':'no-store'
};
function json(res,code,value,extra={}) {
  res.writeHead(code,{...security,'Content-Type':'application/json; charset=utf-8',...extra});
  res.end(JSON.stringify(value));
}
function targetBase(value) {
  if (!value) return '';
  const url=new URL(value);
  if(url.protocol!=='https:' || !url.hostname.endsWith('.neon.tech') || url.username || url.password || url.search || url.hash)
    throw new Error('Invalid Neon upstream URL');
  return url.toString().replace(/\/$/,'');
}
function bodyLimit(req,max=1024*1024) {
  return new Promise((resolve,reject)=>{
    let length=0;const chunks=[];
    req.on('data',chunk=>{
      length+=chunk.length;
      if(length>max) {reject(Object.assign(new Error('too_large'),{status:413}));req.destroy();}
      else chunks.push(chunk);
    });
    req.on('error',reject);
    req.on('end',()=>resolve(Buffer.concat(chunks)));
  });
}
function sameOriginCookie(value,prefix) {
  if (!value || !/^[^\s=;]+=[^;]*/.test(value)) return null;
  let cookie=value.replace(/;\s*Domain=[^;]*/gi,'').replace(/;\s*Path=[^;]*/gi,'');
  cookie+='; Path='+(value.startsWith('__Host-')?'/':prefix);
  return cookie;
}
async function relay(req,res,{base,prefix,origin,fetchImpl,withCookies=false,requireBearer=false}) {
  if(!base)return json(res,503,{error:'upstream_not_configured'});
  if(requireBearer&&!/^Bearer\s+\S+$/i.test(String(req.headers.authorization||'')))
    return json(res,401,{error:'authorization_required'});
  const method=req.method?.toUpperCase();
  if(!['GET','HEAD','POST','PATCH','PUT','DELETE','OPTIONS'].includes(method))
    return json(res,405,{error:'method_not_allowed'});
  if(!['GET','HEAD','OPTIONS'].includes(method)) {
    if(!origin)return json(res,503,{error:'public_origin_not_configured'});
    if(req.headers.origin!==origin)return json(res,403,{error:'invalid_request_origin'});
  }
  if(method==='OPTIONS'){res.writeHead(204,{...security,Allow:'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS'});return res.end();}
  const u=new URL(req.url,'http://localhost');
  const relative=u.pathname.slice(prefix.length);
  if(!relative.startsWith('/')||relative.includes('\\')||/%2f|%5c|%00/i.test(relative))
    return json(res,400,{error:'invalid_proxy_path'});
  const headers=new Headers();
  for(const name of ['accept','content-type','authorization','if-none-match']) {
    if(req.headers[name])headers.set(name,String(req.headers[name]));
  }
  if(withCookies&&req.headers.cookie) headers.set('cookie',String(req.headers.cookie));
  if(withCookies&&origin) headers.set('origin',origin);
  let body;
  if(!['GET','HEAD'].includes(method)) {
    try{body=await bodyLimit(req);}
    catch(error){return json(res,error.status||400,{error:'invalid_request'});}
  }
  try {
    const reply=await fetchImpl(base+relative+u.search,{
      method,headers,body,redirect:'manual',signal:AbortSignal.timeout(12000)
    });
    const out={...security};
    for(const name of ['content-type','etag','last-modified','location','retry-after']) {
      const v=reply.headers.get(name);if(v)out[name]=v;
    }
    if(withCookies&&out.location&&out.location.startsWith(base))
      out.location=origin+prefix+out.location.slice(base.length);
    if(withCookies){
      const cookies=(reply.headers.getSetCookie?.()||[]).map(v=>sameOriginCookie(v,prefix)).filter(Boolean);
      if(cookies.length)out['Set-Cookie']=cookies;
    }
    res.writeHead(reply.status,out);
    if(method==='HEAD'||!reply.body)return res.end();
    for await(const chunk of reply.body)res.write(chunk);
    res.end();
  }catch{
    if(!res.headersSent)json(res,502,{error:'upstream_unreachable'});
    else res.destroy();
  }
}
function publicConfig() {
  return [
    'window.HEALTHY_ACTION_CONFIG=Object.freeze({',
    "apiBase:'',supabaseAuthEnabled:false,supabaseDataEnabled:false,",
    "supabaseUrl:'',supabasePublishableKey:'',tatnetSameOrigin:true,tatnetAiEnabled:false",
    '});',
    "if(location.pathname.includes('/rinlo2/')){",
    "const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-pass-v1.css';document.head.append(css);",
    "document.addEventListener('DOMContentLoaded',()=>{",
    "for(const src of ['./home-decision-entry-v1.js','../tatnet-offline-notice.js']){",
    "const el=document.createElement('script');el.src=src;document.body.append(el);",
    "}}, {once:true});",
    "}"
  ].join('\n');
}

export function createApp({publicRoot=defaultPublic,authBase=process.env.RINLO_NEON_AUTH_BASE_URL,
  dataBase=process.env.RINLO_NEON_DATA_API_URL,publicOrigin=process.env.RINLO_PUBLIC_ORIGIN,
  fetchImpl=fetch}={}) {
  const auth=targetBase(authBase),data=targetBase(dataBase);
  if(publicOrigin){
    const originUrl=new URL(publicOrigin);
    if(originUrl.protocol!=='https:'||originUrl.pathname!=='/'||originUrl.search||originUrl.hash)
      throw new Error('Invalid public origin');
  }
  const root=path.resolve(publicRoot);
  return async (req,res)=>{
    const raw=String(req.url||'/');
    if(raw.length>4096)return json(res,414,{error:'uri_too_long'});
    let url;
    try{url=new URL(raw,'http://localhost');}
    catch{return json(res,400,{error:'invalid_url'});}
    if(url.pathname==='/healthz')return json(res,200,{ok:true,mode:'tatnet-access'});
    if(url.pathname==='/api/status')return json(res,200,{
      frontend:'available',auth:auth?'proxy_configured':'not_configured',
      data:data?'proxy_configured':'not_configured',ai:'not_configured',mode:'local_first'});
    if(url.pathname.startsWith('/api/neon/auth/'))
      return relay(req,res,{base:auth,prefix:'/api/neon/auth',origin:publicOrigin,fetchImpl,withCookies:true});
    if(url.pathname.startsWith('/api/neon/data/')){
      const table=url.pathname.slice('/api/neon/data/'.length);
      if(!tables.has(table))return json(res,404,{error:'resource_not_found'});
      return relay(req,res,{base:data,prefix:'/api/neon/data',origin:publicOrigin,fetchImpl,requireBearer:true});
    }
    if(url.pathname.startsWith('/api/'))return json(res,503,{error:'api_feature_not_configured'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'method_not_allowed'});
    if(url.pathname==='/'){res.writeHead(302,{...security,Location:'/rinlo2/'});return res.end();}
    if(url.pathname==='/runtime-config.js'){
      res.writeHead(200,{...security,'Content-Type':types['.js']});
      return res.end(req.method==='HEAD'?'':publicConfig());
    }
    let decoded;
    try{decoded=decodeURIComponent(url.pathname);}
    catch{return json(res,400,{error:'invalid_path'});}
    if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').includes('..'))
      return json(res,400,{error:'invalid_path'});
    const filename=path.resolve(root,'.'+decoded+(decoded.endsWith('/')?'index.html':''));
    if(!filename.startsWith(root+path.sep))return json(res,403,{error:'access_denied'});
    const ext=path.extname(filename).toLowerCase();
    if(!types[ext]||path.basename(filename).startsWith('.'))return json(res,404,{error:'not_found'});
    try{
      if(!(await stat(filename)).isFile())return json(res,404,{error:'not_found'});
      const data=await readFile(filename);
      res.writeHead(200,{...security,'Content-Type':types[ext]});
      return res.end(req.method==='HEAD'?'':data);
    }catch{return json(res,404,{error:'not_found'});}
  };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8080),host=process.env.HOST||'0.0.0.0';
  http.createServer(createApp()).listen(port,host,()=>console.log('Rinlo TatNet ready on '+host+':'+port));
}
