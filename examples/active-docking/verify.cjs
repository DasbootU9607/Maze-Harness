const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out GENERATED');
const root=path.resolve(get('--repo')),out=path.resolve(get('--out'));
const {D,inspector}=require('./events.cjs');
const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')),c=JSON.parse(fs.readFileSync(path.join(out,'contract.json'),'utf8'));
const {getGame,getLevelState}=require(path.join(root,'server/app'));
global.window=global.window||{};require(path.join(root,'public/maze-engine'));require(path.join(root,'public/maze-solver'));
const cap=Number(get('--cap',300000)),reportName=get('--report','verification.json');
assert(Number.isInteger(cap)&&cap>0);assert(path.basename(reportName)===reportName&&reportName.endsWith('.json'));
const prefixRules=new Set(['no_preparation_before_first_rear','no_tool_preparation_before_first_rear',
 'no_horizontal_preparation_before_first_rear','no_vertical_preparation_before_first_rear','no_docking_before_first_rear']);
(async()=>{
 const game=getGame(m.id),data=getLevelState(game,game.worldMap.byPosition.get('level_AxA'));
 const e=window.MazeEngine.createEngine(data),v=inspector(e),solver=window.MazeSolver;
 const snapshot=s=>({actors:v.snap(s),liftRaised:!!s.liftRaised[e.cellIndex(...c.liftCell)]});
 const initial=v.snap(e.initialState),initialDock=v.geometry(initial);
 assert.deepEqual(e.loadWarnings,[]);assert.equal(initial.filter(x=>x.type==='gem').length,1);assert.equal(initial.filter(x=>x.type==='player').length,1);
 assert.deepEqual(initialDock,[],'Initial groups are already aligned');
 const groupPos=(a,g)=>a.filter(x=>x.group===g).map(x=>[x.x,x.y,x.z]);
 const phase=(label,step,a)=>({label,step,player:a.filter(x=>x.type==='player').map(x=>[x.x,x.y,x.z])[0],M0:groupPos(a,'M0'),M1:groupPos(a,'M1')});
 const report={draft:m.id,cap,scope:'One sealed authored room; official engine, normal direction actions only.',warnings:e.loadWarnings,
  initial,initialDockGeometry:initialDock,solution:await solver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:cap}),trace:[],phases:[],checks:[]};
 function reject(rule,f,a,dx,dy){
  if(rule==='no_rear')return f.rearTransfer;
  if(rule==='no_hook_motion')return f.moved.includes('M0');
  if(rule==='no_payload_motion')return f.moved.includes('M1');
  if(rule==='no_lift_lower')return f.lowered;
  if(rule==='no_lift_raise')return f.raised;
  if(rule==='no_payload_top_walk')return f.payloadTopWalk;
  if(rule==='no_boxes')return f.moved.length>0;
  if(rule==='no_post_transfer_box_motion')return a.some(x=>x.group==='M1'&&!x.removed&&[x.x,x.y,x.z].every((n,i)=>n===c.transferDestination[i]))&&f.moved.length>0;
  if(prefixRules.has(rule)){
   // Explore only the prefix before its FIRST rear event. isSolved below
   // detects the boundary BEFORE the event, so no history flag is needed.
   if(f.rearTransfer)return true;
   if(rule==='no_preparation_before_first_rear')return f.independent;
   if(rule==='no_tool_preparation_before_first_rear')return f.independent&&f.moved.includes('M0');
   if(rule==='no_horizontal_preparation_before_first_rear')return f.independent&&f.moved.includes('M0')&&dx!==0;
   if(rule==='no_vertical_preparation_before_first_rear')return f.independent&&f.moved.includes('M0')&&dy!==0;
   if(rule==='no_docking_before_first_rear')return !f.dockBefore.length&&f.dockAfter.length>0;
  }
  throw new Error('Unknown rule '+rule);
 }
 function wrapped(rule,start=e.initialState,prefix=prefixRules.has(rule)){
  const w={...e,initialState:start,moveForSearch(s,dx,dy){
   const a=v.snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
   const f=v.classify(a,v.snap(s),r,dx,dy);if(reject(rule,f,a,dx,dy)){e.undoMove(s,r);return {moved:false};}return r;
  }};
  if(prefix){w.isSolved=s=>e.isSolved(s)||v.legalRear(s).length>0;w.heuristic=()=>0;}
  return w;
 }
 const verdict=(r,want)=>r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown';
 if(report.solution.status==='solved'){
  const s=e.cloneState(e.initialState);report.phases.push(phase('initial-separated',0,initial));
  let dockState=null,firstRear=null,dockStep=null,firstPreparation=null;
  for(const [i,d]of [...report.solution.path].entries()){
   const before=snapshot(s),r=e.move(s,...D[d]);assert(r.moved);const after=snapshot(s);
   const flags=v.classify(before.actors,after.actors,r,...D[d]);
   for(const g of ['M0','M1']){const a=groupPos(before.actors,g),b=groupPos(after.actors,g);
    assert(after.actors.filter(x=>x.group===g).every(x=>!x.removed&&x.z===1));
    const rel=a=>a.map(q=>q.map((n,k)=>n-a[0][k]));assert.deepEqual(rel(a),rel(b));}
   const row={step:i+1,d,before,after,flags};report.trace.push(row);
   if(!firstRear&&flags.independent&&flags.moved.includes('M0')){
    assert.equal(flags.primary,'M0');assert.notDeepEqual(flags.relativeBefore,flags.relativeAfter);
    assert.deepEqual(groupPos(before.actors,'M1'),groupPos(after.actors,'M1'));
    if(firstPreparation===null){firstPreparation=i+1;report.phases.push(phase('independent-transport',i+1,after.actors));}
   }
   if(dockStep===null&&!flags.dockBefore.length&&flags.dockAfter.length){
    assert(flags.independent&&flags.moved.includes('M0'),'Docking must be independently prepared');
    dockStep=i+1;dockState=e.cloneState(s);report.phases.push(phase('docking-complete',i+1,after.actors));
   }
   if(firstRear===null&&flags.rearTransfer){firstRear=i+1;report.phases.push(phase('first-rear-transfer',i+1,after.actors));}
  }
  assert(e.isSolved(s));assert(v.snap(s).some(x=>x.type==='player'&&!x.removed));
  assert(firstPreparation!==null&&dockStep!==null&&firstRear!==null&&firstPreparation<=dockStep&&dockStep<firstRear);
  assert(report.trace.slice(0,firstRear-1).every(t=>JSON.stringify(groupPos(t.after.actors,'M1'))===JSON.stringify(groupPos(initial,'M1'))));
  report.phases.push(phase('gem-collected',report.solution.moves,v.snap(s)));report.replayPassed=true;
  report.preparationSteps=report.trace.slice(0,firstRear-1).filter(t=>t.flags.independent&&t.flags.moved.includes('M0')).map(t=>({step:t.step,d:t.d,relativeBefore:t.flags.relativeBefore,relativeAfter:t.flags.relativeAfter}));
  const [x,y,elevation]=c.actuationStand;
  const reach=await solver.findReachablePositions(wrapped('no_boxes',dockState),[{id:'actuation-stand',x,y,elevation}],{maxExpandedStates:cap});
  report.dockedStandReachability=reach;report.dockedStandVerdict=reach.reachable.length?'passed':reach.status==='exhausted'?'failed':'unknown';
  if(reach.reachable.length){
   const q=e.cloneState(dockState);
   for(const d of reach.reachable[0].path){const a=v.snap(q),r=e.move(q,...D[d]);assert(r.moved);assert.equal(v.classify(a,v.snap(q),r,...D[d]).moved.length,0);}
   assert(v.legalRear(q).includes('U'));const a=v.snap(q),r=e.move(q,0,-1);assert(v.classify(a,v.snap(q),r,0,-1).rearTransfer);
   report.dockedStandThenRearReplayPassed=true;
  }
  // Positive control: the boundary goal is actually reachable when preparation
  // is allowed. This catches an accidentally always-false rear detector.
  const positive=wrapped('no_rear');positive.isSolved=s=>v.legalRear(s).length>0;positive.heuristic=()=>0;
  report.firstRearBoundaryControl=await solver.solveWithAStar(positive,{algorithm:'astar',maxExpandedStates:cap});
 }
 for(const rule of ['no_rear',...prefixRules,'no_hook_motion','no_lift_lower','no_lift_raise','no_payload_top_walk','no_post_transfer_box_motion']){
  const intended=rule==='no_post_transfer_box_motion'?'solved':'unsolved',w=wrapped(rule);
  const r=await solver.solveWithAStar(w,{algorithm:'astar',maxExpandedStates:cap});
  const row={rule,intended,method:prefixRules.has(rule)?'First-event prefix cut: goal = gem OR a legal rear action is available; independent/unaligned transitions restricted as named; rear edges excluded.':'Full goal search with only the named transition category removed.',...r,verdict:verdict(r,intended)};
  if(r.status==='solved'){
   const s=e.cloneState(e.initialState);
   for(const d of r.path){const a=v.snap(s),r=e.move(s,...D[d]);assert(r.moved);assert(!reject(rule,v.classify(a,v.snap(s),r,...D[d]),a,...D[d]));}
   assert(w.isSolved(s));row.replayPassed=true;
   row.endpoint=e.isSolved(s)?'gem':'legal-first-rear-boundary';
  }
  report.checks.push(row);
 }
 const [x,y,elevation]=c.unsupportedPushStand;
 report.directPushStand=await solver.findReachablePositions(wrapped('no_payload_motion'),[{id:'direct-north-push',x,y,elevation}],{maxExpandedStates:cap});
 report.directPushStandVerdict=report.directPushStand.status==='exhausted'&&!report.directPushStand.reachable.length?'passed':report.directPushStand.reachable.length?'failed':'unknown';
 const outcomes=[...report.checks.map(c=>c.verdict),report.directPushStandVerdict,report.dockedStandVerdict??'unknown',
  report.firstRearBoundaryControl?verdict(report.firstRearBoundaryControl,'solved'):'unknown'];
 report.overall=outcomes.includes('failed')||report.solution.status==='unsolved'?'failed':outcomes.includes('unknown')||!report.replayPassed?'unknown':'passed';
 fs.writeFileSync(path.join(out,reportName),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({draft:m.id,solution:report.solution,phases:report.phases,preparationSteps:report.preparationSteps,
  checks:report.checks.map(({rule,status,expanded,verdict,endpoint})=>({rule,status,expanded,verdict,endpoint})),
  stand:report.directPushStand,dockedStand:report.dockedStandReachability,control:report.firstRearBoundaryControl,overall:report.overall}));
 if(report.overall!=='passed')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
