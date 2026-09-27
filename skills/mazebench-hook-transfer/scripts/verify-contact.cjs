const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {D,inspector}=require('./contact-events.cjs');
async function verify(repo,out,cap=300000,reportName='verification.json',options={}){
 repo=path.resolve(repo);out=path.resolve(out);
 assert(Number.isInteger(cap)&&cap>0);assert(path.basename(reportName)===reportName&&reportName.endsWith('.json'));
 const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 const c=JSON.parse(fs.readFileSync(path.join(out,'contract.json'),'utf8'));
 // Task goals and postconditions below are for this declared pattern only.
 assert.equal(c.pattern,'active-side-reach','verify-contact supports only the active-side-reach plate contract; use a matching verifier for rear or mixed tasks');
 assert.equal(c.eventKind,'sideTransfer');
 const contrastNoRear=options.contrastNoRear??false;
 assert.equal(typeof contrastNoRear,'boolean');
 const {getGame,getLevelState}=require(path.join(repo,'server/app'));
 global.window=global.window||{};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
 const game=getGame(m.id),e=window.MazeEngine.createEngine(getLevelState(game,game.worldMap.byPosition.get('level_AxA')));
 const v=inspector(e,c),solver=window.MazeSolver;
 assert.deepEqual(e.loadWarnings,[]);const initial=v.snap(e.initialState);
 assert.equal(initial.filter(x=>x.type==='player').length,1);assert.equal(initial.filter(x=>x.type==='gem').length,1);
 assert.equal(new Set(initial.filter(x=>x.group).map(x=>x.group)).size,2);
 for(const g of [c.toolGroup,c.targetGroup])assert(v.group(initial,g).length>0);
 const verdict=(r,want)=>r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown';
 const prefixRules=['no_independent_preparation','no_tool_preparation','no_alignment'];
 function reject(rule,f){
  if(rule==='no_event')return f.event;
  if(rule==='no_rear')return f.rearTransfer;
  if(rule==='no_tool')return f.moved.includes(c.toolGroup);
  if(rule==='no_target')return f.moved.includes(c.targetGroup);
  if(rule==='no_boxes')return f.moved.length>0;
  if(prefixRules.includes(rule))return f.event||
   (rule==='no_independent_preparation'&&f.independent)||
   (rule==='no_tool_preparation'&&f.independent&&f.moved.includes(c.toolGroup))||
   (rule==='no_alignment'&&!f.candidatesBefore.length&&f.candidatesAfter.length>0);
  throw new Error('Unknown restriction '+rule);
 }
 function wrapped(rule,start=e.initialState){const w={...e,initialState:start,moveForSearch(s,dx,dy){
  const a=v.snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
  if(reject(rule,v.classify(a,v.snap(s),r,dx,dy))){e.undoMove(s,r);return {moved:false};}return r;
 }};
  // Search only prefixes ending before their FIRST mechanism event.
  // Never place unsnapshotted history flags in the official A* state.
  if(prefixRules.includes(rule)){w.isSolved=s=>e.isSolved(s)||v.legalEvents(s).length>0;w.heuristic=()=>0;}
  return w;
 }
 function replay(result,start=e.initialState,rule=null,goal=e.isSolved){
  const s=e.cloneState(start),rows=[];
  for(const [i,d]of [...result.path].entries()){
   const before=v.snap(s),r=e.move(s,...D[d]);assert(r.moved);const after=v.snap(s),flags=v.classify(before,after,r,...D[d]);
   if(rule)assert(!reject(rule,flags));
   for(const g of [c.toolGroup,c.targetGroup]){
    const a=v.group(before,g),b=v.group(after,g);assert.equal(a.length,b.length);assert(b.every(x=>x.z===c.boxElevation));
    const shape=a=>a.map(x=>[x.x-a[0].x,x.y-a[0].y,x.z-a[0].z]);assert.deepEqual(shape(a),shape(b));
   }
   rows.push({step:i+1,d,before,after,flags,buttonsPressed:e.areOrangeButtonsPressed(s)});
  }assert(goal(s));assert(v.snap(s).some(x=>x.type==='player'&&!x.removed));return {s,rows};
 }
 const report={draft:m.id,contract:c,cap,verificationScope:{profile:'active-side-reach plate',contrastNoRear},engine:'official MazeEngine + MazeSolver; normal move replay',warnings:e.loadWarnings,
  initial,initialContactCandidates:v.candidates(initial),initialLegalEvents:v.legalEvents(e.initialState),
  solution:await solver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:cap}),trace:[],checks:[]};
 assert.deepEqual(report.initialContactCandidates,[],'Active pattern may not begin aligned');
 assert.deepEqual(report.initialLegalEvents,[]);
 let beforeEvent,afterEvent,dockState;
 const solve=w=>solver.solveWithAStar(w,{algorithm:'astar',maxExpandedStates:cap});
 if(report.solution.status==='solved'){
  const {rows}=replay(report.solution);report.trace=rows;report.replayPassed=true;
  const first=rows.find(r=>r.flags.event),prep=rows.find(r=>r.flags.independent&&r.flags.moved.includes(c.toolGroup));
  const dock=rows.find(r=>!r.flags.candidatesBefore.length&&r.flags.candidatesAfter.length);
  assert(first&&prep&&dock&&prep.step<=dock.step&&dock.step<first.step);
  // Optional historical comparison, not a requirement of hook design or even
  // a general definition of side contact (rear and side predicates can overlap).
  if(contrastNoRear)assert(!rows.some(r=>r.flags.rearTransfer),'Requested no-rear comparison failed');
  assert.notDeepEqual(prep.flags.relativeBefore,prep.flags.relativeAfter);
  assert(rows.slice(0,first.step-1).every(r=>!r.flags.moved.includes(c.targetGroup)));
  const phase=(name,step,a)=>({name,step,player:a.filter(x=>x.type==='player'),tool:v.group(a,c.toolGroup),target:v.group(a,c.targetGroup)});
  report.phases=[phase('initial-separated',0,initial),phase('independent-transport',prep.step,prep.after),
   phase('alignment-established',dock.step,dock.after),phase('first-side-transfer',first.step,first.after),phase('gem-collected',rows.length,rows.at(-1).after)];
  const q=e.cloneState(e.initialState);
  for(const row of rows){if(row.step===first.step)beforeEvent=e.cloneState(q);e.move(q,...D[row.d]);
   if(row.step===dock.step)dockState=e.cloneState(q);if(row.step===first.step)afterEvent=e.cloneState(q);}
  assert(!e.areOrangeButtonsPressed(beforeEvent)&&e.areOrangeButtonsPressed(afterEvent));
  assert(v.group(v.snap(afterEvent),c.targetGroup).some(x=>[x.x,x.y,x.z].every((n,i)=>n===c.destination[i])));
  report.event=first;
  // Same physical states, boxes frozen: did contact make the task reachable?
  report.frozenBefore={...await solve(wrapped('no_boxes',beforeEvent))};
  report.frozenAfter={...await solve(wrapped('no_boxes',afterEvent))};
  if(report.frozenAfter.status==='solved'){replay(report.frozenAfter,afterEvent,'no_boxes');report.frozenAfter.replayPassed=true;}
  report.frozenBefore.verdict=verdict(report.frozenBefore,'unsolved');report.frozenAfter.verdict=verdict(report.frozenAfter,'solved');
  const [x,y,elevation]=c.actuationStand;
  report.dockedStand=await solver.findReachablePositions(wrapped('no_boxes',dockState),[{id:'actuation',x,y,elevation}],{maxExpandedStates:cap});
  if(report.dockedStand.reachable.length){
   const r=report.dockedStand.reachable[0];const {s}=replay(r,dockState,'no_boxes',s=>v.legalEvents(s).includes(c.direction));
   const a=v.snap(s),move=e.move(s,...D[c.direction]);assert(v.classify(a,v.snap(s),move,...D[c.direction]).event);
   report.dockedStand.replayPassed=true;
  }
 }
 for(const rule of ['no_event','no_tool','no_target',...prefixRules,...(contrastNoRear?['no_rear']:[])]){
  const w=wrapped(rule),r=await solve(w),want=rule==='no_rear'?'solved':'unsolved';
  const row={rule,method:prefixRules.includes(rule)?'Prefix cut: gem OR a legal first event boundary; event edges excluded':'Full goal with named transitions deleted',...r,verdict:verdict(r,want)};
  if(r.status==='solved'){const {s}=replay(r,e.initialState,rule,w.isSolved);row.replayPassed=true;row.endpoint=e.isSolved(s)?'gem':'first-event-boundary';}
  report.checks.push(row);
 }
 const positive=wrapped('no_event');positive.isSolved=s=>v.legalEvents(s).length>0;positive.heuristic=()=>0;
 report.boundaryPositiveControl=await solve(positive);
 if(report.boundaryPositiveControl.status==='solved'){replay(report.boundaryPositiveControl,e.initialState,'no_event',positive.isSolved);report.boundaryPositiveControl.replayPassed=true;}
 const [x,y,elevation]=c.directStand;
 report.directStand=await solver.findReachablePositions(wrapped('no_target'),[{id:'direct-push',x,y,elevation}],{maxExpandedStates:cap});
 report.directStand.verdict=report.directStand.reachable.length?'failed':report.directStand.status==='exhausted'?'passed':'unknown';
 const outcomes=[...report.checks.map(r=>r.verdict),report.directStand.verdict,verdict(report.boundaryPositiveControl,'solved'),
  report.frozenBefore?.verdict??'unknown',report.frozenAfter?.verdict??'unknown',report.dockedStand?.replayPassed?'passed':'unknown'];
 report.overall=outcomes.includes('failed')||report.solution.status==='unsolved'?'failed':outcomes.includes('unknown')||!report.replayPassed?'unknown':'passed';
 fs.writeFileSync(path.join(out,reportName),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({draft:m.id,solution:report.solution,checks:report.checks,directStand:report.directStand,overall:report.overall}));return report;
}
if(require.main===module){const a=process.argv.slice(2),get=(k,f)=>a.includes(k)?a[a.indexOf(k)+1]:f;
 assert(get('--out'));verify(get('--repo',process.cwd()),get('--out'),Number(get('--cap',300000)),get('--report','verification.json'),{contrastNoRear:a.includes('--contrast-no-rear')})
 .then(r=>{if(r.overall!=='passed')process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={verify};
