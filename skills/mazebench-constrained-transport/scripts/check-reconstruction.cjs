// Replays and audits a bundled reference using the external official engine.
// It never edits the reference, an existing draft, or the engine.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out NEW_OUTPUT [--cap N] [--mode replay]');
const repo=path.resolve(get('--repo')),out=path.resolve(get('--out')),cap=Number(get('--cap',1000000));
assert(['full','replay'].includes(get('--mode','full')),'Mode must be full or replay');
assert(Number.isInteger(cap)&&cap>0);assert(!fs.existsSync(out),'Preserve existing reports: choose a new output directory');
const root=path.resolve(__dirname,'..'),folder=fs.existsSync(path.join(root,'examples/reconstruction/case.json'))?'examples/reconstruction':'assets/gxf';
const base=path.join(root,folder),read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8')),c=read('case.json');
const cells=c.world?read(c.world).levels[0].cells:read(c.spec).cells;
assert(cells.length===16&&cells.every(r=>r.length===16));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(hash(JSON.stringify(cells)),c.cellsSha256,'Bundled reference changed; reanalyse before updating its claims');
const rawPath=path.join(base,'level_AxA.txt');
if(fs.existsSync(rawPath))assert.equal(hash(fs.readFileSync(rawPath)),c.source.rawSha256,'Saved source fingerprint changed');
const gamesDir=path.join(repo,'games'),support=require(path.join(repo,'server/support'));
const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map'));
const {createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,
 loadText:()=>cells.map(r=>r.join(' ')).join('\n'),buildGameAssetUrl:(id,p)=>`/assets/${id}/${p}`,
 resolveGameAssetPath:(id,p)=>path.join(gamesDir,id,p),buildMazePreviewData:()=>({previewUrl:null})});
