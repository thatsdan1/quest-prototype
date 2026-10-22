/* Quick tour. A first visit offers it once (Take the tour / Not now); the ? button in the top bar replays it. Each stop highlights one
   part of the screen with a two-line tip. Never shown on a floor TV. Placement math and the stops are exported so tests run in Node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else{root.QuestTour=factory();if(typeof document!=='undefined')root.QuestTour.init();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SEEN_KEY='quest-tour-v1';

// view: the board view a stop needs. A stop whose part of the screen is hidden (a phone hides the sidebar) is skipped.
const STOPS=[
 {target:'.view-toggle',view:'day',title:'Two views',text:'Daily goals shows each shift\'s people and their goal. Weekly assemblies shows every cell and how far its unit has come.'},
 {target:'.board-toolbar',title:'Choose what you see',text:'Pick the day, then narrow it to one shift or one work cell.'},
 {target:'#add-job',title:'New job',text:'Start a unit that isn\'t on the board yet. Type the names and job number; the goal fills itself in.'},
 {target:'.assembly-cell:not(.empty-cell)',view:'week',title:'One tile per cell',text:'Darker green means the unit is further along. Continue next shift hands a unit to the next shift.'},
 {target:'#alert-bell',title:'Station alerts',text:'A count shows when a station is blocked or keeps waiting. Open it to see why.'},
 {target:'#tv-toggle',title:'Floor TV',text:'Puts the board full screen on the floor TV. People\'s results show as colours, not numbers.'},
 {target:'nav[aria-label="Main navigation"]',title:'Everything else',text:'Operator day follows one person, and Shift history keeps every change. Insights and Supervisor review show patterns.'},
 {target:'#save-status',title:'Saved and shared',text:'Shows whether your changes are saved, and whether other screens can see them.'},
 {target:'#tour-start',title:'That\'s the tour',text:'Press ? any time to see it again.'},
];

// Where the tip card goes: below the highlighted part, else above, else beside it, else along the bottom of the screen.
function placeCard(target,card,viewport,gap=14,margin=16){
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(v,Math.max(lo,hi)));
 const across=clamp(target.left+target.width/2-card.width/2,margin,viewport.width-card.width-margin);
 const down=clamp(target.top,margin,viewport.height-card.height-margin);
 if(target.bottom+gap+card.height<=viewport.height-margin)return {side:'below',top:target.bottom+gap,left:across};
 if(target.top-gap-card.height>=margin)return {side:'above',top:target.top-gap-card.height,left:across};
 if(target.right+gap+card.width<=viewport.width-margin)return {side:'right',top:down,left:target.right+gap};
 if(target.left-gap-card.width>=margin)return {side:'left',top:down,left:target.left-gap-card.width};
 return {side:'bottom',top:viewport.height-card.height-margin,left:clamp(viewport.width/2-card.width/2,margin,viewport.width-card.width-margin)};
}

function init(){
 const store={get(){try{return localStorage.getItem(SEEN_KEY);}catch{return null;}},set(v){try{localStorage.setItem(SEEN_KEY,v);}catch{}}};
 const onFloorTv=()=>document.body.classList.contains('tv-mode')||document.body.classList.contains('kiosk')||new URLSearchParams(location.search).get('display')==='tv';
 const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';};
 const el=(tag,cls,html='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.innerHTML=html;return n;};
 const press=selector=>{const b=document.querySelector(selector);if(b&&!b.classList.contains('selected')&&!b.classList.contains('active'))b.click();};
 let active=null;

 function start(){
  if(active||onFloorTv())return;
  invite?.remove();invite=null;store.set('seen');
  const before={page:document.querySelector('.nav-item.active')?.dataset.page||'board',view:document.querySelector('.view-toggle .selected')?.dataset.view||'day',focus:document.activeElement};
  press('.nav-item[data-page="board"]');
  const block=el('div','tour-block'),spot=el('div','tour-spot'),card=el('div','tour-card',`<p class="tour-count" id="tour-count"></p><h2 id="tour-title"></h2><p id="tour-text"></p><div class="tour-actions"><button type="button" class="tour-skip">Skip tour</button><span><button type="button" class="button tour-back">Back</button><button type="button" class="button primary tour-next">Next</button></span></div>`);
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','tour-title');card.setAttribute('aria-describedby','tour-text');
  // Only the stops this screen shows: a phone hides the sidebar, and the cell stop needs a unit on the board.
  const stops=STOPS.filter(stop=>{if(stop.view)press(`.view-toggle [data-view="${stop.view}"]`);return visible(document.querySelector(stop.target));});
  if(!stops.length)return;
  document.body.append(block,spot,card);
  active={pos:-1,stops,block,spot,card,before};
  card.querySelector('.tour-skip').onclick=end;
  card.querySelector('.tour-back').onclick=()=>go(-1);
  card.querySelector('.tour-next').onclick=()=>go(1);
  document.addEventListener('keydown',keys,true);
  addEventListener('resize',place);addEventListener('scroll',place,true);
  go(1);
 }
 function go(step,from=active.pos){
  const pos=from+step;
  if(pos<0)return;
  if(pos>=active.stops.length)return end();
  const stop=active.stops[pos];
  if(stop.view)press(`.view-toggle [data-view="${stop.view}"]`);
  const target=document.querySelector(stop.target);
  if(!visible(target))return go(step,pos);
  active.pos=pos;active.target=target;
  const q=sel=>active.card.querySelector(sel);
  q('#tour-count').textContent=`${pos+1} of ${active.stops.length}`;
  q('#tour-title').textContent=stop.title;
  q('#tour-text').textContent=stop.text;
  q('.tour-back').disabled=pos===0;
  q('.tour-next').textContent=pos===active.stops.length-1?'Done':'Next';
  const r=target.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)target.scrollIntoView({block:r.height<innerHeight*.75?'center':'start'});
  place();
  q('.tour-next').focus({preventScroll:true});
 }
 function place(){
  if(!active?.target)return;
  const r=active.target.getBoundingClientRect(),pad=6,s=active.spot.style;
  s.top=`${r.top-pad}px`;s.left=`${r.left-pad}px`;s.width=`${r.width+pad*2}px`;s.height=`${r.height+pad*2}px`;
  const box=active.card.getBoundingClientRect(),at=placeCard({top:r.top-pad,bottom:r.bottom+pad,left:r.left-pad,right:r.right+pad,width:r.width+pad*2},{width:box.width,height:box.height},{width:innerWidth,height:innerHeight});
  active.card.style.top=`${Math.round(at.top)}px`;active.card.style.left=`${Math.round(at.left)}px`;active.card.dataset.side=at.side;
 }
 function keys(e){
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end();}
  else if(e.key==='ArrowRight'){e.preventDefault();go(1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}
  else if(e.key==='Tab'){const f=[...active.card.querySelectorAll('button:not(:disabled)')],i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();}
 }
 // Puts the board back the way the person had it.
 function end(){
  if(!active)return;
  const {block,spot,card,before}=active;active=null;
  block.remove();spot.remove();card.remove();
  document.removeEventListener('keydown',keys,true);removeEventListener('resize',place);removeEventListener('scroll',place,true);
  press(`.nav-item[data-page="${before.page}"]`);
  if(before.page==='board')press(`.view-toggle [data-view="${before.view}"]`);
  (document.querySelector('#tour-start')||before.focus)?.focus?.();
 }

 // First visit on this browser: offer the tour once, without blocking the board.
 let invite=null;
 document.querySelector('#tour-start')?.addEventListener('click',start);
 if(!store.get()&&!onFloorTv())setTimeout(()=>{
  if(store.get()||onFloorTv()||active||document.querySelector('dialog[open]'))return;
  invite=el('aside','tour-invite',`<h2>New here?</h2><p>A one-minute tour shows where everything is. You can open it later with the ? button at the top.</p><div class="tour-actions"><button type="button" class="button tour-later">Not now</button><button type="button" class="button primary tour-go">Take the tour</button></div>`);
  invite.setAttribute('aria-label','Quick tour');
  invite.querySelector('.tour-go').onclick=start;
  invite.querySelector('.tour-later').onclick=()=>{store.set('dismissed');invite.remove();invite=null;};
  document.body.append(invite);
 },900);
 return {start,end};
}

let api=null;
return {STOPS,placeCard,init(){api=api||init();return api;},start(){return (api||this.init()).start();}};
});
