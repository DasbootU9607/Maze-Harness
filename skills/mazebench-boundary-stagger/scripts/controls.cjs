// Deliberate counterfactuals, separate from the delivered map's official rules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {D,load,observer,restrict,validatePlanar}=require('./runtime.cjs');
async function controls(repo,out,cap=300000){
 assert(Number.isInteger(cap)&&cap>0,'Cap must be a positive integer');
 const read=n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8')),world=read('world.json'),c=read('contract.json'),cells=validatePlanar(world,c);
 const report={scope:'Controlled wall changes and particular error states; no global wall or shape minimality claim.',cap,wallProbes:[],wallBypasses:[],recovery:[]};
 const solve=(solver,e)=>solver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:cap});
 const outcome=(r,want)=>r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown';
 function replay(e,v,p,start=e.initialState,predicate=()=>false){const s=e.cloneState(start);for(const d of p){const a=v.snap(s),r=e.move(s,...D[d]);assert(r.moved);const b=v.snap(s);v.intact(a,b);assert(!predicate(v.event(a,b,...D[d]),a,b,...D[d]));}return s;}
 const altered=walls=>{const board=cells.map(r=>r.slice());for(const [x,y]of walls){assert(['#','.+#'].includes(board[y][x]));board[y][x]='.';}return board;};
 for(const probe of c.wallProbes||[]){
  const entries=[];
  for(const modified of [false,true]){
   const {engine:e}=load(repo,modified?altered(probe.walls):cells),v=observer(e,c.pair),s=replay(e,v,probe.prefix);
   const before=v.snap(s),r=e.move(s,...D[probe.action]),after=v.snap(s);v.intact(before,after);
   entries.push({modified,before,after,moved:!!r.moved,event:v.event(before,after,...D[probe.action])});
  }
  assert.deepEqual(entries[0].before,entries[1].before,'Wall comparison changed pre-action actors');
  assert(!entries[0].moved&&entries[1].moved,'Expected blocked original and admitted counterfactual');
  assert.deepEqual(entries[0].before,entries[0].after,'Blocked probe changed actor state');
  assert(entries[1].event.moved.some(g=>c.pair.includes(g))&&c.pair.includes(entries[1].event.primary),'Wall probe must enable a group push, not ordinary player walking');
  assert.deepEqual([...entries[1].event.moved].sort(),[...probe.expectedGroups].sort(),'Counterfactual moved unexpected groups');
  assert.equal(entries[1].event.primary,probe.primary,'Wrong directly pushed group');
  report.wallProbes.push({...probe,entries,status:'passed',interpretation:'Same player and objects; named walls change this local move. Other routes may also change.'});
 }
 for(const item of c.wallBypasses||[]){
  const rule=c.directionChecks.find(r=>r.name===item.forbid);assert(rule);
  const predicate=(f,a,b,dx,dy)=>f.moved.includes(rule.group)&&D[rule.direction][0]===dx&&D[rule.direction][1]===dy;
  const pairs=[];
  for(const modified of [false,true]){
   const {engine:e,solver}=load(repo,modified?altered(item.walls):cells),v=observer(e,c.pair),r=await solve(solver,restrict(e,v,predicate));
   const row={modified,...r,verdict:outcome(r,modified?'solved':'unsolved')};
   if(r.status==='solved'){assert(e.isSolved(replay(e,v,r.path,e.initialState,predicate)));row.replayPassed=true;}
   pairs.push(row);
  }
  report.wallBypasses.push({...item,pairs,interpretation:'Deleting walls changes clearance and possibly stance reachability. A bypass under the named restriction does not establish global shape uniqueness.'});
 }
 for(const wrongPath of c.recoveryPaths||[]){
  const {engine:e,solver}=load(repo,cells),v=observer(e,c.pair),s=e.cloneState(e.initialState),history=[];
  for(const d of wrongPath){const r=e.move(s,...D[d]);assert(r.moved);history.push(r);}
  const deadState=v.snap(s),deadlock=await solve(solver,{...e,initialState:e.cloneState(s)});
  e.undoMove(s,history.at(-1));const undoState=v.snap(s),recovery=await solve(solver,{...e,initialState:e.cloneState(s)});
  const row={wrongPath,deadState,deadlock,deadlockVerdict:outcome(deadlock,'unsolved'),undoState,recovery,undoVerdict:outcome(recovery,'solved')};
  if(recovery.status==='solved'){assert(e.isSolved(replay(e,v,recovery.path,s)));row.replayPassed=true;}
  report.recovery.push(row);
 }
 const statuses=[...report.wallProbes.map(r=>r.status),...report.wallBypasses.flatMap(r=>r.pairs.map(p=>p.verdict)),...report.recovery.flatMap(r=>[r.deadlockVerdict,r.undoVerdict])];
 report.overall=statuses.includes('failed')?'failed':!statuses.length||statuses.includes('unknown')?'unknown':'passed';
 fs.writeFileSync(path.join(out,'controls.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module){const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
 assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out GENERATED');
 controls(get('--repo'),get('--out'),Number(get('--cap',300000))).then(r=>{console.log(JSON.stringify({wallProbes:r.wallProbes.length,wallBypasses:r.wallBypasses.length,recovery:r.recovery.length,overall:r.overall}));if(r.overall!=='passed')process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
}
module.exports={controls};
