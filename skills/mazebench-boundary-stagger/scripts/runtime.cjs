// Parsing and physics remain owned by the separate official engine checkout.
const path=require('node:path'),assert=require('node:assert/strict');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
function validatePlanar(world,c){
 assert(c.profile==='planar-boundary-stagger','This checker requires the planar-boundary-stagger profile');
 assert(world.levels?.length===1&&world.world?.width===1&&world.world?.height===1,'Single-room profile only');
 const cells=world.levels[0].cells;assert(cells.length===16&&cells.every(r=>r.length===16),'Expected official 16x16 cells');
 assert(cells.flat().every(t=>/^(?:\.|#|M[0-4]|p|G|\.\+(?:#|M[0-4]|p|G))$/.test(t)),'Unsupported token: use z0 floor, wall, two boxes, player, gem; no air or extra layers');
 assert(Array.isArray(c.pair)&&c.pair.length===2&&c.pair[0]!==c.pair[1]&&c.pair.every(g=>/^M[0-4]$/.test(g)),'Declare two distinct official groups');
 const ids=[...new Set(cells.flat().map(t=>t.match(/M[0-4]$/)?.[0]).filter(Boolean))].sort();
 assert.deepEqual(ids,[...c.pair].sort(),'Additional or missing groups exceed this paired profile');
 assert.equal(cells.flat().filter(t=>/^(?:\.\+)?p$/.test(t)).length,1);assert.equal(cells.flat().filter(t=>/^(?:\.\+)?G$/.test(t)).length,1);
 const reserved=new Set(['no_offset','no_boxes',...c.pair.map(g=>'no_'+g)]);
 for(const rule of c.directionChecks||[]){assert(typeof rule.name==='string'&&!reserved.has(rule.name),'Duplicate or reserved check name');reserved.add(rule.name);assert(c.pair.includes(rule.group)&&D[rule.direction]);}
 for(const claim of c.preparationChecks||[])assert(['solved','unsolved'].includes(claim.expected||'unsolved'));
 return cells;
}
function load(repo,cells){
 repo=path.resolve(repo);assert(cells.length===16&&cells.every(r=>r.length===16));
 const gamesDir=path.join(repo,'games'),support=require(path.join(repo,'server/support'));
 const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map'));
 const {createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
 const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
 const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,
  loadText:()=>cells.map(r=>r.join(' ')).join('\n'),buildGameAssetUrl:(id,p)=>`/games/${id}/${p}`,
  resolveGameAssetPath:(id,p)=>path.join(gamesDir,id,p),buildMazePreviewData:()=>({previewUrl:null})});
 const {getGame}=require(path.join(repo,'server/app'));
 const data=levels.getLevelState(getGame('maze'),{id:'level_AxA',fileName:'stagger-prototype.txt',label:'AxA'});
 global.window=global.window||{};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
 return {engine:window.MazeEngine.createEngine(data),solver:window.MazeSolver,data};
}
function observer(e,pair){
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i]||null,x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const group=(a,g)=>a.filter(x=>x.group===g&&!x.removed);
 const signature=a=>a.map(p=>[p.x-a[0].x,p.y-a[0].y,p.z-a[0].z]);
 function relative(a){const p=group(a,pair[0])[0],q=group(a,pair[1])[0];return p&&q?[q.x-p.x,q.y-p.y,q.z-p.z]:null;}
 function event(a,b,dx,dy){
  const moved=[...new Set(a.filter(x=>x.group&&!x.removed&&(b[x.i].removed||x.x!==b[x.i].x||x.y!==b[x.i].y||x.z!==b[x.i].z)).map(x=>x.group))];
  const p=a.find(x=>x.type==='player'&&!x.removed),primary=a.find(x=>x.group&&!x.removed&&x.x===p.x+dx&&x.y===p.y+dy&&x.z===p.z)?.group||null;
  const before=relative(a),after=relative(b);
  // Directional face contacts are geometric observations, not a claim that
  // every listed pair transmitted force in this move (which may be walking).
  const boxes=a.filter(x=>x.group&&!x.removed),directionalContacts=[];
  for(const x of boxes)for(const y of boxes)if(x.group!==y.group&&x.x+dx===y.x&&x.y+dy===y.y&&x.z===y.z)
   directionalContacts.push({from:x.group,fromCell:[x.x,x.y,x.z],to:y.group,toCell:[y.x,y.y,y.z]});
  return {primary,moved,directionalContacts,relativeBefore:before,relativeAfter:after,offsetChanged:JSON.stringify(before)!==JSON.stringify(after)};
 }
 function intact(a,b){
  for(const id of [...new Set(a.filter(x=>x.group).map(x=>x.group))]){
   const old=group(a,id),now=group(b,id);assert.equal(now.length,old.length,'Removed group member');
   assert.deepEqual(signature(now),signature(old),'Changed rigid shape');assert(now.every(x=>x.z===0),'This checker covers planar z0 groups only');
  }assert(b.some(x=>x.type==='player'&&!x.removed&&x.z===0),'Player left planar profile');
 }
 return {snap,group,relative,event,intact};
}
function restrict(e,v,reject,start=e.initialState,goal=e.isSolved){
 return {...e,initialState:start,isSolved:goal,heuristic:()=>0,moveForSearch(s,dx,dy){
  const before=v.snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
  if(reject(v.event(before,v.snap(s),dx,dy),before,v.snap(s),dx,dy)){e.undoMove(s,r);return {moved:false};}return r;
 }};
}
module.exports={D,load,observer,restrict,validatePlanar};
