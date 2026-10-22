const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {createServer}=require('../server/server.js');
const {createSync,mergeBoards}=require('../dist/sync.js');

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

test('two screens share one board: the first seeds it, the second loads it, and a stale save merges into the newer board',async()=>{
 const s=await start();
 try{
  const lead=[],tv=[];
  const a=createSync({fetch,base:s.base,onRemote:(d,m)=>lead.push([m.reason,d.jobs[0].note])});
  assert.equal(await a.connect(board('seed')),true);assert.equal(a.revision,1);assert.deepEqual(lead,[]);
  const b=createSync({fetch,base:s.base,onRemote:(d,m)=>tv.push([m.reason,d.jobs[0].note,m.clashes])});
  assert.equal(await b.connect(board('ignored')),true);assert.deepEqual(tv,[['load','seed',undefined]]);
  await a.save(board('lead edit'));assert.equal(a.revision,2);
  // Both changed the same field: the later save keeps its value and says so.
  await b.save(board('tv edit on an old board'));
  assert.deepEqual(tv.at(-1),['merged','tv edit on an old board',1]);assert.equal(b.revision,3);assert.equal(b.unsaved,false);
  await a.refresh();assert.deepEqual(lead.at(-1),['update','tv edit on an old board']);
 }finally{await s.close();}
});

const job=(id,fields={})=>({id,job:id.toUpperCase(),status:'on-track',comment:'',...fields});
const shared=()=>({version:5,processes:[{id:'p',revision:1}],jobs:[job('a'),job('b')],history:[{id:'h1',at:'1'}],display:{cellCount:30}});

test('a merge keeps both screens\' new jobs, history, and edits to different fields',()=>{
 const base=shared();
 const local=structuredClone(base),remote=structuredClone(base),clash={count:0};
 local.jobs.push(job('mine'));local.history.unshift({id:'h-mine',at:'3'});local.jobs[0].status='blocked';
 remote.jobs.push(job('theirs'));remote.history.unshift({id:'h-theirs',at:'2'});remote.jobs[0].comment='Waiting on tooling';remote.display.cellCount=36;
 const merged=mergeBoards(base,local,remote,clash);
 assert.deepEqual(merged.jobs.map(j=>j.id),['a','b','theirs','mine']);
 assert.deepEqual(merged.history.map(h=>h.id),['h-mine','h-theirs','h1']);
 assert.equal(merged.jobs[0].status,'blocked');assert.equal(merged.jobs[0].comment,'Waiting on tooling');
 assert.equal(merged.display.cellCount,36);assert.equal(clash.count,0);
});

test('a merge counts same-field clashes, honours removals, and keeps a removed record that was edited here',()=>{
 const base=shared();
 const local=structuredClone(base),remote=structuredClone(base),clash={count:0};
 local.jobs[0].status='blocked';remote.jobs[0].status='at-risk';
 remote.jobs=remote.jobs.filter(j=>j.id!=='b');
 const merged=mergeBoards(base,local,remote,clash);
 assert.equal(merged.jobs[0].status,'blocked');assert.equal(clash.count,1);
 assert.deepEqual(merged.jobs.map(j=>j.id),['a']);
 const edited=structuredClone(base);edited.jobs[1].comment='Kept';
 assert.deepEqual(mergeBoards(base,edited,remote).jobs.map(j=>j.id),['a','b']);
 assert.equal(mergeBoards(base,base,remote),remote);
});

// A fetch that can drop off the network, like a lead PC losing Wi-Fi.
const flaky=()=>{const f=async(...args)=>{if(f.down)throw Error('network down');return fetch(...args);};f.down=false;return f;};
const manualTimers=()=>{const t={pending:[],setTimeout(fn){t.pending.push(fn);return t.pending.length;},clearTimeout(){}};return t;};
const twoJobs=(a,b)=>({version:5,jobs:[job('a',{comment:a}),job('b',{comment:b})],history:[],processes:[]});

test('two leads saving at the same moment both keep their job',async()=>{
 const s=await start();
 try{
  const notices=[],seen=(d,m)=>notices.push([m.reason,m.clashes]);
  const a=createSync({fetch,base:s.base,onRemote:seen}),b=createSync({fetch,base:s.base,onRemote:seen});
  await a.connect(twoJobs('',''));await b.connect(null);notices.length=0;
  await Promise.all([a.save(twoJobs('lead A','')),b.save(twoJobs('','lead B'))]);
  const saved=(await (await fetch(s.base+'/api/state')).json()).data;
  assert.deepEqual(saved.jobs.map(j=>j.comment),['lead A','lead B']);
  assert.deepEqual(notices,[['merged',0]]);
 }finally{await s.close();}
});

test('work done while a PC is offline is merged and saved when it reconnects',async()=>{
 const s=await start();
 try{
  const net=flaky(),timers=manualTimers(),statuses=[];
  const a=createSync({fetch,base:s.base});
  const b=createSync({fetch:net,base:s.base,timers,onStatus:x=>statuses.push(x)});
  await a.connect(twoJobs('',''));await b.connect(null);
  net.down=true;
  await b.save(twoJobs('','offline 1'));await b.save({...twoJobs('','offline 2'),jobs:[...twoJobs('','offline 2').jobs,job('c',{comment:'new offline'})]});
  assert.equal(statuses.at(-1),'offline');assert.equal(b.unsaved,true);
  await a.save(twoJobs('online edit',''));
  net.down=false;await timers.pending.at(-1)();
  const saved=(await (await fetch(s.base+'/api/state')).json()).data;
  assert.deepEqual(saved.jobs.map(j=>[j.id,j.comment]),[['a','online edit'],['b','offline 2'],['c','new offline']]);
  assert.equal(b.unsaved,false);assert.equal(statuses.at(-1),'saved');
 }finally{await s.close();}
});

test('a reconnecting screen with unsaved work merges the newer board instead of replacing its own',async()=>{
 const s=await start();
 try{
  const net=flaky(),seen=[];
  const a=createSync({fetch,base:s.base});
  const b=createSync({fetch:net,base:s.base,timers:manualTimers(),onRemote:(d,m)=>seen.push([m.reason,d.jobs.map(j=>j.comment)])});
  await a.connect(twoJobs('',''));await b.connect(null);
  net.down=true;await b.save(twoJobs('','offline'));
  await a.save(twoJobs('online',''));
  net.down=false;await b.refresh();
  assert.deepEqual(seen.at(-1),['merged',['online','offline']]);
  const saved=(await (await fetch(s.base+'/api/state')).json()).data;
  assert.deepEqual(saved.jobs.map(j=>j.comment),['online','offline']);
 }finally{await s.close();}
});

test('two screens seeding an empty server do not duplicate the board',async()=>{
 const s=await start();
 try{
  const a=createSync({fetch,base:s.base}),b=createSync({fetch,base:s.base});
  await Promise.all([a.connect(twoJobs('seed A','')),b.connect({version:5,jobs:[job('x')],history:[],processes:[]})]);
  const saved=(await (await fetch(s.base+'/api/state')).json()).data;
  assert.ok([['a','b'],['x']].some(ids=>JSON.stringify(ids)===JSON.stringify(saved.jobs.map(j=>j.id))),saved.jobs.map(j=>j.id).join());
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
