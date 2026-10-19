const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {createServer}=require('../server/server.js');
const {createSync}=require('../dist/sync.js');

const quiet={warn(){},error(){},log(){}};
const board=(note='')=>({version:5,jobs:[{id:'a',job:'DEMO-1',note}],history:[],processes:[]});
async function start(dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'quest-board-'))){
 const server=createServer({dataDir,log:quiet});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 return {server,base,dataDir,close:()=>new Promise(r=>server.close(r))};
}
const put=(base,body,type='application/json')=>fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':type},body:typeof body==='string'?body:JSON.stringify(body)});
const rawGet=(base,pathname)=>new Promise((resolve,reject)=>{const {hostname,port}=new URL(base);http.get({hostname,port,path:pathname},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});

test('the server starts empty, saves a board, and refuses a save based on an older revision',async()=>{
 const s=await start();
 try{
  let res=await fetch(s.base+'/api/state');assert.deepEqual(await res.json(),{server:'quest-board',revision:0,savedAt:null,data:null});
  res=await put(s.base,{baseRevision:0,data:board('first')});assert.equal(res.status,200);assert.equal((await res.json()).revision,1);
  res=await put(s.base,{baseRevision:0,data:board('stale')});assert.equal(res.status,409);
  const conflict=await res.json();assert.equal(conflict.revision,1);assert.equal(conflict.data.jobs[0].note,'first');
  res=await fetch(s.base+'/api/state');assert.equal((await res.json()).data.jobs[0].note,'first');
 }finally{await s.close();}
});

test('the server rejects malformed saves without touching the board',async()=>{
 const s=await start();
 try{
  assert.equal((await put(s.base,'{not json')).status,400);
  assert.equal((await put(s.base,{baseRevision:0,data:{jobs:[]}})).status,400);
  assert.equal((await put(s.base,{baseRevision:0,data:board()},'text/plain')).status,415);
  assert.equal((await fetch(s.base+'/api/state',{method:'DELETE'})).status,405);
  assert.equal((await fetch(s.base+'/api/state')).status,200);
  assert.equal((await (await fetch(s.base+'/api/state')).json()).revision,0);
 }finally{await s.close();}
});

test('the board survives a restart, with a previous copy and a daily backup',async()=>{
 const first=await start();
 await put(first.base,{baseRevision:0,data:board('one')});await put(first.base,{baseRevision:1,data:board('two')});
 await first.close();
 const files=fs.readdirSync(first.dataDir);
 assert.ok(files.includes('board.json')&&files.includes('board.json.bak'));
 assert.equal(fs.readdirSync(path.join(first.dataDir,'backups')).length,1);
 // A damaged board.json falls back to the previous copy.
 fs.writeFileSync(path.join(first.dataDir,'board.json'),'{broken');
 const second=await start(first.dataDir);
 try{const body=await (await fetch(second.base+'/api/state')).json();assert.equal(body.revision,1);assert.equal(body.data.jobs[0].note,'one');}
 finally{await second.close();}
});

test('the server serves the app with a no-internet policy and never files outside it',async()=>{
 const s=await start();
 try{
  const res=await fetch(s.base+'/?display=tv');assert.equal(res.status,200);
  assert.match(res.headers.get('content-type'),/text\/html/);
  assert.match(res.headers.get('content-security-policy'),/default-src 'self'/);
  assert.match(await res.text(),/sync\.js/);
  assert.equal((await fetch(s.base+'/app.js?v=9')).status,200);
  for(const p of ['/%2e%2e/server/server.js','/..%2fpackage.json','/%2e%2e%2f%2e%2e%2fetc/passwd','/missing.js'])assert.equal(await rawGet(s.base,p),404,p);
  assert.equal((await fetch(s.base+'/app.js',{method:'POST'})).status,405);
 }finally{await s.close();}
});

test('screens hear about a save through the live event stream',async()=>{
 const s=await start();
 try{
  const events=[];let resolveSecond;const second=new Promise(r=>resolveSecond=r);
  const req=http.get(s.base+'/api/events',res=>{res.setEncoding('utf8');let buffer='';res.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,i);buffer=buffer.slice(i+2);const data=/^data: (.*)$/m.exec(block);if(/^event: revision$/m.test(block)&&data){events.push(JSON.parse(data[1]).revision);if(events.length===2)resolveSecond();}}});});
  await new Promise(r=>setTimeout(r,50));
  await put(s.base,{baseRevision:0,data:board()});
  await second;assert.deepEqual(events,[0,1]);req.destroy();
 }finally{await s.close();}
});

test('two screens share one board: the first seeds it, the second loads it, and a stale save takes the newer board',async()=>{
 const s=await start();
 try{
  const lead=[],tv=[];
  const a=createSync({fetch,base:s.base,onRemote:(d,m)=>lead.push([m.reason,d.jobs[0].note])});
  assert.equal(await a.connect(board('seed')),true);assert.equal(a.revision,1);assert.deepEqual(lead,[]);
  const b=createSync({fetch,base:s.base,onRemote:(d,m)=>tv.push([m.reason,d.jobs[0].note])});
  assert.equal(await b.connect(board('ignored')),true);assert.deepEqual(tv,[['load','seed']]);
  await a.save(board('lead edit'));assert.equal(a.revision,2);
  await b.save(board('tv edit on an old board'));
  assert.deepEqual(tv.at(-1),['conflict','lead edit']);assert.equal(b.revision,2);
  await b.save(board('tv edit after reload'));assert.equal(b.revision,3);
  await a.refresh();assert.deepEqual(lead.at(-1),['update','tv edit after reload']);
 }finally{await s.close();}
});

test('a page opened without the board server stays on device storage',async()=>{
 const sync=createSync({fetch:async()=>({ok:true,status:200,json:async()=>({something:'else'})})});
 assert.equal(await sync.connect(board()),false);assert.equal(sync.connected,false);
 const offline=createSync({fetch:async()=>{throw Error('refused');}});
 assert.equal(await offline.connect(board()),false);
 await offline.save(board());
});

test('saves made while one is in flight send only the newest board, and a dropped connection retries it',async()=>{
 let revision=0,fail=false;const sent=[],statuses=[],timers=[];
 const fetchStub=async(url,{method,body})=>{
  if(method==='GET')return {ok:true,status:200,json:async()=>({server:'quest-board',revision,data:{version:5,jobs:[],history:[]}})};
  if(fail)throw Error('network down');
  await new Promise(r=>setImmediate(r));
  const payload=JSON.parse(body);sent.push(payload.data.jobs[0].note);revision++;return {ok:true,status:200,json:async()=>({revision})};
 };
 const sync=createSync({fetch:fetchStub,onStatus:s=>statuses.push(s),timers:{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}}});
 await sync.connect(board());
 const first=sync.save(board('one'));sync.save(board('two'));sync.save(board('three'));await first;
 assert.deepEqual(sent,['one','three']);assert.equal(statuses.at(-1),'saved');
 fail=true;await sync.save(board('four'));assert.equal(statuses.at(-1),'offline');assert.equal(timers.length,1);
 fail=false;await timers[0]();assert.deepEqual(sent,['one','three','four']);assert.equal(statuses.at(-1),'saved');
});
