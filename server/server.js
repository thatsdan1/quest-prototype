#!/usr/bin/env node
/* QUEST board server. Serves the app in dist/ and one shared board to every screen on the network: lead PCs save to it, floor TVs
   follow it live. Node 18 or later, no dependencies, no internet access. ST IT owns hosting, access rules, and backups in a pilot. */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const APP_ROOT=path.join(__dirname,'..','dist');
const MAX_BODY=25*1024*1024;
const BACKUPS_KEPT=14;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
// The app loads nothing from the internet; the policy keeps it that way. Inline style attributes carry bar widths.
const SECURITY={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};

const isBoard=data=>!!data&&typeof data==='object'&&Array.isArray(data.jobs)&&Array.isArray(data.history);

// One JSON file holds the board and its revision. Each save replaces it atomically, keeps the previous copy as board.json.bak,
// and keeps the first save of each day under backups/ for two weeks.
function createStore(dataDir,log){
 fs.mkdirSync(path.join(dataDir,'backups'),{recursive:true});
 const file=path.join(dataDir,'board.json');
 let current={revision:0,savedAt:null,data:null};
 for(const candidate of [file,file+'.bak']){
  try{const saved=JSON.parse(fs.readFileSync(candidate,'utf8'));if(Number.isInteger(saved.revision)&&isBoard(saved.data)){current=saved;if(candidate!==file)log.warn(`board.json unreadable; loaded ${path.basename(candidate)}`);break;}}
  catch(err){if(err.code!=='ENOENT')log.warn(`Could not read ${path.basename(candidate)}: ${err.message}`);}
 }
 function write(data){
  const next={revision:current.revision+1,savedAt:new Date().toISOString(),data},text=JSON.stringify(next);
  fs.writeFileSync(file+'.tmp',text);
  if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');
  fs.renameSync(file+'.tmp',file);
  const daily=path.join(dataDir,'backups',`board-${next.savedAt.slice(0,10)}.json`);
  if(!fs.existsSync(daily)){fs.writeFileSync(daily,text);for(const old of fs.readdirSync(path.join(dataDir,'backups')).filter(f=>/^board-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0,-BACKUPS_KEPT))fs.rmSync(path.join(dataDir,'backups',old));}
  current=next;return next;
 }
 return {get:()=>current,write};
}

function createServer({dataDir,root=APP_ROOT,log=console}={}){
 if(!dataDir)throw Error('dataDir is required.');
 const store=createStore(dataDir,log),clients=new Set();
 const send=(res,status,body,headers={})=>{const text=typeof body==='string'?body:JSON.stringify(body);res.writeHead(status,{...SECURITY,'Content-Type':typeof body==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(text);};
 const announce=revision=>{for(const res of clients)res.write(`event: revision\ndata: ${JSON.stringify({revision})}\n\n`);};
 const state=()=>({server:'quest-board',...store.get()});

 function readBody(req){return new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>MAX_BODY){reject(Object.assign(Error('Board is too large.'),{status:413}));req.destroy();}else chunks.push(c);});req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject);});}

 async function saveBoard(req,res){
  if(!/^application\/json\b/i.test(req.headers['content-type']||''))return send(res,415,{error:'Send JSON.'});
  let body;try{body=JSON.parse(await readBody(req));}catch(err){return send(res,err.status||400,{error:err.status?err.message:'The board is not valid JSON.'});}
  if(!isBoard(body?.data))return send(res,400,{error:'A board needs jobs and history lists.'});
  const current=store.get();
  // A save based on an older board is refused with the newer one, so the screen can show it instead of overwriting it.
  if(body.baseRevision!==current.revision)return send(res,409,{error:'Another screen saved first.',...state()});
  let saved;try{saved=store.write(body.data);}catch(err){log.error(`Save failed: ${err.message}`);return send(res,500,{error:'The server could not save the board.'});}
  announce(saved.revision);
  send(res,200,{revision:saved.revision,savedAt:saved.savedAt});
 }

 function events(req,res){
  res.writeHead(200,{...SECURITY,'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','Connection':'keep-alive'});
  res.write(`retry: 3000\nevent: revision\ndata: ${JSON.stringify({revision:store.get().revision})}\n\n`);
  clients.add(res);
  const beat=setInterval(()=>res.write(': keep-alive\n\n'),25000);
  req.on('close',()=>{clearInterval(beat);clients.delete(res);});
 }

 function serveFile(req,res,pathname){
  let relative;try{relative=decodeURIComponent(pathname);}catch{return send(res,400,'Bad path.');}
  if(relative.endsWith('/'))relative+='index.html';
  const file=path.resolve(root,'.'+path.posix.normalize(relative));
  if(!file.startsWith(root+path.sep)||relative.includes('\0'))return send(res,404,'Not found.');
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile())return send(res,404,'Not found.');
   res.writeHead(200,{...SECURITY,'Content-Type':TYPES[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
   if(req.method==='HEAD')return res.end();
   fs.createReadStream(file).pipe(res);
  });
 }

 const server=http.createServer((req,res)=>{
  const {pathname}=new URL(req.url,'http://board');
  if(pathname==='/api/state'){if(req.method==='GET')return send(res,200,state());if(req.method==='PUT')return saveBoard(req,res).catch(err=>{log.error(err);send(res,500,{error:'Unexpected server error.'});});return send(res,405,{error:'Use GET or PUT.'},{Allow:'GET, PUT'});}
  if(pathname==='/api/events'&&req.method==='GET')return events(req,res);
  if(pathname==='/api/health'&&req.method==='GET'){const s=store.get();return send(res,200,{ok:true,revision:s.revision,savedAt:s.savedAt,screens:clients.size});}
  if(pathname.startsWith('/api/'))return send(res,404,{error:'Unknown endpoint.'});
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed.',{Allow:'GET, HEAD'});
  serveFile(req,res,pathname);
 });
 // Live event streams never end on their own, so close them before the server waits for open connections.
 const close=server.close.bind(server);
 server.close=callback=>{for(const res of clients)res.end();clients.clear();const result=close(callback);server.closeIdleConnections?.();return result;};
 return server;
}

if(require.main===module){
 const port=Number(process.env.PORT)||4173,host=(process.env.HOST||'').trim()||'127.0.0.1',dataDir=path.resolve(process.env.QUEST_DATA_DIR||path.join(__dirname,'..','data'));
 const server=createServer({dataDir});
 server.listen(port,host,()=>{
  const shown=host==='0.0.0.0'||host==='::'?'<this computer\'s address>':host;
  console.log(`QUEST board server\n  Lead PCs:  http://${shown}:${port}/\n  Floor TV:  http://${shown}:${port}/?display=tv\n  Board data: ${dataDir}`);
  if(host==='127.0.0.1')console.log('  Only this computer can connect. Set HOST=0.0.0.0 to share the board on the network.');
 });
 const stop=()=>server.close(()=>process.exit(0));
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}

module.exports={createServer};