const {getGame}=require(path.join(repo,'server/app'));
global.window=global.window||{};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
const e=window.MazeEngine.createEngine(levels.getLevelState(getGame('maze'),{id:'level_AxA',fileName:'reference.txt',label:'AxA'}));
assert.deepEqual(e.loadWarnings,[]);
const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i]||null,x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
const group=(a,g)=>a.filter(x=>x.group===g&&!x.removed),initial=snap(e.initialState);
assert.equal(initial.filter(x=>x.type==='player').length,1);
assert(initial.every(x=>['player','gem','weightless_box'].includes(x.type)&&x.z===0&&!x.removed),'Reference checker covers planar player/gem/rigid groups');
assert(['gem','reach'].includes(c.goal.kind));
if(c.goal.kind==='gem')assert.equal(initial.filter(x=>x.type==='gem').length,1,'A gem objective must contain one gem');
else assert(c.goal.cell?.length===3&&c.goal.cell.every(Number.isInteger),'Declare the passage endpoint explicitly');
const goal=s=>{if(c.goal.kind==='gem')return e.isSolved(s);const p=snap(s).find(x=>x.type==='player'&&!x.removed);return p&&[p.x,p.y,p.z].every((n,i)=>n===c.goal.cell[i]);};
function event(a,b,dx,dy){
 const p=a.find(x=>x.type==='player'&&!x.removed),primary=a.find(x=>x.group&&!x.removed&&x.x===p.x+dx&&x.y===p.y+dy&&x.z===p.z)?.group||null;
 const moved=[...new Set(a.filter(x=>x.group&&!x.removed&&(x.x!==b[x.i].x||x.y!==b[x.i].y||x.z!==b[x.i].z||b[x.i].removed)).map(x=>x.group))];
 const relative=a=>{const x=group(a,c.pair[0])[0],y=group(a,c.pair[1])[0];return x&&y?[y.x-x.x,y.y-x.y,y.z-x.z]:null;};
 let contact=false;
 if(c.hook&&primary===c.hook.tool){
  const translate=id=>group(a,id).every(x=>!b[x.i].removed&&b[x.i].x===x.x+dx&&b[x.i].y===x.y+dy&&b[x.i].z===x.z);
  contact=moved.includes(c.hook.tool)&&moved.includes(c.hook.target)&&translate(c.hook.tool)&&translate(c.hook.target)&&group(a,c.hook.tool).some(h=>group(a,c.hook.target).some(t=>
   h.x+dx===t.x&&h.y+dy===t.y&&h.z===t.z&&(c.hook.kind==='rear'?(t.x-p.x)*dx+(t.y-p.y)*dy<0:(t.x-p.x)*dy-(t.y-p.y)*dx!==0)));
 }
 return {primary,moved,direction:Object.keys(D).find(d=>D[d][0]===dx&&D[d][1]===dy),contact,offsetChanged:JSON.stringify(relative(a))!==JSON.stringify(relative(b))};
}
function reject(r,v){
 if(r.kind==='freeze')return v.moved.includes(r.group);
 if(r.kind==='direction')return v.moved.includes(r.group)&&v.direction===r.direction;
 if(r.kind==='contact')return v.contact;
 if(r.kind==='offset')return v.offsetChanged;
 if(r.kind==='all-motion')return v.moved.length>0;
 if(r.kind==='independent-tool')return v.moved.includes(c.hook.tool)&&!v.moved.includes(c.hook.target);
 throw Error('Unsupported exclusion '+r.kind);
}
function ready(s){return Object.values(D).some(d=>{const q=e.cloneState(s),a=snap(q),r=e.move(q,...d);return r.moved&&event(a,snap(q),...d).contact;});}
function replay(sequence,start=e.initialState,end=goal,cut=()=>false){
 const s=e.cloneState(start),fast=e.cloneState(start),pushes=[];
 for(const [i,d]of [...sequence].entries()){
  assert(D[d]);const a=snap(s),ordinary=e.move(s,...D[d]),search=e.moveForSearch(fast,...D[d]);assert(ordinary.moved&&search.moved,'Blocked replay input');
  const b=snap(s),v=event(a,b,...D[d]);assert(!cut(v),'Replay violates exclusion');
  for(const k of ['actorX','actorY','actorElevation','actorRemoved','terrain','liftRaised'])assert.deepEqual(Array.from(s[k]),Array.from(fast[k]));
  for(const g of [...new Set(initial.map(x=>x.group).filter(Boolean))]){
   const before=group(a,g),after=group(b,g);assert.equal(after.length,before.length);assert(after.every(x=>x.z===0));
   assert.deepEqual(before.map(x=>[x.x-before[0].x,x.y-before[0].y]),after.map(x=>[x.x-after[0].x,x.y-after[0].y]));
  }
  assert(b.some(x=>x.type==='player'&&!x.removed&&x.z===0));if(v.moved.length)pushes.push({step:i+1,d,...v});
 }
 assert(end(s),'Replay missed the declared objective');return {state:s,pushes};
}
(async()=>{
 const witness=replay(c.witness),report={source:c.source,goal:c.goal,cap,fingerprints:{cells:c.cellsSha256},replayPassed:true,inputs:c.witness.length,pushes:witness.pushes,checks:[]};
 for(const f of ['public/maze-engine.js','public/maze-solver.js','server/maze-levels.js','games/maze/level_parsing.json'])report.fingerprints[f]=hash(fs.readFileSync(path.join(repo,f)));
 if(get('--mode')!=='replay')for(const rule of c.checks){
  const start=rule.startStep?replay(c.witness.slice(0,rule.startStep),e.initialState,()=>true).state:e.initialState;
  const end=rule.firstContact?s=>goal(s)||ready(s):goal;
  const cut=v=>(rule.firstContact&&v.contact)||reject(rule,v);
  const wrapped={...e,initialState:start,isSolved:end,heuristic:()=>0,moveForSearch(s,dx,dy){const before=snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;if(cut(event(before,snap(s),dx,dy))){e.undoMove(s,r);return {moved:false};}return r;}};
  const r=await window.MazeSolver.solveWithAStar(wrapped,{algorithm:'astar',maxExpandedStates:cap});
  if(r.status==='solved')replay(r.path,start,end,cut);
  const result={...rule,...r,verdict:r.status===rule.expected?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown'};
  report.checks.push(result);console.log(JSON.stringify({name:rule.name,status:r.status,expanded:r.expanded,verdict:result.verdict}));
 }
 report.overall=report.checks.some(x=>x.verdict==='failed')?'failed':report.checks.some(x=>x.verdict==='unknown')?'unknown':'passed';
 report.scope=get('--mode')==='replay'?'Recorded witness only; no fresh necessity checks':'Explicit exclusions on this reference and objective. A selected post-contact state is not all possible contact states. No optimality or human-difficulty claim.';
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'reference-check.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({overall:report.overall,inputs:report.inputs,pushInputs:report.pushes.length}));if(report.overall!=='passed')process.exitCode=1;
})().catch(err=>{console.error(err.stack);process.exitCode=1});
