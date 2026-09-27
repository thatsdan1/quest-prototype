/* Device-local adapter for the prototype. Replace behind this boundary after IT approval. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuestStorage=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function createAdapter(storage,key){return {load(){try{const data=storage.getItem(key);return data?JSON.parse(data):null;}catch{return null;}},save(data){try{storage.setItem(key,JSON.stringify(data));return {saved:true};}catch{return {saved:false};}}};}
function historySnapshot(job,previous,kind,at,id){return {id,at,date:job.date,shift:job.shift,cell:job.cell,operators:job.operators,job:job.job,part:job.part,processId:job.processId,from:previous?.end??job.start,start:job.start,to:job.end,goal:job.goal,total:job.total,gap:job.end-job.goal,status:job.status,closed:job.closed,productiveMinutes:job.productiveMinutes,overtimeMinutes:job.overtimeMinutes,configRevision:job.configRevision,stepMinutes:[...job.stepMinutes],rateMultiplier:job.rateMultiplier,comment:job.comment,kind};}
return {createAdapter,historySnapshot};
});
