// Local preview only. Render serves fit74/ directly, without this fixture.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
const root=fileURLToPath(new URL('../fit74/',import.meta.url));
const args=process.argv.slice(2), port=Number(args[args.indexOf('--port')+1])||4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const fixture=`<script>
(()=>{
 const NativeDate=Date, fixed=NativeDate.parse('2026-10-18T19:30:00Z');
 window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}};
 const user={id:'00000000-0000-4000-8000-000000000074',email:'preview@example.invalid',user_metadata:{display_name:'Сергей'}};
 localStorage.setItem('fit74_session',JSON.stringify({user,access_token:'local-preview-only',expires_at:4102444800}));
 const nativeFetch=window.fetch.bind(window), tables={fit74_preferences:[{user_id:user.id,reminder_enabled:false}],fit74_workout_sessions:[],fit74_daily_entries:[],fit74_shift_overrides:[]};
 window.fetch=async(input,opts={})=>{
  const url=String(input);if(!url.startsWith('https://dllanxwrezqqufgzucuc.supabase.co/'))return nativeFetch(input,opts);
  const table=new URL(url).pathname.split('/').pop(), method=opts.method||'GET';let result=tables[table]||[];
  if(method==='POST'||method==='PATCH'){
   const body=JSON.parse(opts.body||'{}'),rows=Array.isArray(body)?body:[body];
   for(const row of rows){const key=table==='fit74_workout_sessions'?'workout_code':table==='fit74_daily_entries'?'entry_date':table==='fit74_shift_overrides'?'work_date':'user_id';const i=result.findIndex(x=>x[key]===row[key]&&(table!=='fit74_workout_sessions'||x.session_date===row.session_date));if(i<0)result.push(row);else result[i]={...result[i],...row};}tables[table]=result;result=rows;
  }else if(method==='DELETE'){const params=new URL(url).searchParams;tables[table]=result.filter(row=>![...params].every(([k,v])=>!v.startsWith('eq.')||String(row[k])===v.slice(3)));result=[];}
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
})();</script>`;
createServer(async(req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://preview').pathname);
  if(path==='/'){
   const stage=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Fit74 · Импульс</title><style>body{margin:0;background:#e7e7e4;font:14px system-ui;display:grid;justify-content:center}nav{display:flex;align-items:center;justify-content:center;gap:12px;height:48px}button{padding:5px 10px;border:1px solid #ccc;border-radius:6px;background:white}iframe{border:0;background:#f8f8f6;box-shadow:0 8px 50px #0001;display:block}small{color:#666}</style><nav><b>Fit74</b><button onclick="document.querySelector('iframe').width=320">320</button><button onclick="document.querySelector('iframe').width=390">390</button><button onclick="document.querySelector('iframe').width=680">680</button><small>Предпросмотр</small></nav><iframe id="fit74Preview" title="Fit74" width="390" height="844" src="/app/"></iframe></html>`;
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(stage);return;
  }
  if(path.startsWith('/app/'))path=path.slice(4);
  if(path==='/')path='/index.html';
  const file=resolve(root,'.'+path);if(!file.startsWith(root)){res.writeHead(403).end();return;}
  let data=await readFile(file);if(path==='/index.html')data=Buffer.from(data.toString().replace('<head>','<head>'+fixture+'<style>::-webkit-scrollbar{width:0;height:0}</style>'));
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,'0.0.0.0',()=>console.log('Fit74 isolated preview on port '+port));
