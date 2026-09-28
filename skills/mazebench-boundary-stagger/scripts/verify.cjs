// Shape-agnostic within a deliberately narrow planar profile. No alternate physics.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {D,load,observer,restrict,validatePlanar}=require('./runtime.cjs');
const {controls}=require('./controls.cjs');
async function verify(repo,out,cap=300000,reportName='verification.json'){
 const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
 const world=read('world.json'),c=read('contract.json'),cells=validatePlanar(world,c);
 assert(Number.isInteger(cap)&&cap>0);assert(path.basename(reportName)===reportName);
 const {engine:e,solver}=load(repo,cells),v=observer(e,c.pair),initial=v.snap(e.initialState);
 assert.deepEqual(e.loadWarnings,[]);assert.equal(initial.filter(x=>x.type==='player').length,1);assert.equal(initial.filter(x=>x.type==='gem').length,1);
 assert(c.pair.every(g=>v.group(initial,g).length));v.intact(initial,initial);
 const solve=engine=>solver.solveWithAStar(engine,{algorithm:'astar',maxExpandedStates:cap});
 const verdict=(r,want)=>r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown';
 const predicates={no_offset:f=>f.offsetChanged,no_boxes:f=>f.moved.length>0};
 for(const g of c.pair)predicates['no_'+g]=f=>f.moved.includes(g);
 // Optional task-specific exclusions. These are not universal movement rules.
 for(const rule of c.directionChecks||[]){assert(D[rule.direction]&&c.pair.includes(rule.group));
  predicates[rule.name]=(f,a,b,dx,dy)=>f.moved.includes(rule.group)&&D[rule.direction][0]===dx&&D[rule.direction][1]===dy;
 }
 const report={profile:c.profile,pair:c.pair,cap,warnings:e.loadWarnings,initial,solution:await solve(e),checks:[],trace:[],pushes:[]};
 function replay(result,start=e.initialState,reject=()=>false,goal=e.isSolved){
  const s=e.cloneState(start),rows=[];
  for(const [i,d]of [...result.path].entries()){
   const before=v.snap(s),r=e.move(s,...D[d]);assert(r.moved,'Illegal replay input');const after=v.snap(s),event=v.event(before,after,...D[d]);v.intact(before,after);
   assert(!reject(event,before,after,...D[d]),'Replay violated restriction');rows.push({step:i+1,d,before,after,event});
  }assert(goal(s));return {state:s,rows};
 }
 const gem=initial.find(a=>a.type==='gem'),targets=Array.from({length:256},(_,i)=>({id:String(i),x:i%16,y:Math.floor(i/16),elevation:0}));
 async function walking(s){
  const r=await solver.findReachablePositions(restrict(e,v,predicates.no_boxes,s),targets,{maxExpandedStates:cap});
  return {status:r.status,expanded:r.expanded,reachable:r.reachable.map(p=>[p.x,p.y,p.elevation]),
   gemReachable:r.reachable.some(p=>p.x===gem.x&&p.y===gem.y&&p.elevation===gem.z)};
 }
 if(report.solution.status==='solved'){
  report.trace=replay(report.solution).rows;report.replayPassed=true;
  const s=e.cloneState(e.initialState);let previous=await walking(s);report.initialWalking=previous;
  for(const row of report.trace){
   e.move(s,...D[row.d]);if(!row.event.moved.length)continue;
   const after=await walking(s),old=new Set(previous.reachable.map(p=>p.join(','))),now=new Set(after.reachable.map(p=>p.join(',')));
   report.pushes.push({step:row.step,d:row.d,event:row.event,before:row.before,after:row.after,
    walkingBefore:previous,walkingAfter:after,newlyReachable:after.reachable.filter(p=>!old.has(p.join(','))),lostReachable:previous.reachable.filter(p=>!now.has(p.join(',')))});
   previous=after;
  }
  report.firstGoalOpening=report.pushes.find(p=>!p.walkingBefore.gemReachable&&p.walkingAfter.gemReachable)?.step??null;
  assert(report.pushes.some(p=>p.event.offsetChanged),'Solution did not change pair-relative offsets');
  const complete=report.pushes.every(p=>[p.walkingBefore,p.walkingAfter].every(w=>['exhausted','found_all'].includes(w.status)));
  report.walkingVerdict=report.firstGoalOpening!==null&&complete?'passed':complete?'failed':'unknown';
 }
 for(const [rule,predicate]of Object.entries(predicates)){
  const r=await solve(restrict(e,v,predicate)),entry={rule,...r,verdict:verdict(r,'unsolved')};
  if(r.status==='solved'){replay(r,e.initialState,predicate);entry.replayPassed=true;}
  report.checks.push(entry);
 }
 // Case-specific prefix check: can the first DECLARED DIRECTIONAL motion occur
 // without its declared preparation? Other directions remain legal.
 report.preparation=[];
 for(const claim of c.preparationChecks||[]){
  const {before,prepare}=claim;assert(c.pair.includes(before.group)&&c.pair.includes(prepare.group)&&D[before.direction]&&D[prepare.direction]);
  const matches=(f,dx,dy,q)=>f.moved.includes(q.group)&&D[q.direction][0]===dx&&D[q.direction][1]===dy;
  const boundary=s=>Object.values(D).some(dir=>{const q=e.cloneState(s),a=v.snap(q),r=e.move(q,...dir);return r.moved&&matches(v.event(a,v.snap(q),...dir),...dir,before);});
  const goal=s=>e.isSolved(s)||boundary(s),stop=(f,a,b,dx,dy)=>matches(f,dx,dy,before),cut=(f,a,b,dx,dy)=>stop(f,a,b,dx,dy)||matches(f,dx,dy,prepare);
  const item={name:claim.name,before,prepare,definition:'Goal is gem OR legal first declared motion; event edges excluded. A reached event boundary is not automatically a complete bypass.',checks:[]};
  for(const [name,predicate,want]of [['positive_boundary',stop,'solved'],['without_preparation',cut,claim.expected||'unsolved']]){
   const r=await solve(restrict(e,v,predicate,e.initialState,goal)),row={name,...r,verdict:verdict(r,want)};
   if(r.status==='solved'){const q=replay(r,e.initialState,predicate,goal);row.replayPassed=true;row.endpoint=e.isSolved(q.state)?'gem':'first-group-motion-boundary';}
   item.checks.push(row);
  }
  report.preparation.push(item);
 }
 const crossClaims=(c.preparationChecks||[]).filter(p=>p.before.group!==p.prepare.group&&(p.expected||'unsolved')==='unsolved');
 // Do not combine an access dependency with an unrelated wall probe. Require
 // the SAME wall intervention to admit a group push and a full goal bypass
 // when a preparation for the same cross-group-dependent event is forbidden.
 const wallKey=walls=>JSON.stringify(walls.map(p=>p.join(',')).sort());
 const linked=(c.wallBypasses||[]).filter(b=>{
  const rule=(c.directionChecks||[]).find(r=>r.name===b.forbid);
  const relevant=(c.preparationChecks||[]).some(p=>(p.expected||'unsolved')==='unsolved'&&rule&&p.prepare.group===rule.group&&p.prepare.direction===rule.direction&&
   crossClaims.some(q=>q.before.group===p.before.group&&q.before.direction===p.before.direction));
  return relevant&&
   (c.wallProbes||[]).some(p=>wallKey(p.walls)===wallKey(b.walls));
 });
 if(linked.length){const boundary=await controls(repo,out,cap);report.boundaryEvidence={status:boundary.overall,file:'controls.json',linkedBypasses:linked.map(b=>b.name)};}
 else report.boundaryEvidence={status:'unknown',reason:'Missing linked boundary evidence: the same wall intervention must enable a group push and permit a full-goal bypass without a preparation for a cross-group-dependent event. Base offset and unrelated wall checks alone are insufficient.'};
 report.acceptanceScope='Declared planar contract checks, not an automatic universal classifier of shape quality or human reasoning. Review the functional geometry and intervention side effects.';
 report.firstGoalOpeningScope=report.walkingVerdict==='passed'?'Verified along this replay':'Provisional or unavailable: frozen walking search incomplete';
 const outcomes=[...report.checks,...report.preparation.flatMap(p=>p.checks)].map(x=>x.verdict).concat(report.walkingVerdict||'unknown',report.boundaryEvidence.status);
 report.overall=outcomes.includes('failed')||report.solution.status==='unsolved'?'failed':outcomes.includes('unknown')||!report.replayPassed?'unknown':'passed';
 fs.writeFileSync(path.join(out,reportName),JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module){const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
 assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out GENERATED');
 verify(get('--repo'),get('--out'),Number(get('--cap',300000)),get('--report','verification.json')).then(r=>{
  console.log(JSON.stringify({solution:r.solution,checks:r.checks,preparation:r.preparation,firstGoalOpening:r.firstGoalOpening,overall:r.overall}));if(r.overall!=='passed')process.exitCode=1;
 }).catch(e=>{console.error(e);process.exitCode=1;});
}
module.exports={verify};
