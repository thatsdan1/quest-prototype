/* Assignment identity and assembly rollups, independent of the interface. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuestProduction=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const cells=Array.from({length:36},(_,i)=>`Cell ${String(i+1).padStart(2,'0')}`);
// Workbook columns run third, first, second within each production day.
const shifts=['3','1','2'];
const bands=['purple','green','yellow','red'];
const unitKey=j=>j.unitId||JSON.stringify([j.processId,j.job.trim().toLowerCase()]);
function changeRemoved(records,ids,removedAt,batchId){return records.map(j=>ids.includes(j.id)?{...j,deletedAt:removedAt,deleteBatch:removedAt?batchId:null}:j);}
const compare=(a,b)=>a.date.localeCompare(b.date)||shifts.indexOf(a.shift)-shifts.indexOf(b.shift)||(a.updatedAt||'').localeCompare(b.updatedAt||'');
function latestUnits(records,throughDate){const units=new Map();for(const j of records){if(throughDate&&j.date>throughDate)continue;const key=unitKey(j),old=units.get(key);if(!old||compare(j,old)>0)units.set(key,j);}return [...units.values()];}
function overtimeMinutes(hours){const n=Number(hours);if(hours===''||!Number.isFinite(n)||n<0||n>12)throw Error('Enter additional hours between 0 and 12.');return Math.round(n*60*1000000)/1000000;}
function nextShift(previous){const index=shifts.indexOf(previous.shift);if(index<0)throw Error('Unknown shift.');const d=new Date(`${previous.date}T12:00:00`);if(index===shifts.length-1)d.setDate(d.getDate()+1);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {...previous,id:null,date,shift:shifts[(index+1)%shifts.length],actualMinutes:null,delayMinutes:null,delayReason:'',allocationExplicit:false,deletedAt:null,deleteBatch:null,operators:'',start:previous.end,end:previous.end,closed:false,training:false,status:'on-track',overtimeMinutes:0,comment:'',previousAssignmentId:previous.id,stepMinutes:[...previous.stepMinutes]};}
// A route pasted from a spreadsheet: one step per line, "name<TAB>minutes" (extra columns ignored) or "name, minutes". Names may contain commas; a first line without minutes is a header.
function parseRoute(text){const names=[],minutes=[];let first=true;String(text??'').split(/\r?\n/).forEach((line,i)=>{if(!line.trim())return;const header=first;first=false;const cut=line.lastIndexOf(','),parts=line.includes('\t')?line.split('\t'):cut<0?[line]:[line.slice(0,cut),line.slice(cut+1)],name=parts[0].trim().replace(/^"(.*)"$/,'$1').replace(/""/g,'"'),match=/^(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes)?$/i.exec((parts[1]??'').trim());if(!match){if(header)return;throw Error(`Line ${i+1}: put the minutes after the step name, e.g. "Peel skin, 60".`);}if(!name||name.length>120)throw Error(`Line ${i+1}: step names need 1 to 120 characters.`);names.push(name);minutes.push(Number(match[1]));});if(!names.length)throw Error('Paste at least one step.');if(names.length>999)throw Error('Routes are limited to 999 steps.');if(!minutes.some(n=>n>0))throw Error('At least one step needs time.');return {names,minutes};}
// Station alerts for one production day, from the latest assignment of each unit in each cell that day: reported blocked or at risk, or process
// efficiency (1 − waiting ÷ total hours, from efficiency(j)) below the warning line. A run of behind assignments at one station escalates to critical.
// Whether the operator met the goal is a person question and stays on the person views.
function stationAlerts(records,{date,efficiency,warnBelow=0.9,criticalBelow=0.75,repeatAt=2,acknowledged={}}){
 const active=records.filter(j=>!j.deletedAt),latest=new Map();
 for(const j of active)if(j.date===date){const slot=JSON.stringify([j.cell,unitKey(j)]),old=latest.get(slot);if(!old||compare(j,old)>0)latest.set(slot,j);}
 const below=(j,line)=>{const e=efficiency(j);return e!=null&&e<line-1e-9;},behind=j=>j.status==='blocked'||below(j,warnBelow);
 return [...latest.values()].flatMap(j=>{
  const reasons=[];
  if(j.status==='blocked')reasons.push('blocked');else if(j.status==='at-risk'&&!j.closed)reasons.push('at-risk');
  if(below(j,warnBelow))reasons.push('process');
  if(!reasons.length)return [];
  let streak=0;for(const r of active.filter(r=>r.cell===j.cell&&compare(r,j)<=0).sort(compare).reverse()){if(!behind(r))break;streak++;}
  const key=`${j.id}|${j.updatedAt||''}`,critical=j.status==='blocked'||below(j,criticalBelow)||streak>=repeatAt;
  return [{key,cell:j.cell,job:j,level:critical?'critical':'warning',reasons,processEfficiency:efficiency(j),streak,acknowledged:!!acknowledged[key]}];
 }).sort((a,b)=>a.acknowledged-b.acknowledged||(a.level==='critical'?0:1)-(b.level==='critical'?0:1)||b.streak-a.streak||(a.processEfficiency??1)-(b.processEfficiency??1)||a.cell.localeCompare(b.cell));
}
// Per-operator counts of rated shifts. A shared shift counts once for each named operator.
function operatorSummary(rows){const people=new Map();for(const row of rows){if(!bands.includes(row.rating))continue;for(const raw of String(row.operators||'').split(/\s*(?:,|;|&|\/|\band\b)\s*/i)){const name=raw.trim().replace(/\s+/g,' ');if(!name)continue;const key=name.toLowerCase(),p=people.get(key)||{name,shifts:0,purple:0,green:0,yellow:0,red:0,earnedMinutes:0,budgetMinutes:0};p.shifts++;p[row.rating]++;p.earnedMinutes+=row.earnedMinutes||0;p.budgetMinutes+=row.budgetMinutes||0;people.set(key,p);}}return [...people.values()];}
return {cells,shifts,bands,unitKey,compare,latestUnits,overtimeMinutes,nextShift,parseRoute,operatorSummary,changeRemoved,stationAlerts};
});
