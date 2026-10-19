/* Shared board. When server/server.js serves the app, every screen (lead PCs, floor TVs) loads and saves one board and hears about
   changes as they happen. Opened as a file, the app stays on this device's browser storage. fetch and EventSource are injected so tests can run in Node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuestSync=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Saves send the whole board with the revision it was based on. The server refuses a save based on an older revision, and this screen
// takes the newer board instead (onRemote with reason 'conflict'), so two screens never silently overwrite each other.
function createSync({fetch,EventSource=null,base='',onRemote=()=>{},onStatus=()=>{},retryMs=5000,timers=globalThis}){
 let revision=null,connected=false,saving=false,queued=null,announced=0,retry=null,events=null;
 async function call(method,body){
  const res=await fetch(base+'/api/state',{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  let json=null;try{json=await res.json();}catch{}
  return {status:res.status,ok:res.ok,json};
 }
 async function refresh(){
  const r=await call('GET');if(!r.ok||r.json?.server!=='quest-board')throw Error('Board server unavailable.');
  if(r.json.revision!==revision){revision=r.json.revision;if(r.json.data)onRemote(r.json.data,{reason:'update'});}
  onStatus('saved');return r.json;
 }
 // Resolves false when nothing answers as a board server, so the caller keeps device storage.
 async function connect(local){
  let body;try{const r=await call('GET');if(!r.ok||r.json?.server!=='quest-board')return false;body=r.json;}catch{return false;}
  connected=true;revision=body.revision;
  // The first screen on a new server seeds it with this device's board.
  if(body.data)onRemote(body.data,{reason:'load'});else await save(local);
  if(EventSource){
   events=new EventSource(base+'/api/events');
   events.addEventListener('revision',e=>{let n;try{n=JSON.parse(e.data).revision;}catch{return;}announced=Math.max(announced,n);if(!saving&&n!==revision)refresh().catch(()=>onStatus('offline'));});
   events.onerror=()=>onStatus('offline');
   events.onopen=()=>{if(!saving)refresh().catch(()=>onStatus('offline'));};
  }
  if(!saving)onStatus('saved');
  return true;
 }
 async function save(data){
  if(!connected)return;
  if(saving){queued=data;return;}
  saving=true;timers.clearTimeout(retry);onStatus('saving');
  try{
   const r=await call('PUT',{baseRevision:revision,data});
   if(r.status===409&&r.json){revision=r.json.revision;queued=null;onRemote(r.json.data,{reason:'conflict'});}
   else if(r.ok&&Number.isInteger(r.json?.revision))revision=r.json.revision;
   else throw Error(r.json?.error||`Save failed (${r.status}).`);
  }catch(err){
   // Keep the newest unsaved board and try again; the device copy is already saved.
   saving=false;queued=queued||data;onStatus('offline',err);
   retry=timers.setTimeout(()=>{const next=queued;queued=null;return save(next);},retryMs);
   return;
  }
  saving=false;
  if(queued){const next=queued;queued=null;await save(next);return;}
  if(announced>revision){await refresh().catch(()=>onStatus('offline'));return;}
  onStatus('saved');
 }
 return {connect,save,refresh,close(){events?.close();timers.clearTimeout(retry);},get connected(){return connected;},get revision(){return revision;}};
}
return {createSync};
});
