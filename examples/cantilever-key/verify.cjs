const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out GENERATED');
const repo=path.resolve(get('--repo')),out=path.resolve(get('--out'));
const {D,inspector}=require('../../skills/mazebench-hook-transfer/scripts/contact-events.cjs');
const {getGame,getLevelState}=require(path.join(repo,'server/app'));
global.window={};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')),c=JSON.parse(fs.readFileSync(path.join(out,'contract.json'),'utf8'));
const game=getGame(m.id),level=getLevelState(game,game.worldMap.byPosition.get('level_AxA'));
const e=window.MazeEngine.createEngine(level),v=inspector(e,c),solver=window.MazeSolver;
const cap=Number(get('--cap',300000)),prefixRules=['no_independent_preparation','no_tool_preparation','no_alignment'];
const verdict=(r,want)=>r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown';
function reject(rule,f){
 if(rule==='no_event')return f.event;
 if(rule==='no_tool')return f.moved.includes(c.toolGroup);
 if(rule==='no_target')return f.moved.includes(c.targetGroup);
 if(rule==='no_boxes')return f.moved.length>0;
 if(prefixRules.includes(rule))return f.event||
  (rule==='no_independent_preparation'&&f.independent)||
  (rule==='no_tool_preparation'&&f.independent&&f.moved.includes(c.toolGroup))||
  (rule==='no_alignment'&&!f.candidatesBefore.length&&f.candidatesAfter.length>0);
 throw Error('Unknown rule '+rule);
}
function wrapped(rule,start=e.initialState){const w={...e,initialState:start,moveForSearch(s,dx,dy){
 const a=v.snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
 if(reject(rule,v.classify(a,v.snap(s),r,dx,dy))){e.undoMove(s,r);return {moved:false};}return r;
 }};
 if(prefixRules.includes(rule)){w.isSolved=s=>e.isSolved(s)||v.legalEvents(s).length>0;w.heuristic=()=>0;}return w;
}
function replay(result,start=e.initialState,rule=null,goal=e.isSolved){
 const s=e.cloneState(start),rows=[];
 for(const [i,d]of [...result.path].entries()){
  const before=v.snap(s),r=e.move(s,...D[d]);assert(r.moved);const after=v.snap(s),flags=v.classify(before,after,r,...D[d]);
  if(rule)assert(!reject(rule,flags));
  for(const g of [c.toolGroup,c.targetGroup]){const a=v.group(before,g),b=v.group(after,g);assert.equal(a.length,b.length);assert(b.every(x=>x.z===0));
   const shape=a=>a.map(x=>[x.x-a[0].x,x.y-a[0].y,x.z-a[0].z]);assert.deepEqual(shape(a),shape(b));}
  assert(after.some(x=>x.type==='player'&&!x.removed));
  rows.push({step:i+1,d,before,after,flags,buttonsPressed:e.areOrangeButtonsPressed(s)});
 }assert(goal(s));return {s,rows};
}
const solve=w=>solver.solveWithAStar(w,{algorithm:'astar',maxExpandedStates:cap});
async function verify(){
 assert.deepEqual(e.loadWarnings,[]);
 const initial=v.snap(e.initialState),report={draft:m.id,cap,engine:'official MazeEngine + MazeSolver; ordinary move replay',warnings:e.loadWarnings,
  initial,initialContactCandidates:v.candidates(initial),initialLegalEvents:v.legalEvents(e.initialState),checks:[]};
 assert.equal(report.initialContactCandidates.length,0);assert.equal(report.initialLegalEvents.length,0);
 // Local core check deliberately precedes solving. These manually placed
 // actors are a prototype only, never counted as a legal transport route.
 const core=e.cloneState(e.initialState);
 for(const a of v.group(initial,c.toolGroup)){core.actorX[a.i]+=4;core.actorY[a.i]-=3;}
 const player=initial.find(a=>a.type==='player');core.actorX[player.i]=7;core.actorY[player.i]=9;
 const before=v.snap(core),cr=e.move(core,0,-1),after=v.snap(core),cf=v.classify(before,after,cr,0,-1);
 report.corePrototype={before,after,result:cr,flags:cf,button:e.areOrangeButtonsPressed(core)};
 assert(cf.event&&report.corePrototype.button);assert.equal(cf.primary,'M2');
 report.solution=await solve(e);
 if(report.solution.status==='solved'){
  const {rows}=replay(report.solution);report.trace=rows;report.replayPassed=true;
  const first=rows.find(r=>r.flags.event),prep=rows.find(r=>r.flags.independent&&r.flags.moved.includes('M2'));
  const dock=rows.find(r=>!r.flags.candidatesBefore.length&&r.flags.candidatesAfter.length);
  assert(first&&prep&&dock&&prep.step<=dock.step&&dock.step<first.step);
  assert.notDeepEqual(prep.flags.relativeBefore,prep.flags.relativeAfter);
  assert(rows.slice(0,first.step-1).every(r=>!r.flags.moved.includes('M3')));
  report.event=first;
  const phase=(name,step,a)=>({name,step,player:a.filter(x=>x.type==='player'),tool:v.group(a,'M2'),target:v.group(a,'M3')});
  report.phases=[phase('initial-separated',0,initial),phase('independent-transport',prep.step,prep.after),
   phase('alignment-established',dock.step,dock.after),phase('side-transfer',first.step,first.after),phase('gem-collected',rows.length,rows.at(-1).after)];
  const q=e.cloneState(e.initialState);let pre,post,dockState;
  for(const row of rows){if(row.step===first.step)pre=e.cloneState(q);e.move(q,...D[row.d]);if(row.step===first.step)post=e.cloneState(q);if(row.step===dock.step)dockState=e.cloneState(q);}
  assert(!e.areOrangeButtonsPressed(pre)&&e.areOrangeButtonsPressed(post));
  assert(v.group(v.snap(post),'M3').some(a=>a.x===10&&a.y===5&&a.z===0));
  report.frozenBefore=await solve(wrapped('no_boxes',pre));report.frozenBefore.verdict=verdict(report.frozenBefore,'unsolved');
  report.frozenAfter=await solve(wrapped('no_boxes',post));report.frozenAfter.verdict=verdict(report.frozenAfter,'solved');
  if(report.frozenAfter.status==='solved'){replay(report.frozenAfter,post,'no_boxes');report.frozenAfter.replayPassed=true;}
  report.dockedStand=await solver.findReachablePositions(wrapped('no_boxes',dockState),[{id:'actuation',x:7,y:9,elevation:0}],{maxExpandedStates:cap});
  if(report.dockedStand.reachable.length){const r=report.dockedStand.reachable[0],{s}=replay(r,dockState,'no_boxes',s=>v.legalEvents(s).includes('U'));
   const a=v.snap(s),move=e.move(s,0,-1);assert(v.classify(a,v.snap(s),move,0,-1).event);report.dockedStand.replayPassed=true;}
 }
 for(const rule of ['no_event','no_tool','no_target',...prefixRules]){
  const w=wrapped(rule),r=await solve(w),row={rule,method:prefixRules.includes(rule)?'First-event prefix cut: gem OR legal event boundary; event edges excluded':'Full goal with named transitions deleted',...r,verdict:verdict(r,'unsolved')};
  if(r.status==='solved'){const {s}=replay(r,e.initialState,rule,w.isSolved);row.replayPassed=true;row.endpoint=e.isSolved(s)?'gem':'first-event-boundary';}report.checks.push(row);
 }
 const positive=wrapped('no_event');positive.isSolved=s=>v.legalEvents(s).length>0;positive.heuristic=()=>0;
 report.boundaryPositiveControl=await solve(positive);
 if(report.boundaryPositiveControl.status==='solved'){replay(report.boundaryPositiveControl,e.initialState,'no_event',positive.isSolved);report.boundaryPositiveControl.replayPassed=true;}
 report.directStands=await solver.findReachablePositions(wrapped('no_target'),[
  {id:'north-push-from-south',x:10,y:7,elevation:0},{id:'south-push-from-north',x:10,y:5,elevation:0},
  {id:'east-push-from-west',x:9,y:6,elevation:0},{id:'west-push-from-east',x:11,y:6,elevation:0}],{maxExpandedStates:cap});
 report.directStands.verdict=report.directStands.reachable.length?'failed':report.directStands.status==='exhausted'?'passed':'unknown';
 const outcomes=[...report.checks.map(r=>r.verdict),report.directStands.verdict,verdict(report.boundaryPositiveControl,'solved'),
  report.frozenBefore?.verdict??'unknown',report.frozenAfter?.verdict??'unknown',report.dockedStand?.replayPassed?'passed':'unknown'];
 report.overall=outcomes.includes('failed')||report.solution.status==='unsolved'?'failed':outcomes.includes('unknown')||!report.replayPassed?'unknown':'passed';
 fs.writeFileSync(path.join(out,cap===1?'verification-cap1.json':'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({draft:m.id,solution:report.solution,checks:report.checks,directStands:report.directStands,overall:report.overall}));
 return report;
}
if(require.main===module)verify().then(r=>{if(r.overall!=='passed')process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={e,v,D,level,solver,solve,replay,wrapped,verify,repo,out};
