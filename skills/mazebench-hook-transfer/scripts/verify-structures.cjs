const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
async function verify(repo,out,cap=300000,reportName='verification.json'){
 repo=path.resolve(repo);out=path.resolve(out);
 const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 const c=JSON.parse(fs.readFileSync(path.join(out,'contract.json'),'utf8'));
 assert(Number.isInteger(cap)&&cap>0);
 assert(path.basename(reportName)===reportName&&reportName.endsWith('.json'));
 const {getGame,getLevelState}=require(path.join(repo,'server/app'));
 global.window=global.window||{};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
 const game=getGame(m.id),data=getLevelState(game,game.worldMap.byPosition.get('level_AxA'));
 const e=window.MazeEngine.createEngine(data),solver=window.MazeSolver;
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i],x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const mechanismState=s=>({buttonsPressed:e.areOrangeButtonsPressed(s),
  liftRaised:c.liftCell?!!s.liftRaised[e.cellIndex(...c.liftCell)]:null,
  repairTerrain:c.repairCell?s.terrain[e.cellIndex(...c.repairCell)]:null});
 function classify(before,after,r,dx,dy){
  const p=before.find(a=>a.type==='player'),q=after.find(a=>a.type==='player');
  const moved=[...new Set(before.filter(a=>a.group&&!a.removed&&
   (a.x!==after[a.i].x||a.y!==after[a.i].y||a.z!==after[a.i].z||after[a.i].removed)).map(a=>a.group))];
  const primary=before.find(a=>a.group&&!a.removed&&a.x===p.x+dx&&a.y===p.y+dy&&a.z===p.z)?.group??null;
  const contact=[];
  for(const h of before.filter(a=>a.group===c.hookGroup&&!a.removed))for(const b of before.filter(a=>a.group===c.payloadGroup&&!a.removed))
   if(h.x+dx===b.x&&h.y+dy===b.y&&h.z===b.z)contact.push({hook:[h.x,h.y,h.z],payload:[b.x,b.y,b.z]});
  return {primary,moved,contact,rearTransfer:primary===c.hookGroup&&moved.includes(c.hookGroup)&&moved.includes(c.payloadGroup)&&
   contact.some(k=>(k.payload[0]-p.x)*dx+(k.payload[1]-p.y)*dy<0),
   floorFilled:r.moves.some(x=>x.fillsHole),lowered:r.liftToggles?.some(x=>!x.raised)??false,
   raised:r.liftToggles?.some(x=>x.raised)??false,heightChanged:p.z!==q.z,
   payloadPlate:!!c.plateCell&&after.some(a=>a.group===c.payloadGroup&&!a.removed&&a.x===c.plateCell[0]&&a.y===c.plateCell[1]&&a.z===0),
   payloadTopWalk:(p.x!==q.x||p.y!==q.y||p.z!==q.z)&&after.some(a=>a.group===c.payloadGroup&&!a.removed&&a.x===q.x&&a.y===q.y&&a.z+1===q.z)};
 }
 function rejected(rule,f,before){
  if(rule==='no_rear_transfer')return f.rearTransfer;
  if(rule==='no_floor_fill')return f.floorFilled;
  if(rule==='no_payload_plate')return f.payloadPlate;
  if(rule==='no_player_height_change')return f.heightChanged;
  if(rule==='no_lift_lower')return f.lowered;
  if(rule==='no_lift_raise')return f.raised;
  if(rule==='no_payload_top_walk')return f.payloadTopWalk;
  // These two authored scenarios make the load's destination an observable
  // transfer-complete marker. This is not a generic substitute for history.
  if(rule==='no_post_transfer_box_motion')return before.some(a=>a.group===c.payloadGroup&&!a.removed&&
   [a.x,a.y,a.z].every((n,i)=>n===c.transferDestination[i]))&&f.moved.length>0;
  throw new Error('Unsupported scenario check '+rule);
 }
 function wrapped(rule){return {...e,moveForSearch(s,dx,dy){const before=snap(s),r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
  const f=classify(before,snap(s),r,dx,dy);if(rejected(rule,f,before)){e.undoMove(s,r);return {moved:false};}return r;
 }};}
 assert.deepEqual(e.loadWarnings,[]);
 assert.equal(data.actors.filter(a=>a.type==='gem').length,1);assert.equal(data.actors.filter(a=>a.type==='player').length,1);
 const report={draft:m.id,scenario:m.scenario,initial:snap(e.initialState),initialMechanism:mechanismState(e.initialState),warnings:e.loadWarnings,
  solution:await solver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:cap}),trace:[],restrictions:[]};
 if(report.solution.status==='solved'){
  const s=e.cloneState(e.initialState);
  for(const [i,d]of [...report.solution.path].entries()){
   const before=snap(s),beforeMechanism=mechanismState(s),[dx,dy]=dirs[d],r=e.move(s,dx,dy);assert(r.moved);
   const after=snap(s),flags=classify(before,after,r,dx,dy);
   for(const group of [c.hookGroup,c.payloadGroup]){
    const old=before.filter(a=>a.group===group),now=after.filter(a=>a.group===group);
    assert(now.every(a=>!a.removed&&a.z===c.boxElevation));
    const shape=list=>list.map(a=>[a.x-list[0].x,a.y-list[0].y,a.z-list[0].z]);assert.deepEqual(shape(now),shape(old));
   }
   report.trace.push({step:i+1,d,before,after,beforeMechanism,afterMechanism:mechanismState(s),flags,
    liftToggles:r.liftToggles??[],fills:r.moves.filter(x=>x.fillsHole).map(x=>[x.fillHoleX,x.fillHoleY])});
  }
  assert(e.isSolved(s));assert(snap(s).some(a=>a.type==='player'&&!a.removed));report.replayPassed=true;
 }
 for(const rule of [...c.necessary,...c.permissive]){
  const result=await solver.solveWithAStar(wrapped(rule),{algorithm:'astar',maxExpandedStates:cap});
  if(result.status==='solved'){
   const replay=e.cloneState(e.initialState);
   for(const d of result.path){const before=snap(replay),[dx,dy]=dirs[d],r=e.move(replay,dx,dy);assert(r.moved);
    assert(!rejected(rule,classify(before,snap(replay),r,dx,dy),before),'Restricted solution violates '+rule);}
   assert(e.isSolved(replay));result.replayPassed=true;
  }
  const intended=c.necessary.includes(rule)?'unsolved':'solved';
  report.restrictions.push({rule,intended,...result,verdict:result.status===intended?'passed':
   ['solved','unsolved'].includes(result.status)?'failed':'unknown'});
 }
 const [x,y,elevation]=c.actuationStand;
 report.prerequisiteStand=await solver.findReachablePositions(wrapped(c.prerequisite),
  [{id:'actuation-stand',x,y,elevation}],{maxExpandedStates:cap});
 report.prerequisiteVerdict=report.prerequisiteStand.status==='exhausted'&&!report.prerequisiteStand.reachable.length?
  'passed':report.prerequisiteStand.reachable.length?'failed':'unknown';
 report.overall=!['solved','unsolved'].includes(report.solution.status)||report.restrictions.some(r=>r.verdict==='unknown')||report.prerequisiteVerdict==='unknown'?
  'unknown':report.replayPassed&&report.trace.some(s=>s.flags.rearTransfer)&&report.restrictions.every(r=>r.verdict==='passed')&&report.prerequisiteVerdict==='passed'?'passed':'failed';
 fs.writeFileSync(path.join(out,reportName),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({draft:m.id,solution:report.solution,events:report.trace.filter(s=>s.flags.rearTransfer||s.flags.floorFilled||s.flags.lowered||s.flags.raised||s.flags.payloadTopWalk)
  .map(s=>({step:s.step,d:s.d,flags:s.flags})),restrictions:report.restrictions,prerequisiteStand:report.prerequisiteStand,overall:report.overall}));
 return report;
}
if(require.main===module){const a=process.argv.slice(2),get=(k,f)=>a.includes(k)?a[a.indexOf(k)+1]:f;
 assert(get('--out'),'--out is required');verify(get('--repo',process.cwd()),get('--out'),Number(get('--cap',300000)),get('--report','verification.json'))
  .then(r=>{if(r.overall!=='passed')process.exitCode=1;})
  .catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={verify};
