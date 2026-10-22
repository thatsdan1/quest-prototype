/* Shared board. When server/server.js serves the app, every screen (lead PCs, floor TVs) loads and saves one board and hears about
   changes as they happen. Opened as a file, the app stays on this device's browser storage. fetch and EventSource are injected so tests can run in Node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuestSync=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Key order never counts as a change.
const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(key=>[key,x[key]])):x);
const same=(a,b)=>canon(a)===canon(b);
const isPlain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const isRecords=v=>Array.isArray(v)&&v.length>0&&v.every(x=>isPlain(x)&&typeof x.id==='string');

// Three-way merge of two boards that both started from `base`. Lists of records with an id (jobs, history, processes, time off the
// unit) merge record by record and records merge field by field, so two leads changing different jobs, or different fields of one
// job, both keep their change. Where both changed the same field, this screen's value wins (it is the newer edit) and clash.count
// says how often that happened.
function mergeBoards(base,local,remote,clash={count:0}){
 if(same(local,remote))return local;
 if(same(local,base))return remote;
 if(same(remote,base))return local;
 if((isRecords(local)||isRecords(remote))&&[base,local,remote].every(v=>v==null||Array.isArray(v)))return mergeRecords(base||[],local||[],remote||[],clash);
 if(isPlain(local)&&isPlain(remote)){
  const out={};
  for(const key of new Set([...Object.keys(remote),...Object.keys(local)])){const v=mergeBoards(isPlain(base)?base[key]:undefined,local[key],remote[key],clash);if(v!==undefined)out[key]=v;}
  return out;
 }
 clash.count++;return local;
}
function mergeRecords(base,local,remote,clash){
 const index=list=>new Map(list.map(x=>[x.id,x])),b=index(base),l=index(local),r=index(remote);
 // The other screen's order, with this screen's new records where it put them: in front (history is newest first) or at the end.
 const lead=[];for(const x of local){if(b.has(x.id)||r.has(x.id))break;lead.push(x);}
 const tail=local.filter(x=>!r.has(x.id)&&!lead.includes(x)),out=[];
 for(const {id} of [...lead,...remote,...tail]){const v=mergeBoards(b.get(id),l.get(id),r.get(id),clash);if(v!==undefined)out.push(v);}
 return out;
}

// Saves send the whole board with the revision it was based on. The server refuses a save based on an older revision and returns the
// newer board; this screen merges its unsaved changes into that board and saves the result, so a lead who saved at the same moment,
// or worked through a dropped connection, loses nothing.
function createSync({fetch,EventSource=null,base='',onRemote=()=>{},onStatus=()=>{},retryMs=5000,timers=globalThis}){
 // board: the server's copy at `revision`, the common starting point for a merge. pending: this screen's newest board the server
 // has not taken yet; edits counts the saves asked for, so a save that finishes after newer edits keeps them pending.
 let revision=null,board=null,pending=null,edits=0,connected=false,saving=false,announced=0,retry=null,events=null;
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 async function call(method,body){
  const res=await fetch(base+'/api/state',{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  let json=null;try{json=await res.json();}catch{}
  return {status:res.status,ok:res.ok,json};
 }
 // A newer board from the server. With nothing unsaved here, show it; otherwise merge this screen's changes into it.
 // Two screens seeding a new server share no starting point, so the one that saved second takes the first one's board.
 function receive(remote,reason){
  const theirs=remote.data;revision=remote.revision;
  if(!pending||board==null){const seeding=!!pending;pending=null;board=theirs;if(theirs)onRemote(theirs,{reason:seeding?'load':reason});return;}
  const clash={count:0},merged=mergeBoards(board,copy(pending),theirs,clash);board=theirs;
  if(same(merged,theirs)){pending=null;onRemote(theirs,{reason:'update'});return;}
  pending=merged;edits++;onRemote(merged,{reason:'merged',clashes:clash.count});
 }
 async function refresh(){
  const r=await call('GET');if(!r.ok||r.json?.server!=='quest-board')throw Error('Board server unavailable.');
  if(r.json.revision!==revision)receive(r.json,'update');
  if(pending)await flush();else onStatus('saved');
  return r.json;
 }
 // Resolves false when nothing answers as a board server, so the caller keeps device storage.
 async function connect(local){
  let body;try{const r=await call('GET');if(!r.ok||r.json?.server!=='quest-board')return false;body=r.json;}catch{return false;}
  connected=true;revision=body.revision;board=body.data;
  // The first screen on a new server seeds it with this device's board.
  if(body.data)onRemote(body.data,{reason:'load'});else await save(local);
  if(EventSource){
   events=new EventSource(base+'/api/events');
   events.addEventListener('revision',e=>{let n;try{n=JSON.parse(e.data).revision;}catch{return;}announced=Math.max(announced,n);if(!saving&&n!==revision)refresh().catch(()=>onStatus('offline'));});
   events.onerror=()=>onStatus('offline');
   events.onopen=()=>{if(!saving)refresh().catch(()=>onStatus('offline'));};
  }
  if(!saving&&!pending)onStatus('saved');
  return true;
 }
 function save(data){
  if(!connected)return Promise.resolve();
  pending=data;edits++;return flush();
 }
 async function flush(){
  if(saving)return;
  saving=true;timers.clearTimeout(retry);
  try{
   while(pending){
    onStatus('saving');
    const sent=copy(pending),asked=edits;let r;
    try{r=await call('PUT',{baseRevision:revision,data:sent});}catch(err){return offline(err);}
    if(r.status===409&&r.json?.data){receive(r.json,'conflict');continue;}
    if(!r.ok||!Number.isInteger(r.json?.revision))return offline(Error(r.json?.error||`Save failed (${r.status}).`));
    revision=r.json.revision;board=sent;
    if(edits===asked)pending=null;
   }
  }finally{saving=false;}
  if(announced>revision){await refresh().catch(()=>onStatus('offline'));return;}
  onStatus('saved');
 }
 // Keep the unsaved board and try again; the device copy is already saved.
 function offline(err){onStatus('offline',err);timers.clearTimeout(retry);retry=timers.setTimeout(()=>flush(),retryMs);}
 return {connect,save,refresh,close(){events?.close();timers.clearTimeout(retry);},get connected(){return connected;},get revision(){return revision;},get unsaved(){return !!pending;}};
}
return {createSync,mergeBoards};
});
