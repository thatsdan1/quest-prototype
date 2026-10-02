/* Separate worker time accounting from unit output. No browser dependencies. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QuestTracking=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DELAY_REASONS=['Material','Tooling / fixture','Waiting for forklift / material handling','Quality support','Engineering support','Rework','Other'];
const OFF_UNIT_REASONS=['Training center','Training on the floor','Other'];
// Operations sets the standard day: 8 h (40 h over 5 days). Additional hours are whatever the lead enters on a person's assignments that day; there is no approval step.
const DEFAULT_OPERATIONS=Object.freeze({requiredMinutes:480,workDays:5});
const key=name=>String(name||'').trim().replace(/\s+/g,' ').toLowerCase();
// Distinct names in entry order; the first spelling of a repeated name is kept.
const names=value=>{const seen=new Set();return String(value||'').split(/\s*(?:,|;|&|\/|\band\b)\s*/i).map(n=>n.trim().replace(/\s+/g,' ')).filter(n=>n&&!seen.has(key(n))&&seen.add(key(n)));};
const sum=(rows,field)=>rows.reduce((n,r)=>n+(r[field]??0),0);
const standardMinutes=operations=>operations?.requiredMinutes??DEFAULT_OPERATIONS.requiredMinutes;
// One assignment's time, shared by everyone named on it: regular + additional hours worked, of which waiting is not build time.
// Waiting counts toward the person's day but comes off the hours they had to build, so it never counts against them.
function hours(job){const workedMinutes=(job.productiveMinutes||0)+(job.overtimeMinutes||0),waitMinutes=Math.min(job.delayMinutes||0,workedMinutes);return {workedMinutes,waitMinutes,buildMinutes:workedMinutes-waitMinutes,overtimeMinutes:job.overtimeMinutes||0};}
// Two grades that answer different questions. Person: standard hours completed ÷ (total hours − waiting). Process: 1 − waiting ÷ total hours.
// 8 h completed in an 11 h day with 3 h waiting is a 100% person grade and a 73% process.
const ratio=(a,b)=>b>0&&Number.isFinite(a)?a/b:null;
function grades(job,earnedMinutes){const h=hours(job);return {person:ratio(earnedMinutes,h.buildMinutes),process:h.workedMinutes>0?1-h.waitMinutes/h.workedMinutes:null};}
// One person's day: the standard day plus their additional hours, against unit time and off-unit time (such as the training center).
function ledger(jobs,{name,date,excludeId,operations,offUnit=[],excludeOffUnitId}){
 const rows=jobs.filter(j=>!j.deletedAt&&j.id!==excludeId&&j.date===date&&names(j.operators).some(n=>key(n)===key(name))).map(j=>({id:j.id,job:j.job,cell:j.cell,shift:j.shift,...hours(j)}));
 const offUnitMinutes=sum(offUnit.filter(o=>o.id!==excludeOffUnitId&&o.date===date&&key(o.name)===key(name)),'minutes');
 const workedMinutes=sum(rows,'workedMinutes'),waitMinutes=sum(rows,'waitMinutes'),overtimeMinutes=sum(rows,'overtimeMinutes'),requiredMinutes=standardMinutes(operations)+overtimeMinutes,bookedMinutes=workedMinutes+offUnitMinutes;
 return {name,rows,workedMinutes,waitMinutes,buildMinutes:workedMinutes-waitMinutes,offUnitMinutes,overtimeMinutes,requiredMinutes,bookedMinutes,openMinutes:Math.max(0,requiredMinutes-bookedMinutes),overMinutes:Math.max(0,bookedMinutes-requiredMinutes)};
}
// Hours still free for a new unit. A shared assignment is limited by whoever has the least time left; names are not added together.
function availability(jobs,{operators,date,excludeId,operations,offUnit}){
 const people=names(operators).map(name=>ledger(jobs,{name,date,excludeId,operations,offUnit}));
 return {people,openMinutes:people.length?Math.min(...people.map(p=>p.openMinutes)):standardMinutes(operations)};
}
const dayText=l=>`${l.requiredMinutes/60} h${l.overtimeMinutes?` (${(l.requiredMinutes-l.overtimeMinutes)/60} h + ${l.overtimeMinutes/60} h additional)`:''}`;
function validateHours(job){
 const {workedMinutes}=hours(job),wait=job.delayMinutes;
 if(wait!=null&&(!Number.isFinite(wait)||wait<0))return 'Enter waiting hours of 0 or more.';
 if(wait>workedMinutes+1e-6)return `Waiting can't be more than the ${workedMinutes/60} h worked on this unit.`;
 if(wait>0&&!job.delayReason)return 'Choose what they were waiting for.';
 return '';
}
// Off-unit time (the training center, for example) is entered by the lead when it happens; it fills part of the person's day without touching a unit.
function validateOffUnit(entry,jobs,operations,offUnit=[]){
 if(!key(entry.name))return 'Enter a name.';
 if(!OFF_UNIT_REASONS.includes(entry.reason))return 'Choose what the time was for.';
 if(!Number.isFinite(entry.minutes)||entry.minutes<=0||entry.minutes>1440)return 'Enter hours between 0 and 24.';
 const prior=ledger(jobs,{name:entry.name,date:entry.date,operations,offUnit,excludeOffUnitId:entry.id});
 if(prior.bookedMinutes+entry.minutes>prior.requiredMinutes+1e-6)return `${entry.name}: that would be ${(prior.bookedMinutes+entry.minutes)/60} h on a ${dayText(prior)} day. Split their day so the unit has fewer hours, or add additional hours.`;
 return '';
}
// Each person's day in a date range, gathered before any rollup so days and people can both be reported.
function collectDays(jobs,{dates,offUnit=[],earned=()=>0}){
 const days=new Map();
 const day=(name,date)=>{const k=JSON.stringify([date,key(name)]);if(!days.has(k))days.set(k,{name,date,units:new Set(),cells:new Set(),assignments:0,workedMinutes:0,waitMinutes:0,offUnitMinutes:0,overtimeMinutes:0,earnedMinutes:0});return days.get(k);};
 for(const j of jobs.filter(j=>!j.deletedAt&&dates.includes(j.date))){const h=hours(j),standard=earned(j)||0;
  for(const name of names(j.operators)){const d=day(name,j.date);d.units.add(j.unitId||j.job);d.cells.add(j.cell);d.assignments++;d.workedMinutes+=h.workedMinutes;d.waitMinutes+=h.waitMinutes;d.overtimeMinutes+=h.overtimeMinutes;d.earnedMinutes+=standard;}
 }
 for(const o of offUnit.filter(o=>dates.includes(o.date)))day(o.name,o.date).offUnitMinutes+=o.minutes;
 return [...days.values()];
}
function dayFigures(d,operations,dayCount=1){const dayMinutes=standardMinutes(operations)*dayCount+d.overtimeMinutes,booked=d.workedMinutes+d.offUnitMinutes;return {units:d.units.size,cells:d.cells.size,dayMinutes,buildMinutes:d.workedMinutes-d.waitMinutes,personGrade:ratio(d.earnedMinutes,d.workedMinutes-d.waitMinutes),processEfficiency:d.workedMinutes>0?1-d.waitMinutes/d.workedMinutes:null,unbookedMinutes:Math.max(0,dayMinutes-booked),overMinutes:Math.max(0,booked-dayMinutes)};}
// Person-days, for checking additional hours: a 12 h day (8 + 4) against the standard hours earned in the hours they had to build.
function personDays(jobs,{dates,operations,offUnit,earned}){return collectDays(jobs,{dates,offUnit,earned}).map(d=>({...d,...dayFigures(d,operations)}));}
// Worker view: did each person's day get booked? Shared work stays with each person; standard hours are not split between people.
function workers(jobs,{dates,operations,offUnit,earned}){
 const people=new Map();
 for(const d of collectDays(jobs,{dates,offUnit,earned})){const k=key(d.name),p=people.get(k);
  if(!p){people.set(k,{...d,days:1});continue;}
  p.days++;for(const f of ['assignments','workedMinutes','waitMinutes','offUnitMinutes','overtimeMinutes','earnedMinutes'])p[f]+=d[f];for(const f of ['units','cells'])d[f].forEach(v=>p[f].add(v));
 }
 return [...people.values()].map(p=>{const {date,...rest}=p;return {...rest,...dayFigures(p,operations,p.days)};});
}
// Unit view: time-study hours earned against the hours the unit took to build, plus waiting by reason. Each assignment counts once,
// however many names are on it, so two people on one unit are not read as one slow build. Pass assignments in production order.
function unitFlow(jobs,earned){
 const units=new Map();
 for(const j of jobs.filter(j=>!j.deletedAt)){
  const id=j.unitId||JSON.stringify([j.processId,j.job]),u=units.get(id)||{unitId:id,assignments:0,standardMinutes:0,workedMinutes:0,buildMinutes:0,waitMinutes:0,belowGoal:0,people:new Set(),reasons:new Map()};
  const h=hours(j);u.latest=j;u.assignments++;u.standardMinutes+=earned(j)||0;u.workedMinutes+=h.workedMinutes;u.buildMinutes+=h.buildMinutes;u.waitMinutes+=h.waitMinutes;names(j.operators).forEach(n=>u.people.add(n));
  if(h.waitMinutes>0){const reason=j.delayReason||'Unspecified';u.reasons.set(reason,(u.reasons.get(reason)||0)+h.waitMinutes);}
  if(j.closed&&!j.training&&j.end<j.goal)u.belowGoal++;
  units.set(id,u);
 }
 return [...units.values()].map(u=>{const overMinutes=u.buildMinutes-u.standardMinutes;return {...u,people:[...u.people],reasons:[...u.reasons].sort((a,b)=>b[1]-a[1]),overMinutes,lostMinutes:Math.max(0,overMinutes)+u.waitMinutes,processEfficiency:u.workedMinutes>0?1-u.waitMinutes/u.workedMinutes:null};});
}
// Pareto of recorded waiting. The "vital few" are the reasons that reach 80% of the total.
function delaySummary(jobs){
 const grouped=new Map();let known=0;
 for(const j of jobs.filter(j=>!j.deletedAt)){if(j.delayMinutes!=null)known++;if(!(j.delayMinutes>0))continue;const reason=j.delayReason||'Unspecified',r=grouped.get(reason)||{reason,minutes:0,count:0,units:new Set(),jobs:[]};r.minutes+=j.delayMinutes;r.count++;r.units.add(j.unitId||JSON.stringify([j.processId,j.job]));r.jobs.push(j);grouped.set(reason,r);}
 const total=[...grouped.values()].reduce((n,r)=>n+r.minutes,0);let cumulative=0;
 return {total,known,rows:[...grouped.values()].sort((a,b)=>b.minutes-a.minutes).map(r=>{const before=cumulative;cumulative+=r.minutes;return {...r,units:r.units.size,share:total?r.minutes/total*100:0,cumulative:total?cumulative/total*100:0,vital:total>0&&before/total<0.8-1e-9};})};
}
return {DELAY_REASONS,OFF_UNIT_REASONS,DEFAULT_OPERATIONS,key,names,standardMinutes,hours,grades,ledger,availability,validateHours,validateOffUnit,personDays,workers,unitFlow,delaySummary};
});
