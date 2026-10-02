const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../dist/engine.js');
const {calculateGoal,summarize}=engine;
const {createAdapter,historySnapshot,csvCell}=require('../dist/storage.js');
const production=require('../dist/production.js');
test('decimal overtime hours convert to minutes with validation',()=>{assert.equal(production.overtimeMinutes('1.5'),90);assert.equal(production.overtimeMinutes('0.25'),15);assert.equal(production.overtimeMinutes(0),0);for(const bad of ['',-1,13,'bad',Infinity])assert.throws(()=>production.overtimeMinutes(bad));});
test('handoff preserves the old operator and creates a separate next-shift draft',()=>{const old={id:'a',job:'DEMO',processId:'hand-layup',date:'2026-12-31',shift:'2',operators:'First Operator',start:1,end:4,closed:true,overtimeMinutes:60,stepMinutes:[10,20]};const draft=production.nextShift(old);assert.equal(draft.date,'2027-01-01');assert.equal(draft.shift,'3');assert.equal(draft.start,4);assert.equal(draft.end,4);assert.equal(draft.operators,'');assert.equal(draft.previousAssignmentId,'a');assert.equal(draft.closed,false);assert.equal(draft.overtimeMinutes,0);draft.stepMinutes[0]=100;assert.equal(old.stepMinutes[0],10);assert.equal(old.operators,'First Operator');assert.equal(production.nextShift({...old,shift:'3'}).shift,'1');assert.equal(production.nextShift({...old,shift:'1'}).shift,'2');});
test('assembly rollup uses latest production shift, once per job, without future leakage',()=>{const base={job:'Demo',processId:'a',date:'2026-09-28',cell:'Cell 01',shift:'3',end:1,updatedAt:'2026-10-01'};const records=[base,{...base,shift:'1',end:2,updatedAt:'2026-09-28'},{...base,shift:'2',end:3,cell:'Cell 02'},{...base,date:'2026-09-29',end:4},{...base,job:'DEMO',processId:'b',end:5}];const results=production.latestUnits(records,'2026-09-28');assert.equal(results.length,2);assert.equal(results.find(j=>j.processId==='a').end,3);assert.equal(results.find(j=>j.processId==='a').cell,'Cell 02');assert.equal(production.latestUnits(records,'2026-09-27').length,0);assert.equal(production.latestUnits(records).find(j=>j.processId==='a').end,4);});
test('history snapshots retain assignment and handoff identity',()=>{const h=historySnapshot({id:'b',previousAssignmentId:'a',hand:'LH',start:2,end:3,goal:4,stepMinutes:[10]},null,'Shift handoff','now','event');assert.equal(h.assignmentId,'b');assert.equal(h.previousAssignmentId,'a');assert.equal(h.hand,'LH');});
test('goal consumes ordered whole steps, including an exact time boundary',()=>{assert.equal(calculateGoal({start:1,stepMinutes:[10,20,30,40],productiveMinutes:50}).goal,3);assert.equal(calculateGoal({start:1,stepMinutes:[10,20,30,40],productiveMinutes:49}).goal,2);});
test('overtime increases the budget without exceeding the final step',()=>{assert.equal(calculateGoal({start:1,stepMinutes:[10,20,30,40],productiveMinutes:30,overtimeMinutes:20}).goal,3);assert.equal(calculateGoal({start:1,stepMinutes:[10,20],productiveMinutes:999,overtimeMinutes:60}).goal,2);});
test('no time, long next step, and already completed sequences are explicit',()=>{assert.equal(calculateGoal({start:0,stepMinutes:[90,10],productiveMinutes:0}).goal,0);assert.equal(calculateGoal({start:0,stepMinutes:[90,10],productiveMinutes:80}).goal,0);assert.equal(calculateGoal({start:2,stepMinutes:[10,20],productiveMinutes:60}).goal,2);});
test('rate is a documented duration divisor, and invalid input is rejected',()=>{assert.equal(calculateGoal({start:0,stepMinutes:[60,60],productiveMinutes:60,rateMultiplier:2}).goal,2);for(const change of [{start:-1},{start:0.5},{productiveMinutes:-2},{overtimeMinutes:-1},{stepMinutes:[0]},{stepMinutes:[NaN]},{rateMultiplier:0}])assert.throws(()=>calculateGoal({start:0,stepMinutes:[60],productiveMinutes:60,...change}));});
test('goal attainment and unit completion are separate; no planned gain gives no rate',()=>{assert.deepEqual(summarize({start:2,end:6,goal:6,total:10}),{gap:0,completion:60,targetCompletion:60,goalMet:true,unitComplete:false,attainment:100});assert.equal(summarize({start:2,end:2,goal:2,total:10}).attainment,null);assert.equal(summarize({start:2,end:10,goal:6,total:10}).unitComplete,true);assert.throws(()=>summarize({start:4,end:2,goal:6,total:10}));});
test('history is a timing snapshot rather than a reference to mutable settings',()=>{const j={start:1,end:2,goal:3,total:4,stepMinutes:[10,20,30,40],overtimeMinutes:15,operators:'Example',rateMultiplier:1};const h=historySnapshot(j,{end:1},'Job updated','2026-09-26','event');j.stepMinutes[0]=999;assert.equal(h.stepMinutes[0],10);assert.equal(h.gap,-1);assert.equal(h.overtimeMinutes,15);assert.equal(h.operators,'Example');});
test('storage round-trips and reports unavailable or corrupt storage safely',()=>{const data=new Map();const a=createAdapter({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},'demo');assert.equal(a.load(),null);assert.equal(a.save({x:1}).saved,true);assert.deepEqual(a.load(),{x:1});data.set('demo','broken');assert.equal(a.load(),null);const b=createAdapter({getItem(){throw Error()},setItem(){throw Error()}},'x');assert.equal(b.load(),null);assert.equal(b.save({}).saved,false);});
test('nearest-step goals follow the workbook lookup: closest cumulative time, earliest on ties, may round up',()=>{assert.equal(calculateGoal({start:0,stepMinutes:[240,240,240],productiveMinutes:360,rule:'nearest'}).goal,1);assert.equal(calculateGoal({start:0,stepMinutes:[300,300],productiveMinutes:480,rule:'nearest'}).goal,2);assert.equal(calculateGoal({start:0,stepMinutes:[300,300],productiveMinutes:480}).goal,1);assert.equal(calculateGoal({start:1,stepMinutes:[60,60,0,60],productiveMinutes:60,rule:'nearest'}).goal,2);assert.equal(calculateGoal({start:0,stepMinutes:[600],productiveMinutes:60,rule:'nearest'}).goal,0);assert.throws(()=>calculateGoal({start:0,stepMinutes:[60],productiveMinutes:60,rule:'other'}));});
test('zero-minute checkpoint steps are allowed, but a route needs some time',()=>{assert.equal(calculateGoal({start:0,stepMinutes:[30,0,30],productiveMinutes:30}).goal,2);assert.throws(()=>calculateGoal({start:0,stepMinutes:[0,0],productiveMinutes:30}));});
test('shift colours reproduce the workbook bands on an 8 h shift and move up with overtime',()=>{const rate=h=>engine.rateShift({earnedMinutes:h*60,budgetMinutes:480});assert.deepEqual([6.4,6.5,7.49,7.5,8.04,8.05,9].map(rate),['red','yellow','yellow','green','green','purple','purple']);assert.equal(engine.rateShift({earnedMinutes:480,budgetMinutes:540}),'yellow');assert.equal(engine.rateShift({earnedMinutes:480,budgetMinutes:0}),null);engine.validateRating(engine.DEFAULT_RATING);assert.throws(()=>engine.validateRating({purpleAbove:0.05,greenWithin:2,yellowWithin:1}));});
test('progress earns standard minutes from start to stop; completion is 100% only at the final step',()=>{const p=engine.progress({start:1,end:3,stepMinutes:[60,30,30,0]});assert.equal(p.earnedMinutes,60);assert.equal(p.completion,99);assert.equal(engine.progress({start:1,end:4,stepMinutes:[60,30,30,0]}).completion,100);assert.equal(engine.progress({start:0,end:1,stepMinutes:[30,90]}).completion,25);assert.equal(engine.progress({start:0,end:1,stepMinutes:[30,90],rateMultiplier:2}).earnedMinutes,15);assert.throws(()=>engine.progress({start:2,end:1,stepMinutes:[30,30]}));});
test('pasted routes keep commas in names, accept spreadsheet tabs, and explain bad lines',()=>{const r=production.parseRoute('Step name, minutes\nGrab kit, sign in, 30\n"Peel, prep",45 min\n\nCheckpoint\t0\nLay ply\t60\t0.04\t2.25');assert.deepEqual(r.names,['Grab kit, sign in','Peel, prep','Checkpoint','Lay ply']);assert.deepEqual(r.minutes,[30,45,0,60]);assert.throws(()=>production.parseRoute('Name, minutes\nPeel skin'),/Line 2/);assert.throws(()=>production.parseRoute('Checkpoint, 0'),/needs time/);assert.throws(()=>production.parseRoute(''),/at least one/);});
test('operator summaries split shared shifts and count each colour band',()=>{const s=production.operatorSummary([{operators:'Alex Morgan, Sam Chen',rating:'purple',earnedMinutes:490,budgetMinutes:480},{operators:'alex  morgan',rating:'red',earnedMinutes:300,budgetMinutes:480},{operators:'Sam Chen',rating:'unknown',earnedMinutes:99}]);const alex=s.find(p=>p.name==='Alex Morgan');assert.equal(s.length,2);assert.equal(alex.shifts,2);assert.equal(alex.purple,1);assert.equal(alex.red,1);assert.equal(alex.earnedMinutes,790);assert.equal(alex.budgetMinutes,960);assert.equal(s.find(p=>p.name==='Sam Chen').shifts,1);});
test('a handoff never inherits the previous shift training flag',()=>{assert.equal(production.nextShift({id:'a',date:'2026-09-29',shift:'1',end:3,training:true,stepMinutes:[10]}).training,false);});
test('history snapshots carry step names, colour, and training for export',()=>{const h=historySnapshot({id:'b',start:1,end:2,goal:3,total:4,stepMinutes:[10,20,30,40],goalRule:'nearest'},null,'Job added','now','event',{stopName:'2 · Peel',rating:'green'});assert.equal(h.stopName,'2 · Peel');assert.equal(h.rating,'green');assert.equal(h.training,false);assert.equal(h.goalRule,'nearest');});
test('CSV cells keep numbers numeric and neutralise spreadsheet formulas',()=>{assert.equal(csvCell(-1),'-1');assert.equal(csvCell(7.5),'7.5');assert.equal(csvCell(NaN),'');assert.equal(csvCell('=SUM(A1)'),'"\'=SUM(A1)"');assert.equal(csvCell('-2 steps'),'"\'-2 steps"');assert.equal(csvCell('say "hi"'),'"say ""hi"""');assert.equal(csvCell(null),'""');});
const tracking=require('../dist/tracking.js');
const day='2026-10-01',ops={requiredMinutes:480};
test('split-shift planning gives a second unit the day minus the first unit, with a prorated goal',()=>{
 const first={id:'a',operators:'Daniel',date:day,shift:'1',productiveMinutes:180,overtimeMinutes:0};
 const open=tracking.availability([first],{operators:'daniel',date:day,operations:{requiredMinutes:390}}).openMinutes;
 assert.equal(open,210);
 assert.equal(calculateGoal({start:0,stepMinutes:Array(20).fill(30),productiveMinutes:open}).goal,7);
});
test('a person\'s day spans shifts and cells, grows with additional hours, and ignores other days, removed records and the assignment being edited',()=>{
 const base={id:'a',operators:'Daniel',date:day,shift:'1',cell:'Cell 01',productiveMinutes:180,overtimeMinutes:30};
 const rows=[base,{...base,id:'other-shift',shift:'2',cell:'Cell 02'},{...base,id:'other-day',date:'2026-10-02'},{...base,id:'removed',deletedAt:'now'}];
 assert.equal(tracking.availability(rows,{operators:'Daniel',date:day,operations:ops}).openMinutes,120);
 assert.equal(tracking.availability(rows,{operators:'Daniel',date:day,excludeId:'a',operations:ops}).openMinutes,300);
 assert.equal(tracking.standardMinutes(undefined),480);
});
test('two names share one plan: availability is the least time left, never the sum',()=>{
 const rows=[{id:'a',operators:'Daniel, DANIEL',date:day,productiveMinutes:180},{id:'b',operators:'Kai',date:day,productiveMinutes:240}];
 assert.equal(tracking.availability(rows,{operators:'Daniel & Kai',date:day,operations:ops}).openMinutes,240);
 assert.deepEqual(tracking.names('Daniel, DANIEL & Kai'),['Daniel','Kai']);
});
test('8 h + 4 h additional − 2.5 h waiting leaves 9.5 h to build, and the goal is set from that',()=>{
 const job={id:'a',operators:'Jules',date:day,productiveMinutes:480,overtimeMinutes:240,delayMinutes:150,delayReason:'Tooling / fixture'};
 assert.deepEqual(tracking.hours(job),{workedMinutes:720,waitMinutes:150,buildMinutes:570,overtimeMinutes:240});
 assert.equal(calculateGoal({start:0,stepMinutes:Array(40).fill(30),productiveMinutes:tracking.hours(job).buildMinutes}).goal,19);
 assert.equal(tracking.hours({...job,delayMinutes:900}).buildMinutes,0);
});
test('waiting counts toward the person\'s day but not toward building',()=>{
 const job={id:'a',operators:'Jules',date:day,productiveMinutes:480,overtimeMinutes:240,delayMinutes:150};
 const l=tracking.ledger([job],{name:'Jules',date:day,operations:ops});
 assert.equal(l.requiredMinutes,720);assert.equal(l.bookedMinutes,720);assert.equal(l.waitMinutes,150);assert.equal(l.buildMinutes,570);assert.equal(l.openMinutes,0);assert.equal(l.overMinutes,0);
});
test('waiting needs a reason and cannot exceed the hours worked on the unit',()=>{
 const job={productiveMinutes:480,overtimeMinutes:0};
 assert.equal(tracking.validateHours({...job,delayMinutes:0}),'');
 assert.match(tracking.validateHours({...job,delayMinutes:60}),/waiting for/);
 assert.match(tracking.validateHours({...job,delayMinutes:600,delayReason:'Material'}),/more than the 8 h/);
 assert.equal(tracking.validateHours({...job,delayMinutes:150,delayReason:'Material'}),'');
});
test('the worker view books each person\'s day; a trainer\'s floor time is off-unit training, not a second plan',()=>{
 const rows=[{id:'a',unitId:'u1',operators:'Kai',date:day,cell:'Cell 01',productiveMinutes:480,delayMinutes:30},{id:'b',unitId:'u2',operators:'Lee',date:day,cell:'Cell 02',productiveMinutes:360}];
 const offUnit=[{id:'o',date:day,name:'Robin',minutes:480,reason:'Training on the floor'}];
 const people=Object.fromEntries(tracking.workers(rows,{dates:[day],operations:ops,offUnit}).map(p=>[p.name,p]));
 assert.equal(people.Robin.offUnitMinutes,480);assert.equal(people.Robin.unbookedMinutes,0);assert.equal(people.Robin.units,0);
 assert.equal(people.Kai.buildMinutes,450);assert.equal(people.Kai.waitMinutes,30);assert.equal(people.Kai.unbookedMinutes,0);
 assert.equal(people.Lee.unbookedMinutes,120);
});
test('the unit view counts each assignment once and compares hours to build with time-study hours earned',()=>{
 const rows=[{id:'a',unitId:'u',job:'A',operators:'Kai, Robin',closed:true,end:3,goal:5,productiveMinutes:480,delayMinutes:60,delayReason:'Tooling / fixture',earned:300},{id:'b',unitId:'u',job:'A',operators:'Lee',closed:true,end:6,goal:6,productiveMinutes:240,earned:240}];
 const [u]=tracking.unitFlow(rows,j=>j.earned);
 assert.equal(u.standardMinutes,540);assert.equal(u.buildMinutes,660);assert.equal(u.overMinutes,120);assert.equal(u.waitMinutes,60);
 assert.deepEqual(u.reasons,[['Tooling / fixture',60]]);assert.equal(u.belowGoal,1);assert.equal(u.lostMinutes,180);assert.equal(u.latest.id,'b');assert.equal(u.people.length,3);
});
test('the waiting Pareto marks the reasons that reach 80% as the vital few',()=>{
 const job=(id,reason,minutes)=>({id,job:id,processId:'p',delayReason:reason,delayMinutes:minutes});
 const d=tracking.delaySummary([job('a','Tooling / fixture',60),job('b','Waiting for forklift / material handling',30),job('c','Material',10),{id:'d',delayMinutes:0},{id:'e',delayMinutes:null}]);
 assert.equal(d.total,100);assert.equal(d.known,4);
 assert.deepEqual(d.rows.map(r=>[r.reason,r.vital]),[['Tooling / fixture',true],['Waiting for forklift / material handling',true],['Material',false]]);
 assert.equal(d.rows[1].cumulative,90);
});
test('handoffs start with no waiting, and history keeps additional hours and waiting',()=>{
 const job={id:'a',date:day,shift:'1',end:2,start:0,stepMinutes:[30,60],overtimeMinutes:120,delayMinutes:45,delayReason:'Material'};
 const draft=production.nextShift(job);assert.equal(draft.delayMinutes,null);assert.equal(draft.overtimeMinutes,0);assert.equal(draft.delayReason,'');
 const snapshot=historySnapshot(job,null,'update','now','e');assert.equal(snapshot.overtimeMinutes,120);assert.equal(snapshot.delayMinutes,45);assert.equal(snapshot.delayReason,'Material');
});
test('removal and restoration preserve immutable records and unit identity across renaming',()=>{
 const rows=[{id:'a',unitId:'unit-1',job:'Old',operators:'Daniel'},{id:'b',unitId:'unit-1',job:'Corrected',operators:'Kai'}];
 const removed=production.changeRemoved(rows,['a','b'],'now','batch');
 assert.equal(rows[0].deletedAt,undefined);assert.equal(removed[0].deleteBatch,'batch');
 const restored=production.changeRemoved(removed,['a','b'],null,null);
 assert.equal(restored[1].deletedAt,null);assert.equal(restored[0].operators,'Daniel');
 assert.equal(production.unitKey(restored[0]),production.unitKey(restored[1]));
});
test('new-shift drafts clear actual and delay hours while snapshots preserve zero versus unknown',()=>{
 const job={id:'a',unitId:'u',date:'2026-10-01',shift:'1',end:2,start:0,stepMinutes:[30,60],actualMinutes:120,delayMinutes:0,delayReason:'',allocationExplicit:true,shiftCapacityMinutes:390};
 const draft=production.nextShift(job);assert.equal(draft.actualMinutes,null);assert.equal(draft.delayMinutes,null);assert.equal(draft.allocationExplicit,false);assert.equal(draft.unitId,'u');
 const snapshot=historySnapshot(job,null,'update','now','e');assert.equal(snapshot.actualMinutes,120);assert.equal(snapshot.delayMinutes,0);assert.equal(snapshot.shiftCapacityMinutes,390);assert.equal(snapshot.unitId,'u');
 assert.equal(historySnapshot({...job,actualMinutes:undefined},null,'update','now','e').actualMinutes,null);
});
test('training-center time fills the day without touching a unit, and cannot overfill it',()=>{
 const job={id:'a',operators:'Kai',date:day,productiveMinutes:360},offUnit=[{id:'o1',date:day,name:'kai',minutes:120,reason:'Training center'}];
 const l=tracking.ledger([job],{name:'Kai',date:day,operations:ops,offUnit});
 assert.equal(l.offUnitMinutes,120);assert.equal(l.bookedMinutes,480);assert.equal(l.openMinutes,0);
 assert.equal(tracking.validateOffUnit({...offUnit[0]},[job],ops,offUnit),'');
 assert.match(tracking.validateOffUnit({id:'o2',date:day,name:'Kai',minutes:60,reason:'Training center'},[job],ops,offUnit),/8 h day/);
 assert.match(tracking.validateOffUnit({id:'o3',date:day,name:'Kai',minutes:60,reason:'Lunch'},[job],ops,offUnit),/what the time was for/);
});
test('person-days list additional-hour days with hours building and the standard hours earned',()=>{
 const rows=[{id:'a',operators:'Jules',date:day,productiveMinutes:480,overtimeMinutes:240,delayMinutes:150,earned:540},{id:'b',operators:'Kai',date:day,productiveMinutes:480,earned:450}];
 const days=tracking.personDays(rows,{dates:[day],operations:ops,earned:j=>j.earned}),jules=days.find(d=>d.name==='Jules');
 assert.equal(days.filter(d=>d.overtimeMinutes>0).length,1);assert.equal(jules.dayMinutes,720);assert.equal(jules.buildMinutes,570);assert.equal(jules.earnedMinutes,540);assert.equal(jules.unbookedMinutes,0);
 const week=tracking.workers([...rows,{...rows[0],id:'c',date:'2026-10-02'}],{dates:[day,'2026-10-02'],operations:ops,earned:j=>j.earned}).find(p=>p.name==='Jules');
 assert.equal(week.days,2);assert.equal(week.dayMinutes,1440);assert.equal(week.overtimeMinutes,480);
});
test('person grade and process efficiency answer different questions: 8 h done in an 11 h day with 3 h waiting',()=>{
 const job={productiveMinutes:480,overtimeMinutes:180,delayMinutes:180};
 const g=tracking.grades(job,480);
 assert.equal(g.person,1);assert.equal(Math.round(g.process*1000)/1000,0.727);
 assert.equal(tracking.grades({productiveMinutes:480,delayMinutes:480},0).person,null);
 assert.equal(tracking.grades({productiveMinutes:0},0).process,null);
 const [u]=tracking.unitFlow([{id:'a',unitId:'u',...job,earned:480}],j=>j.earned);assert.equal(Math.round(u.processEfficiency*1000)/1000,0.727);
});
const efficiency=j=>tracking.grades(j).process,alertRow=(id,cell,extra)=>({id,unitId:cell,cell,date:day,shift:'1',closed:true,status:'on-track',updatedAt:id,productiveMinutes:480,delayMinutes:0,...extra});
test('station alerts follow the process: blocked, at risk, or efficiency lost to waiting, not the operator\'s goal',()=>{
 const rows=[alertRow('a','Cell 01',{status:'blocked',closed:false}),alertRow('b','Cell 02',{status:'at-risk',closed:false}),alertRow('c','Cell 03',{delayMinutes:72}),alertRow('d','Cell 04',{delayMinutes:150}),alertRow('e','Cell 05',{delayMinutes:24}),alertRow('f','Cell 06',{end:1,goal:9}),alertRow('g','Cell 07',{delayMinutes:200,deletedAt:'now'}),{...alertRow('h','Cell 08',{delayMinutes:200}),date:'2026-09-30'}];
 const alerts=Object.fromEntries(production.stationAlerts(rows,{date:day,efficiency}).map(a=>[a.cell,a]));
 assert.deepEqual(Object.keys(alerts).sort(),['Cell 01','Cell 02','Cell 03','Cell 04']);
 assert.equal(alerts['Cell 01'].level,'critical');assert.equal(alerts['Cell 02'].level,'warning');
 assert.equal(alerts['Cell 03'].level,'warning');assert.deepEqual(alerts['Cell 03'].reasons,['process']);assert.equal(alerts['Cell 03'].processEfficiency,0.85);
 assert.equal(alerts['Cell 04'].level,'critical');
});
test('repeated process losses at one station escalate, and an acknowledgement lapses when the assignment changes',()=>{
 const row=(id,date,shift,wait)=>({...alertRow(id,'Cell 05',{delayMinutes:wait}),date,shift,unitId:'u5'});
 const rows=[row('a','2026-09-30','1',10),row('b','2026-09-30','2',60),row('c',day,'3',60),row('d',day,'1',60)];
 const [alert]=production.stationAlerts(rows,{date:day,efficiency});
 assert.equal(alert.streak,3);assert.equal(alert.level,'critical');
 assert.equal(production.stationAlerts(rows,{date:day,efficiency,repeatAt:4})[0].level,'warning');
 assert.equal(production.stationAlerts(rows,{date:day,efficiency,acknowledged:{[alert.key]:{at:'now'}}})[0].acknowledged,true);
 assert.equal(production.stationAlerts(rows.map(r=>r.id==='d'?{...r,updatedAt:'later'}:r),{date:day,efficiency,acknowledged:{[alert.key]:{at:'now'}}})[0].acknowledged,false);
});
test('a cell holding two units alerts for each unit\'s own latest assignment',()=>{
 const alerts=production.stationAlerts([{...alertRow('a','Cell 01',{delayMinutes:240}),unitId:'u1'},{...alertRow('b','Cell 01',{}),shift:'2',unitId:'u2'}],{date:day,efficiency});
 assert.deepEqual(alerts.map(a=>a.job.id),['a']);
});

