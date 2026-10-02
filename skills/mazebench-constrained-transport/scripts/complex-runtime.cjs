'use strict';
// Author-side analysis only. Every transition is an ordinary official move.
// Push-state BFS merges only states in the same frozen-object walking component.
// History is stored on analyzer nodes and in keys, never in engine state/snapshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
function load(repo,cells){
 repo=path.resolve(repo);const gamesDir=path.join(repo,'games'),support=require(path.join(repo,'server/support'));
 const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map')),{createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
 const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
 const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,loadText:()=>cells.map(r=>r.join(' ')).join('\n'),
 buildGameAssetUrl:(id,p)=>`/games/${id}/${p}`,resolveGameAssetPath:(id,p)=>path.join(gamesDir,id,p),buildMazePreviewData:()=>({previewUrl:null})});
 const {getGame}=require(path.join(repo,'server/app'));global.window=global.window||{};
 require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
 const data=levels.getLevelState(getGame('maze'),{id:'level_AxA',fileName:'complex-author.txt',label:'AxA'});
 const engine=window.MazeEngine.createEngine(data);assert.deepEqual(engine.loadWarnings,[]);
 return {engine,solver:window.MazeSolver,data};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=a=>[a.x,a.y,a.z];
function observe(e,c){
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i]||null,x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const group=(a,g)=>a.filter(p=>p.group===g&&!p.removed),pose=(a,g)=>group(a,g).map(point).sort((a,b)=>a.join(',').localeCompare(b.join(',')));
 const goal=s=>{if(c.goal.kind==='gem')return e.isSolved(s);return snap(s).some(p=>p.type==='player'&&!p.removed&&same(point(p),c.goal.cell));};
 function event(a,b,d){
  const [dx,dy]=D[d],p=a.find(p=>p.type==='player'&&!p.removed);
  const primary=a.find(q=>q.group&&!q.removed&&q.x===p.x+dx&&q.y===p.y+dy&&q.z===p.z)?.group||null;
  const moved=[...new Set(a.filter(q=>q.group&&!q.removed&&(b[q.i].removed||!same(point(q),point(b[q.i])))).map(q=>q.group))];
  const removed=[...new Set(a.filter(q=>q.group&&!q.removed&&b[q.i].removed).map(q=>q.group))];
  const contacts=[];
  for(const q of a.filter(q=>q.group&&!q.removed))for(const t of a.filter(t=>t.group&&!t.removed&&t.group!==q.group))
   if(q.x+dx===t.x&&q.y+dy===t.y&&q.z===t.z)contacts.push({from:q.group,to:t.group,C:point(q),T:point(t),along:(t.x-p.x)*dx+(t.y-p.y)*dy,lateral:(t.x-p.x)*dy-(t.y-p.y)*dx});
  const translates=g=>group(a,g).length>0&&group(a,g).every(q=>!b[q.i].removed&&same(point(b[q.i]),[q.x+dx,q.y+dy,q.z]));
  const m=c.mechanism,tool=m.tool,target=m.target;
  const contact=tool?contacts.filter(t=>t.from===tool&&t.to===target&&(m.kind==='rear'?t.along<0:t.lateral!==0)):[];
  const transfer=!!tool&&primary===tool&&translates(tool)&&translates(target)&&contact.length>0;
  const pair=m.pair,relative=a=>{const x=pair&&group(a,pair[0])[0],y=pair&&group(a,pair[1])[0];return x&&y?[y.x-x.x,y.y-x.y,y.z-x.z]:null;};
  const offset=!!pair&&!same(relative(a),relative(b));
  return {d,primary,moved,removed,contacts,transfer,offset,P:point(p),I:[p.x+dx,p.y+dy,p.z],qualifyingContacts:contact};
 }
 function matches(v,q){
  if(q.kind==='move')return v.moved.includes(q.group)&&(!q.direction||v.d===q.direction)&&(!q.primary||v.primary===q.group);
  if(q.kind==='remove')return v.removed.includes(q.group);
  if(q.kind==='independent-tool')return v.moved.includes(c.mechanism.tool)&&!v.moved.includes(c.mechanism.target);
  if(q.kind==='contact')return v.transfer;
  if(q.kind==='offset')return v.offset;
  if(q.kind==='all-motion')return v.moved.length>0;
  throw Error('Unsupported event selector '+q.kind);
 }
 function intact(a,b){
  for(const g of Object.keys(c.members)){
   const old=group(a,g),now=group(b,g);
   assert(now.length===old.length||now.length===0&&c.allowRemoval.includes(g),'Partial or undeclared removal '+g);
   if(!now.length)continue;
   assert(now.every(p=>p.z===0),'Unsupported nonplanar continuation');
   const delta=point(now[0]).map((n,i)=>n-point(old[0])[i]);
   assert(old.every((p,i)=>point(now[i]).every((n,k)=>n-point(p)[k]===delta[k])),'Rigid group changed');
  }
  assert(b.some(p=>p.type==='player'&&!p.removed&&p.z===0),'Player removed or nonplanar');
 }
 return {snap,group,pose,goal,event,matches,intact};
}
function validate(spec,root){
 const c=spec.contract,cells=spec.cells;
 assert(typeof spec.title==='string'&&spec.title.trim());
 assert(['planar-boundary-preparation-v2','planar-transport-depth-v2','planar-hook-depth-v2'].includes(c?.profile),'Unsupported complex profile');
 assert(c.mode==='complex');assert(cells?.length===16&&cells.every(r=>r.length===16));
 assert(cells.flat().every(t=>/^(?:\+|\.|#|p|G|M[0-4]|(?:\.\+|\+)(?:#|p|G|M[0-4]))$/.test(t)),'Unsupported terrain/token');
 assert(['gem','reach'].includes(c.goal?.kind));
 if(c.goal.kind==='reach')assert(c.goal.cell?.length===3&&c.goal.cell.every(Number.isInteger)&&c.goal.cell[2]===0);
 assert(Array.isArray(c.allowRemoval));
 assert(c.members&&Object.keys(c.members).length>=2&&Object.keys(c.members).every(g=>/^M[0-4]$/.test(g)));
 const points={};let player=0,gems=0;
 cells.forEach((r,y)=>r.forEach((t,x)=>{const top=t.split('+').at(-1);if(/^M[0-4]$/.test(top))(points[top]??=[]).push([x,y,0]);if(top==='p')player++;if(top==='G')gems++;}));
 assert.equal(player,1);assert.equal(gems,c.goal.kind==='gem'?1:0,'Explicit passage goal requires no accidental gem objective');
 assert.deepEqual(Object.keys(points).sort(),Object.keys(c.members).sort());
 for(const g of Object.keys(points))assert(same(points[g],c.members[g]),'Declare ALL initial members, row order, z=0: '+g);
 assert(c.allowRemoval.every(g=>points[g]));assert(c.necessaryRoles?.length>=2&&c.necessaryRoles.every(g=>points[g]));
 assert(Array.isArray(c.optionalRoles)&&new Set([...c.necessaryRoles,...c.optionalRoles]).size===Object.keys(points).length&&[...c.necessaryRoles,...c.optionalRoles].every(g=>points[g]),'Classify every role as necessary or explicitly optional');
 assert(c.roles&&Object.keys(points).every(g=>typeof c.roles[g]==='string'));
 assert(c.events&&Object.keys(c.events).length>=3);
 for(const q of Object.values(c.events)){
  assert(['move','remove','independent-tool','contact','offset','all-motion'].includes(q.kind));
  if(q.group)assert(points[q.group]);if(q.direction)assert(D[q.direction]);
 }
 assert(c.mechanism&&['boundary','side','rear'].includes(c.mechanism.kind));
 assert((c.profile==='planar-boundary-preparation-v2')===(c.mechanism.kind==='boundary'),'Mechanism/profile routing mismatch');
 if(c.mechanism.kind==='boundary')assert(c.mechanism.pair?.length===2&&c.mechanism.pair.every(g=>points[g])&&c.boundaryControls?.length);
 else assert(points[c.mechanism.tool]&&points[c.mechanism.target]&&c.mechanism.tool!==c.mechanism.target);
 assert(c.stages?.length>=3&&c.stages.every(s=>s.name&&c.events[s.event]&&s.conflict&&s.effect));
 assert(c.dependencies?.length>=2&&c.dependencies.every(d=>c.events[d.prepare]&&(d.before==='goal'||c.events[d.before])&&d.conflict));
 assert(c.dependencies.every(d=>!d.after||c.events[d.after]));
 const declared=new Set(c.stages.map(s=>s.event));assert(c.stages.every(s=>c.dependencies.some(d=>d.prepare===s.event||d.before===s.event)),'Every functional stage needs a tested dependency');
 assert(c.dependencies.some(d=>declared.has(d.prepare)&&declared.has(d.before)),'Missing connection between functional stages');
 if(c.profile==='planar-transport-depth-v2'){
  assert(c.reuse?.length&&c.opposingDirections?.length,'Transport requires reuse and opposing-direction evidence');
  for(const r of c.reuse)assert(c.events[r.first]&&c.events[r.return]&&c.events[r.before]&&r.conflict&&r.progress);
  for(const r of c.opposingDirections)assert(points[r.group]&&r.directions?.length===2&&D[r.directions[0]][0]+D[r.directions[1]][0]===0&&D[r.directions[0]][1]+D[r.directions[1]][1]===0&&c.events[r.before]);
 }
 if(c.mechanism.kind==='boundary'){
  assert(c.events[c.releaseEvent]&&c.preparationEvents?.length,'Boundary complex mode needs a release and explicit preparation events');
  for(const n of c.preparationEvents)assert(c.events[n]&&n!==c.releaseEvent&&c.dependencies.some(d=>d.prepare===n&&d.before===c.releaseEvent),'Missing preparation-to-release prefix');
 }else{
  const contact=Object.keys(c.events).find(n=>c.events[n].kind==='contact'),prep=Object.keys(c.events).find(n=>c.events[n].kind==='independent-tool');
  assert(contact&&prep&&c.dependencies.some(d=>d.prepare===prep&&d.before===contact),'Declare independently transported preparation before true contact');
  assert(c.dependencies.some(d=>d.after===contact&&d.before==='goal'&&c.events[d.prepare].kind==='all-motion'),'Declare object work after first contact');
 }
 assert(c.spatial?.boundaries&&c.spatial.voids&&c.spatial.support&&c.spatial.blocked&&c.spatial.reserved);
 assert(Array.isArray(c.spatial.boundaries)&&c.spatial.boundaries.every(([x,y,z])=>z===0&&['#','.+#','+#'].includes(cells[y]?.[x])),'Declared fixed boundary does not match terrain');
 const voids=cells.flatMap((r,y)=>r.flatMap((t,x)=>t==='+'||t.startsWith('+')?[[x,y,0]]:[]));
 assert(same(voids,c.spatial.voids),'Declare every void, including void beneath an overhanging member');
 assert(Array.isArray(c.spatial.blocked)&&c.spatial.blocked.length&&c.spatial.blocked.every(b=>b.reason&&b.stance?.length===3&&D[b.direction]),'Declare concrete blocked stance/destination relationships');
 assert(Array.isArray(c.spatial.reserved)&&c.spatial.reserved.length&&c.spatial.reserved.every(r=>r.cell?.length===3&&r.function),'Declare concrete next/recovery stances');
 assert(c.inherited?.length>=3&&c.changes?.length&&c.readReceipt?.readBeforeLayout===true);
 const caseFile=path.resolve(root,'references/official-case.md');
 assert.equal(c.readReceipt.path,'references/official-case.md');assert.equal(c.readReceipt.sha256,hash(fs.readFileSync(caseFile)),'Case receipt refers to a different version');
 return spec;
}
function walking(e,o,start){
 const queue=[{state:e.cloneState(start),path:''}],seen=new Set([e.stateKey(start)]),pushes=[];
 const playerIndex=e.actorTypes.indexOf('player');assert(playerIndex>=0&&!start.actorRemoved[playerIndex],'No living player');
 let canonical=queue[0];
 for(let i=0;i<queue.length;i++){
  const n=queue[i],a=o.snap(n.state),p=a.find(x=>x.type==='player'&&!x.removed);
  if(p.y*16+p.x<o.snap(canonical.state).find(x=>x.type==='player'&&!x.removed).y*16+o.snap(canonical.state).find(x=>x.type==='player'&&!x.removed).x)canonical=n;
  for(const [d,v]of Object.entries(D)){
   const s=e.cloneState(n.state),r=e.move(s,...v);if(!r.moved||s.actorRemoved[playerIndex])continue;
   assert(s.actorElevation[playerIndex]===0,'Nonplanar walking unsupported');
   let changed=false;for(let j=0;j<e.actorTypes.length;j++)if(e.actorGroupIds[j]&&(s.actorX[j]!==n.state.actorX[j]||s.actorY[j]!==n.state.actorY[j]||s.actorElevation[j]!==n.state.actorElevation[j]||s.actorRemoved[j]!==n.state.actorRemoved[j])){changed=true;break;}
   if(changed){const b=o.snap(s),event=o.event(a,b,d);o.intact(a,b);pushes.push({state:s,path:n.path+d,event});continue;}
   const key=e.stateKey(s);if(!seen.has(key)){seen.add(key);queue.push({state:s,path:n.path+d});}
  }
 }
 return {queue,pushes,key:e.stateKey(canonical.state),reachable:queue.map(n=>{const p=o.snap(n.state).find(x=>x.type==='player'&&!x.removed);return point(p);})};
}
// This BFS is deliberately outside the official solver: its compact A* snapshots
// discard extra properties. Node history is cloned explicitly and hashed below.
async function search(e,o,{cap=1000000,start=e.initialState,cut=()=>false,end=o.goal,history={},update=h=>h,endHistory=()=>true}={}){
 const first={state:e.cloneState(start),history:structuredClone(history),path:''},queue=[first],seen=new Set(),regions=new Map(),pending=new Set();let expanded=0,walkExpanded=0;
 for(let i=0;i<queue.length;i++){
  if(expanded>=cap)return {status:'capped',expanded,walkExpanded,cap};
  const n=queue[i];queue[i]=null;const suffix='|'+JSON.stringify(n.history),known=regions.get(e.stateKey(n.state));
  if(known&&seen.has(known+suffix))continue;
  const w=walking(e,o,n.state),key=w.key+suffix;
  for(const q of w.queue)regions.set(e.stateKey(q.state),w.key);
  if(seen.has(key))continue;seen.add(key);expanded++;walkExpanded+=w.queue.length;
  for(const q of w.queue)if(end(q.state,n.history)&&endHistory(n.history))return {status:'solved',path:n.path+q.path,expanded,walkExpanded,history:n.history};
  for(const t of w.pushes){if(cut(t.event,n.history))continue;
   const h=structuredClone(update(structuredClone(n.history),t.event));
   const physical=e.stateKey(t.state),nextSuffix='|'+JSON.stringify(h),region=regions.get(physical),exact=physical+nextSuffix;
   if(region&&seen.has(region+nextSuffix)||pending.has(exact))continue;pending.add(exact);
   queue.push({state:t.state,history:h,path:n.path+t.path});
  }
  if(expanded%100===0)await new Promise(resolve=>setImmediate(resolve));
 }
 return {status:'unsolved',expanded,walkExpanded};
}
function replay(e,o,sequence,{start=e.initialState,end=o.goal,cut=()=>false,history={},update=h=>h,endHistory=()=>true}={}){
 const s=e.cloneState(start),fast=e.cloneState(start),rows=[];let h=structuredClone(history);
 for(const [i,d]of [...sequence].entries()){
  assert(D[d]);const a=o.snap(s),r=e.move(s,...D[d]),f=e.moveForSearch(fast,...D[d]);assert(r.moved&&f.moved,'Illegal ordinary replay '+(i+1));
  for(const k of ['actorX','actorY','actorElevation','actorRemoved','terrain','liftRaised'])assert.deepEqual(Array.from(s[k]),Array.from(fast[k]),'Ordinary/search mismatch');
  const b=o.snap(s),v=o.event(a,b,d);o.intact(a,b);assert(!cut(v,h),'Bypass violates its restriction');
  if(v.moved.length)h=structuredClone(update(h,v));rows.push({step:i+1,d,event:v,before:a,after:b});
 }
 assert(end(s,h)&&endHistory(h),'Replay missed endpoint');return {state:s,rows,history:h};
}
module.exports={D,read,hash,load,observe,validate,walking,search,replay};
