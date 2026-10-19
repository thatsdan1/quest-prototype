const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../dist/engine.js');
const production=require('../dist/production.js');

test('floor display defaults to 30 cells, all on one screen, colour-only results; bad values fall back',()=>{
 assert.deepEqual(production.displaySettings(),{cellCount:30,perScreen:'all',rotateSeconds:20,floorNumbers:false});
 assert.deepEqual(production.displaySettings({cellCount:'36',perScreen:6,rotateSeconds:'45',floorNumbers:true}),{cellCount:36,perScreen:'6',rotateSeconds:45,floorNumbers:true});
 assert.deepEqual(production.displaySettings({cellCount:99,perScreen:'7',rotateSeconds:13,floorNumbers:'yes'}),{cellCount:36,perScreen:'all',rotateSeconds:20,floorNumbers:false});
 assert.equal(production.displaySettings({cellCount:'x'}).cellCount,30);
 assert.equal(production.displaySettings({cellCount:0}).cellCount,1);
});

test('cells in use keep a later cell on the board while it holds a unit, in line order',()=>{
 assert.equal(production.cellsInUse(30).length,30);
 assert.equal(production.cellsInUse(30).at(-1),'Cell 30');
 const cells=production.cellsInUse(30,['Cell 33','Cell 02']);
 assert.equal(cells.length,31);
 assert.deepEqual(cells.slice(-2),['Cell 30','Cell 33']);
 assert.equal(production.cellsInUse(36).length,36);
});

test('TV screens: all cells on one screen, or pages of six as on the current display',()=>{
 const cells=production.cellsInUse(30);
 assert.equal(production.screens(cells,'all').length,1);
 assert.equal(production.screens(cells,'all')[0].length,30);
 const sixes=production.screens(cells,'6');
 assert.equal(sixes.length,5);
 assert.deepEqual(sixes[1],['Cell 07','Cell 08','Cell 09','Cell 10','Cell 11','Cell 12']);
 assert.deepEqual(production.screens(production.cellsInUse(36),'12').map(p=>p.length),[12,12,12]);
 assert.deepEqual(production.screens([],'6'),[[]]);
 assert.deepEqual(production.screens([],'all'),[[]]);
});

test('the line timeline places start of day, stop, and goal by share of standard time',()=>{
 const steps=[60,60,60,60];
 assert.deepEqual(engine.timeline({start:1,end:3,goal:4,dayStart:1,stepMinutes:steps}),{dayStart:0.25,stop:0.75,goal:1,remainingMinutes:60,totalMinutes:240});
 // Uneven steps: position follows standard minutes, not step count.
 const t=engine.timeline({start:0,end:1,stepMinutes:[30,90]});
 assert.equal(t.stop,0.25);assert.equal(t.goal,null);assert.equal(t.dayStart,0);
 // Only the final step fills the bar; a nearly finished unit stops short, as completion does.
 assert.equal(engine.timeline({start:0,end:2,stepMinutes:[30,90]}).stop,1);
 assert.equal(engine.timeline({start:0,end:1,stepMinutes:[999,1]}).stop,0.99);
 // The start of the day never sits past the stop; the rate multiplier scales every step alike.
 assert.equal(engine.timeline({start:2,end:2,dayStart:3,stepMinutes:steps}).dayStart,0.5);
 assert.equal(engine.timeline({start:0,end:2,stepMinutes:steps,rateMultiplier:2}).remainingMinutes,60);
 assert.throws(()=>engine.timeline({start:3,end:2,stepMinutes:steps}));
});
