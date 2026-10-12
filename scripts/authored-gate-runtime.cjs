'use strict';
// Author-side analysis through the separately installed official engine.
// No benchmark models or remote evaluation services are used.
const assert=require('node:assert/strict');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function observer(e,goal){
 const ids=e.actorTypes.map((t,i)=>e.actorGroupIds[i]||(t==='floating_floor'?'F'+i:null));
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:ids[i],x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const point=a=>[a.x,a.y,a.z];
 const event=(a,b,d)=>{const [dx,dy]=D[d],p=a.find(p=>p.type==='player'&&!p.removed),I=[p.x+dx,p.y+dy,p.z];const primary=a.find(q=>q.group&&!q.removed&&same(point(q),I))?.group||null;
 const moved=[...new Set(a.filter(q=>q.group&&!q.removed&&(b[q.i].removed||!same(point(q),point(b[q.i])))).map(q=>q.group))];
 const translated=moved.filter(g=>a.filter(q=>q.group===g&&!q.removed).every(q=>!b[q.i].removed&&same(point(b[q.i]),[q.x+dx,q.y+dy,q.z])));
 const contacts=[];for(const q of a.filter(q=>q.group&&!q.removed))for(const t of a.filter(t=>t.group&&!t.removed&&t.group!==q.group))if(q.x+dx===t.x&&q.y+dy===t.y&&q.z===t.z)contacts.push({from:q.group,to:t.group,C:point(q),T:point(t),along:(t.x-p.x)*dx+(t.y-p.y)*dy,lateral:(t.x-p.x)*dy-(t.y-p.y)*dx});
 return {d,P:point(p),I,primary,moved,translated,contacts,removed:moved.filter(g=>b.filter(q=>q.group===g).every(q=>q.removed))};};
 const playerIndex=e.actorTypes.indexOf('player');
 const valid=s=>!s.actorRemoved[playerIndex]&&s.actorElevation[playerIndex]===0;
 const end=s=>valid(s)&&(goal.kind==='gem'?e.isSolved(s):same([s.actorX[playerIndex],s.actorY[playerIndex],s.actorElevation[playerIndex]],goal.cell));
 return {ids,snap,point,event,valid,goal:end,playerIndex};
}
function walking(e,o,start){
 const startKey=e.stateKey(start),queue=[{state:e.cloneState(start),path:''}],seen=new Map([[startKey,0]]),reverse=new Map(),pushes=[];
 for(let i=0;i<queue.length;i++){const n=queue[i],a=o.snap(n.state),from=e.stateKey(n.state);
  for(const [d,v]of Object.entries(D)){const s=e.cloneState(n.state),r=e.moveForSearch(s,...v);if(!r.moved||!o.valid(s))continue;const ev=o.event(a,o.snap(s),d);
   if(ev.moved.length){pushes.push({state:s,path:n.path+d,event:ev});continue;}
   const key=e.stateKey(s);if(!reverse.has(key))reverse.set(key,new Set());reverse.get(key).add(from);
   if(!seen.has(key)){seen.set(key,queue.length);queue.push({state:s,path:n.path+d});}
  }
 }
 // Only mutually reachable walking states may share an analyzer node. A player
 // can leave a vacated gate without being able to step back onto it. Gem
 // collection is also irreversible and therefore belongs to a different SCC.
 const component=new Set(),todo=[startKey];while(todo.length){const key=todo.pop();if(component.has(key))continue;component.add(key);todo.push(...(reverse.get(key)||[]));}
 return {queue,pushes,key:[...component].sort()[0],component:[...component],reachable:queue.map(n=>[n.state.actorX[o.playerIndex],n.state.actorY[o.playerIndex],0])};
}
async function search(e,o,{cap=100000,timeMs=30000,start=e.initialState,cut=()=>false,end=o.goal,history={},update=h=>h,endHistory=()=>true}={}){
 const clock=Date.now(),queue=[{state:e.cloneState(start),path:'',history:structuredClone(history)}],seen=new Set(),regions=new Map(),pending=new Set();let expanded=0,walkExpanded=0;
 for(let i=0;i<queue.length;i++){if(expanded>=cap||Date.now()-clock>timeMs)return {status:'capped',expanded,walkExpanded,cap,timeMs,elapsed:Date.now()-clock};const n=queue[i];queue[i]=null;const suffix='|'+JSON.stringify(n.history),known=regions.get(e.stateKey(n.state));if(known&&seen.has(known+suffix))continue;
 const w=walking(e,o,n.state),key=w.key+suffix;for(const physical of w.component)regions.set(physical,w.key);if(seen.has(key))continue;seen.add(key);expanded++;walkExpanded+=w.queue.length;
 for(const q of w.queue)if(end(q.state,n.history)&&endHistory(n.history))return {status:'solved',path:n.path+q.path,expanded,walkExpanded,history:n.history,elapsed:Date.now()-clock};
 for(const t of w.pushes){if(cut(t.event,n.history,t.state))continue;const h=structuredClone(update(structuredClone(n.history),t.event,t.state));const physical=e.stateKey(t.state),nextSuffix='|'+JSON.stringify(h),region=regions.get(physical),exact=physical+nextSuffix;if(region&&seen.has(region+nextSuffix)||pending.has(exact))continue;pending.add(exact);queue.push({state:t.state,path:n.path+t.path,history:h});}
 if(expanded%100===0)await new Promise(resolve=>setImmediate(resolve));}
 return {status:'unsolved',expanded,walkExpanded,elapsed:Date.now()-clock};}
function replay(e,o,seq,{start=e.initialState,end=o.goal,allowBlocked=false}={}){const state=e.cloneState(start),fast=e.cloneState(start),rows=[],states=[e.cloneState(start)];for(const [i,d]of [...seq].entries()){assert(D[d]);const before=o.snap(state),a=e.move(state,...D[d]),b=e.moveForSearch(fast,...D[d]);assert(a.moved===b.moved,'Transition disagreement');if(!allowBlocked)assert(a.moved,'Blocked input '+(i+1)+' '+d);for(const field of ['actorX','actorY','actorElevation','actorRemoved','terrain','liftRaised'])assert.deepEqual(Array.from(state[field]),Array.from(fast[field]),'Ordinary/search state disagreement: '+field);assert.equal(e.stateKey(state),e.stateKey(fast),'Ordinary/search key disagreement');assert(o.valid(state),'Player lost');const after=o.snap(state);for(const group of new Set(before.filter(q=>q.group&&!q.removed).map(q=>q.group))){const old=before.filter(q=>q.group===group&&!q.removed),now=after.filter(q=>q.group===group&&!q.removed);assert(now.length===0||now.length===old.length,'Partial group loss');if(now.length){assert(now.every(q=>q.z===0),'Unsupported elevation');const dx=now[0].x-old[0].x,dy=now[0].y-old[0].y;assert(old.every(q=>after[q.i].x-q.x===dx&&after[q.i].y-q.y===dy),'Rigid group changed');}}rows.push({step:i+1,d,moved:a.moved,event:o.event(before,after,d),before,after,raisedAfter:[...e.computeRaisedPlayerGateSet(state)].sort((a,b)=>a-b)});states.push(e.cloneState(state));}assert(end(state),'Missed complete goal');return {state,rows,states};}
module.exports={D,observer,walking,search,replay};
