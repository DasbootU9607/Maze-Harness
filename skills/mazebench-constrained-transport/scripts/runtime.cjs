// Author-side helpers. Parsing, moves, undo, and search belong to the official checkout.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const digest=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const coordKey=p=>p.join(',');
const footprint=points=>points.map(coordKey).sort();
function validCell(p){return Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<16);}
function shape(points){const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return footprint(points.map(p=>[p[0]-x,p[1]-y]));}
function validate(spec){
  assert(spec&&typeof spec.title==='string'&&spec.title.trim(),'Provide a title');
  const cells=spec.cells,c=spec.contract;
  assert(c?.profile==='planar-rigid-transport-v1','Unsupported profile');
  assert(Array.isArray(cells)&&cells.length===16&&cells.every(r=>Array.isArray(r)&&r.length===16),'Expected one 16x16 room');
  const ids=new Map();let players=0,gems=0;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const t=cells[y][x];
    assert(typeof t==='string'&&/^(?:\+|\.|#|p|G|M[0-4]|\.\+(?:#|p|G|M[0-4]))$/.test(t),'Unsupported token at '+x+','+y+': '+t);
    const top=t.split('+').at(-1);
    if(x===0||y===0||x===15||y===15)assert.equal(top,'#','Profile requires a closed wall boundary');
    if(top==='p')players++;if(top==='G')gems++;
    if(/^M[0-4]$/.test(top)){if(!ids.has(top))ids.set(top,[]);ids.get(top).push([x,y]);}
  }
  assert.equal(players,1,'Expected one player');assert.equal(gems,1,'Expected one gem');
  const r=c.roles;
  assert(r&&Array.isArray(r.helpers)&&r.helpers.length>=1&&r.helpers.length<=3,'Declare 1-3 helpers');
  const roles=[r.tool,...r.helpers,r.target];
  assert(roles.every(g=>/^M[0-4]$/.test(g))&&new Set(roles).size===roles.length,'Roles need distinct supported group IDs');
  assert.deepEqual([...ids.keys()].sort(),[...roles].sort(),'Every group must have a declared role');
  for(const [g,points]of ids){
    const pending=new Set(footprint(points)),queue=[points[0]];pending.delete(coordKey(points[0]));
    for(let i=0;i<queue.length;i++)for(const [dx,dy]of Object.values(D)){
      const next=[queue[i][0]+dx,queue[i][1]+dy];if(pending.delete(coordKey(next)))queue.push(next);
    }
    assert.equal(pending.size,0,'Disconnected rigid shape '+g);
  }
  assert(c.delivery&&Array.isArray(c.delivery.toolCells)&&c.delivery.toolCells.length===ids.get(r.tool).length,'Delivery must specify the complete tool');
  assert(c.delivery.toolCells.every(validCell)&&validCell(c.delivery.playerCell),'Invalid delivery coordinates');
  assert.equal(new Set(footprint(c.delivery.toolCells)).size,c.delivery.toolCells.length,'Duplicate delivery cell');
  assert.deepEqual(shape(ids.get(r.tool)),shape(c.delivery.toolCells),'Delivery may translate, not reshape or rotate the tool');
  assert(D[c.use?.direction],'Declare use.direction as U, D, L, or R');
  const [dx,dy]=D[c.use.direction],[px,py]=c.delivery.playerCell;
  assert(c.delivery.toolCells.some(([x,y])=>x===px+dx&&y===py+dy),'Delivery stance must face the tool in use.direction');
  assert(!c.delivery.toolCells.some(([x,y])=>x===px&&y===py),'Player stance overlaps the tool');
  assert(typeof c.intent==='string'&&c.intent.trim(),'Describe the intended dependency');
  assert(c.composition&&typeof c.composition==='object'&&!Array.isArray(c.composition),'Provide the composition interface');
  return spec;
}
function services(repo,cells){
  repo=path.resolve(repo);const gamesDir=path.join(repo,'games'),support=require(path.join(repo,'server/support'));
  const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map'));
  const {createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
  const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
  const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,
    ...(cells?{loadText:()=>cells.map(r=>r.join(' ')).join('\n')}:{}),
    buildGameAssetUrl:(id,p)=>`/assets/${id}/${p}`,
    resolveGameAssetPath:(id,p)=>{const file=path.join(gamesDir,id,p);return fs.existsSync(file)?file:null;},
    buildMazePreviewData:()=>({previewUrl:null})});
  return {repo,gamesDir,support,worldMaps,levels};
}
function load(repo,cells){
  const s=services(repo,cells),{getGame}=require(path.join(s.repo,'server/app'));
  const data=s.levels.getLevelState(getGame('maze'),{id:'level_AxA',fileName:'transport-prototype.txt',label:'AxA'});
  global.window=global.window||{};
  require(path.join(s.repo,'public/maze-engine'));require(path.join(s.repo,'public/maze-solver'));
  const engine=window.MazeEngine.createEngine(data);
  assert.deepEqual(engine.loadWarnings,[],'Initial load changed the authored state');
  assert([...engine.initialState.actorElevation].every(z=>z===0),'Only initial z0 actors supported');
  assert([...engine.initialState.actorRemoved].every(n=>!n),'An initial actor disappeared');
  return {engine,solver:window.MazeSolver,data};
}
function stateRecord(s){return Object.fromEntries(['actorX','actorY','actorElevation','actorRemoved','terrain','liftRaised'].map(k=>[k,Array.from(s[k])]));}
function observer(e,c){
  const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i]||null,x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
  const group=(a,g)=>a.filter(x=>x.type==='weightless_box'&&x.group===g&&!x.removed);
  const moved=(a,b)=>[...new Set(a.filter(x=>x.type==='weightless_box'&&(x.x!==b[x.i].x||x.y!==b[x.i].y||x.z!==b[x.i].z||x.removed!==b[x.i].removed)).map(x=>x.group))];
  const delivered=a=>{const p=a.find(x=>x.type==='player'&&!x.removed),tool=group(a,c.roles.tool);return !!p&&p.z===0&&tool.every(x=>x.z===0)&&p.x===c.delivery.playerCell[0]&&p.y===c.delivery.playerCell[1]&&JSON.stringify(footprint(tool.map(x=>[x.x,x.y])))===JSON.stringify(footprint(c.delivery.toolCells));};
  function event(a,b,dx,dy){
    const p=a.find(x=>x.type==='player'&&!x.removed),groups=moved(a,b);
    const primary=p?a.find(x=>x.type==='weightless_box'&&!x.removed&&x.x===p.x+dx&&x.y===p.y+dy&&x.z===p.z)?.group||null:null;
    const contacts=[];
    for(const from of group(a,c.roles.tool))for(const to of group(a,c.roles.target)){
      if(from.x+dx===to.x&&from.y+dy===to.y&&from.z===to.z)contacts.push({tool:[from.x,from.y,from.z],target:[to.x,to.y,to.z]});
    }
    const translated=g=>{const members=group(a,g);return members.length>0&&members.every(x=>!b[x.i].removed&&b[x.i].x===x.x+dx&&b[x.i].y===x.y+dy&&b[x.i].z===x.z);};
    const use=dx===D[c.use.direction][0]&&dy===D[c.use.direction][1]&&primary===c.roles.tool&&contacts.length>0&&translated(c.roles.tool)&&translated(c.roles.target);
    const independentHelpers=c.roles.helpers.filter(g=>groups.includes(g)&&!groups.includes(c.roles.tool));
    return {primary,moved:groups,contacts,use,independentHelpers};
  }
  function intact(a,b){
    for(const g of [c.roles.tool,...c.roles.helpers,c.roles.target]){
      const before=group(a,g),after=group(b,g);assert.equal(after.length,before.length,'Removed group member on witness');
      assert.deepEqual(before.map(x=>[x.x-before[0].x,x.y-before[0].y,x.z]),after.map(x=>[x.x-after[0].x,x.y-after[0].y,x.z]),'Rigid shape or layer changed');
    }
    assert(b.some(x=>x.type==='player'&&!x.removed&&x.z===0),'Player lost or left z0');
  }
  return {snap,group,moved,delivered,event,intact};
}
function restrict(e,o,reject,goal=e.isSolved){
  return {...e,isSolved:goal,heuristic:goal===e.isSolved?e.heuristic:()=>0,
    moveForSearch(s,dx,dy){const before=o.snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
      const after=o.snap(s),event=o.event(before,after,dx,dy);
      if(reject(event,before,after)){e.undoMove(s,r);return {moved:false,moves:[]};}return r;}};
}
function replay(e,o,sequence,{reject=()=>false,goal=e.isSolved,requireIntact=false}={}){
  const s=e.cloneState(e.initialState),search=e.cloneState(e.initialState),rows=[];
  for(const [i,d]of [...sequence].entries()){
    assert(D[d],'Invalid direction');const before=o.snap(s);
    const a=e.move(s,...D[d]),b=e.moveForSearch(search,...D[d]);
    assert(a.moved&&b.moved,'Blocked replay step '+(i+1));assert.deepEqual(stateRecord(s),stateRecord(search),'Search/ordinary replay mismatch');
    const after=o.snap(s),event=o.event(before,after,...D[d]);
    assert(!reject(event,before,after),'Counterexample violates its own restriction');
    if(requireIntact)o.intact(before,after);
    rows.push({step:i+1,d,before,after,event,delivered:o.delivered(after)});
  }
  assert(goal(s),'Replay did not reach declared goal');return {state:s,rows};
}
function initialAccess(e,o){
  const queue=[{s:e.cloneState(e.initialState),path:''}],seen=new Set([e.stateKey(e.initialState)]);
  for(let i=0;i<queue.length;i++){
    const {s,path:prefix}=queue[i];
    if(e.isSolved(s))return {alreadyUsable:false,gemByWalking:true,path:prefix,visited:seen.size};
    for(const [d,delta]of Object.entries(D)){
      const t=e.cloneState(s),before=o.snap(s),r=e.move(t,...delta);if(!r.moved)continue;
      const event=o.event(before,o.snap(t),...delta);
      if(event.use)return {alreadyUsable:true,gemByWalking:false,path:prefix+d,visited:seen.size};
      if(event.moved.length)continue;const key=e.stateKey(t);
      if(!seen.has(key)){seen.add(key);queue.push({s:t,path:prefix+d});}
    }
  }
  return {alreadyUsable:false,gemByWalking:false,visited:seen.size,exhausted:true};
}
function args(argv=process.argv.slice(2)){
  const r={};assert(argv.length%2===0,'Arguments must be --key VALUE pairs');
  for(let i=0;i<argv.length;i+=2){assert(/^--[a-z-]+$/.test(argv[i])&&!Object.hasOwn(r,argv[i].slice(2)),'Invalid or repeated option');r[argv[i].slice(2)]=argv[i+1];}
  return r;
}
module.exports={D,read,digest,footprint,validate,services,load,stateRecord,observer,restrict,replay,initialAccess,args};
