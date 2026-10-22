const {test}=require('node:test');
const assert=require('node:assert/strict');
const {STOPS,placeCard}=require('../dist/tour.js');

const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const card={width:340,height:180},laptop={width:1440,height:900};

test('the tip card sits below a part of the screen when it fits, centred on it and kept on screen',()=>{
 assert.deepEqual(placeCard(rect(600,100,200,40),card,laptop),{side:'below',top:154,left:530});
 assert.equal(placeCard(rect(1380,20,40,34),card,laptop).left,1440-340-16);
 assert.equal(placeCard(rect(0,20,40,34),card,laptop).left,16);
});

test('the tip card moves above, then beside, then to the bottom when there is no room',()=>{
 assert.equal(placeCard(rect(600,780,200,60),card,laptop).side,'above');
 // The sidebar runs most of the screen height, so its tip goes to the right of it.
 const nav=placeCard(rect(18,180,214,600),card,laptop);
 assert.equal(nav.side,'right');assert.equal(nav.left,18+214+14);
 assert.equal(placeCard(rect(1100,100,330,760),card,laptop).side,'left');
 const phone=placeCard(rect(0,40,375,700),card,{width:375,height:800});
 assert.equal(phone.side,'bottom');assert.equal(phone.top,800-180-16);assert.equal(phone.left,375/2-340/2);
});

test('every stop is short: a title and at most two sentences',()=>{
 assert.ok(STOPS.length>=6&&STOPS.length<=10,`${STOPS.length} stops`);
 for(const stop of STOPS){
  assert.ok(stop.target&&stop.title,'each stop names a target and a title');
  assert.ok(stop.title.split(' ').length<=5,stop.title);
  assert.ok(stop.text.length<=125,`${stop.title}: ${stop.text.length} characters`);
  assert.ok((stop.text.match(/[.!?](\s|$)/g)||[]).length<=2,stop.title);
 }
 assert.equal(STOPS.at(-1).target,'#tour-start');
});
